const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
const config = require('../config.json');

const api = axios.create({
  baseURL: config.gitlabUrl,
  headers: { 'PRIVATE-TOKEN': config.token },
  timeout: 60000
});

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
    const p = spawn(cmd, args, { stdio: 'inherit', env, ...opts });

    p.on('error', reject);
    p.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} falhou, code=${code}`));
    });
  });
}

function axiosErrorToShortString(err) {
  const status = err?.response?.status;
  const statusText = err?.response?.statusText;
  const url = err?.config?.baseURL && err?.config?.url
    ? `${err.config.baseURL}${err.config.url}`
    : err?.config?.url;

  const apiMsg = err?.response?.data?.message;
  const msg = apiMsg || err?.message || 'Erro desconhecido';

  const statusPart = status ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}` : 'Sem status HTTP';
  const urlPart = url ? `URL: ${url}` : 'URL: desconhecida';

  return `${statusPart}, ${urlPart}, msg: ${msg}`;
}

async function getAllPages(url, params = {}) {
  const perPage = Number(config.perPage || 100);
  let page = 1;
  const out = [];

  while (true) {
    let res;
    try {
      res = await api.get(url, { params: { ...params, per_page: perPage, page } });
    } catch (e) {
      throw new Error(axiosErrorToShortString(e));
    }

    const data = res.data || [];
    out.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  return out;
}

function getRootGroupIdsFromConfig() {
  let roots = [];

  if (Array.isArray(config.groupIds) && config.groupIds.length) {
    roots = config.groupIds.map(String);
  } else if (config.groupId != null) {
    roots = [String(config.groupId)];
  } else {
    throw new Error('Nenhum groupId ou groupIds configurado no config.json');
  }

  return roots
    .flatMap(s => String(s).split(','))
    .map(s => s.trim())
    .filter(Boolean);
}

async function getAllGroupIds(rootGroupId) {
  const root = String(rootGroupId).trim();
  if (!root) return [];

  const all = [root];

  async function fetchSubgroups(parentId) {
    const subgroups = await getAllPages(`/groups/${parentId}/subgroups`);
    for (const sg of subgroups) {
      const id = String(sg.id);
      all.push(id);
      await fetchSubgroups(id);
    }
  }

  await fetchSubgroups(root);
  return all;
}

async function getAllProjectsFromGroups(groupIds) {
  const projects = [];

  for (const id of groupIds) {
    const list = await getAllPages(`/groups/${id}/projects`, { simple: true });
    for (const p of list) {
      projects.push({
        path_with_namespace: p.path_with_namespace,
        http_url_to_repo: p.http_url_to_repo,
        archived: !!p.archived
      });
    }
  }

  return projects;
}

function projectMirrorPath(baseDir, pathWithNamespace) {
  const parts = String(pathWithNamespace).split('/').filter(Boolean);
  const repoName = `${parts.pop()}.git`;
  return path.join(baseDir, ...parts, repoName);
}

async function backupOneProject(p, baseDir) {
  const repoUrl = p.http_url_to_repo;
  const target = projectMirrorPath(baseDir, p.path_with_namespace);

  ensureDir(path.dirname(target));

  if (fs.existsSync(target)) {
    console.log(`Atualizando mirror: ${p.path_with_namespace}`);
    await runCmd('git', ['-C', target, 'remote', 'update', '--prune']);
  } else {
    console.log(`Clonando mirror: ${p.path_with_namespace}`);
    await runCmd('git', ['clone', '--mirror', repoUrl, target]);
  }

  if (config.includeWiki) {
    const wikiUrl = repoUrl.replace(/\.git$/, '.wiki.git');
    const wikiTarget = target.replace(/\.git$/, '.wiki.git');

    if (fs.existsSync(wikiTarget)) {
      console.log(`Atualizando wiki: ${p.path_with_namespace}`);
      await runCmd('git', ['-C', wikiTarget, 'remote', 'update', '--prune']);
    } else {
      console.log(`Clonando wiki: ${p.path_with_namespace}`);
      await runCmd('git', ['clone', '--mirror', wikiUrl, wikiTarget]);
    }
  }

  if (config.includeLfs) {
    console.log(`LFS fetch: ${p.path_with_namespace}`);
    await runCmd('git', ['-C', target, 'lfs', 'fetch', '--all']);
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  const queue = [...items];
  const n = Math.max(1, Number(concurrency || 1));

  const workers = Array.from({ length: n }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });

  await Promise.all(workers);
}

async function backup(destDirOverride) {
  const baseDir = path.resolve(destDirOverride || config.backupDir || 'gitlab-backup-mirror');
  const concurrency = Number(config.concurrency || 2);

  ensureDir(baseDir);

  const rootIds = getRootGroupIdsFromConfig();
  console.log('Root IDs:', rootIds.join(', '));

  console.log('Buscando grupos recursivamente...');
  const allGroupIds = [];
  for (const rootId of rootIds) {
    const ids = await getAllGroupIds(rootId);
    allGroupIds.push(...ids);
  }

  const groupIds = [...new Set(allGroupIds.map(String))];
  console.log(`Total de grupos encontrados: ${groupIds.length}`);

  console.log('Buscando projetos dos grupos...');
  let projects = await getAllProjectsFromGroups(groupIds);

  if (!config.includeArchived) {
    projects = projects.filter(p => !p.archived);
  }

  console.log(`Total de projetos: ${projects.length}`);
  console.log(`Destino: ${baseDir}`);

  const errors = [];
  await runWithConcurrency(projects, concurrency, async p => {
    try {
      await backupOneProject(p, baseDir);
    } catch (e) {
      console.error(`Falha no projeto ${p.path_with_namespace}: ${e.message}`);
      errors.push({ project: p.path_with_namespace, error: e.message });
    }
  });

  if (errors.length) {
    const errFile = path.join(baseDir, 'backup-errors.json');
    fs.writeFileSync(errFile, JSON.stringify(errors, null, 2), 'utf-8');
    console.log(`Backup terminou com erros. Relatório: ${errFile}`);
  } else {
    console.log('Backup finalizado sem erros.');
  }
}

module.exports = { backup };

const axios = require('axios');
const config = require('../config.json');

const api = axios.create({
  baseURL: config.gitlabUrl,
  headers: { 'PRIVATE-TOKEN': config.token }
});

async function getAllGroupIds(groupId) {
  const allGroupIds = [groupId];

  async function fetchSubgroups(parentId) {
    const res = await api.get(`/groups/${parentId}/subgroups`, {
      params: { per_page: 100 }
    });

    for (const subgroup of res.data) {
      allGroupIds.push(subgroup.id);
      await fetchSubgroups(subgroup.id);
    }
  }

  await fetchSubgroups(groupId);
  return allGroupIds;
}

async function getAllProjectsFromGroups(groupIds) {
  const allProjects = [];

  for (const id of groupIds) {
    const res = await api.get(`/groups/${id}/projects`, {
      params: { per_page: 100 }
    });
    allProjects.push(...res.data.map(p => ({ id: p.id, name: p.name })));
  }

  return allProjects;
}

async function branchExists(projectId, branchName) {
  try {
    await api.get(`/projects/${projectId}/repository/branches/${encodeURIComponent(branchName)}`);
    return true;
  } catch (err) {
    return false;
  }
}

async function createBranch(projectId, newBranchName, refBranch) {
  try {
    await api.post(`/projects/${projectId}/repository/branches`, {
      branch: newBranchName,
      ref: refBranch
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function renameBranch(origem, destino) {
  console.log(`🔁 Renomeando branches de "${origem}" para "${destino}"...`);

  try {
    const groupIds = await getAllGroupIds(config.groupId);
    const projetos = await getAllProjectsFromGroups(groupIds);

    for (const projeto of projetos) {
      const exists = await branchExists(projeto.id, origem);

      if (!exists) {
        console.log(`⚠️  [${projeto.name}] Branch "${origem}" não encontrada.`);
        continue;
      }

      const created = await createBranch(projeto.id, destino, origem);

      if (created) {
        console.log(`✅ [${projeto.name}] Criada "${destino}" com base em "${origem}".`);
      } else {
        console.log(`❌ [${projeto.name}] Falha ao criar branch "${destino}".`);
      }
    }

  } catch (err) {
    console.error('❌ Erro geral ao renomear branches:', err.message);
  }
}

module.exports = { renameBranch };

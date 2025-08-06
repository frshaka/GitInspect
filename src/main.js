const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dayjs = require('dayjs');
const ExcelJS = require('exceljs');
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

async function getBranches(projectId) {
  const res = await api.get(`/projects/${projectId}/repository/branches`, {
    params: { per_page: 100 }
  });
  return res.data.map(branch => branch.name);
}

async function getCommits(projectId, branch) {
  const res = await api.get(`/projects/${projectId}/repository/commits`, {
    params: {
      per_page: 50,
      ref_name: branch
    }
  });
  return res.data;
}

async function gerarPlanilha(dados, outputPath) {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Commits');

  sheet.columns = [
    { header: 'Usuário', key: 'Usuario', width: 30 },
    { header: 'Projeto', key: 'Projeto', width: 40 },
    { header: 'Data', key: 'Data', width: 20 }
  ];

  // 🎨 Estilo do cabeçalho
  sheet.getRow(1).eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB7D6F8' } // Azul claro
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center' };
  });

  const hoje = dayjs();
  const estiloVermelho = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC7CE' } // vermelho claro
  };
  const estiloVerde = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9EAD3' } // verde claro
  };

  dados.forEach(item => {
    const row = sheet.addRow(item);
    const isSemCommit = item.Data === 'SEM COMMIT';

    if (isSemCommit) {
      row.eachCell(cell => cell.fill = estiloVermelho);
    } else {
      const dataCommit = dayjs(item.Data, 'DD/MM/YYYY');
      if (dataCommit.isBefore(hoje.subtract(7, 'day'))) {
        row.eachCell(cell => cell.fill = estiloVermelho);
      } else {
        row.eachCell(cell => cell.fill = estiloVerde);
      }

      // Formatar a data para dd/MM/yyyy
      row.getCell('Data').value = dayjs(dataCommit).format('DD/MM/YYYY');
    }
  });

  const filename = `relatorio_commits_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
  const filepath = path.join(outputPath, filename);

  await workbook.xlsx.writeFile(filepath);
  console.log(`✅ Planilha gerada com sucesso: ${filepath}`);
}

async function run() {
  try {
    console.log('🔍 Buscando todos os grupos recursivamente...');
    const groupIds = await getAllGroupIds(config.groupId);

    console.log('📦 Buscando todos os projetos de todos os grupos...');
    const projetos = await getAllProjectsFromGroups(groupIds);

    const ultimoCommitPorUsuario = new Map();

    for (const projeto of projetos) {
      console.log(`📁 Repositório: ${projeto.name}`);
      const branches = await getBranches(projeto.id);

      for (const branch of branches) {
        console.log(`   🔄 Branch: ${branch}`);
        const commits = await getCommits(projeto.id, branch);

        for (const commit of commits) {
          const autorEmail = commit.author_email?.toLowerCase() || '';
          const usuarioMatch = config.users.find(user =>
            autorEmail === user.toLowerCase()
          );
          if (!usuarioMatch) continue;

          const commitData = dayjs(commit.committed_date);
          const commitAtual = ultimoCommitPorUsuario.get(usuarioMatch);

          if (!commitAtual || commitData.isAfter(commitAtual.Data)) {
            ultimoCommitPorUsuario.set(usuarioMatch, {
              Usuario: commit.author_name,
              Projeto: projeto.name,
              Data: commitData
            });
          }
        }
      }
    }

    const dados = config.users.map(email => {
      const commit = ultimoCommitPorUsuario.get(email);
      if (commit) {
        return {
          Usuario: commit.Usuario,
          Projeto: commit.Projeto,
          Data: commit.Data.format('DD/MM/YYYY')
        };
      } else {
        return {
          Usuario: email,
          Projeto: 'SEM COMMIT',
          Data: 'SEM COMMIT'
        };
      }
    });

    await gerarPlanilha(dados, config.outputPath);

  } catch (error) {
    console.error('❌ Ocorreu um erro:', error.message);
  }
}

module.exports = { run };

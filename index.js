#!/usr/bin/env node
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const configPath = path.join(__dirname, 'config.json');
const command = process.argv[2];

switch (command) {
  case 'config':
    openConfig();
    break;

  case 'rename': {
    const { renameBranch } = require('./src/rename');
    const origem = process.argv[3];
    const destino = process.argv[4];

    if (!origem || !destino) {
      console.error('Uso correto: gitinspect rename <branchOrigem> <branchDestino>');
      process.exit(1);
    }

    renameBranch(origem, destino);
    break;
  }

  case 'backup': {
    const { backup } = require('./src/backup');
    const destinoBackup = process.argv[3]; // opcional
    backup(destinoBackup);
    break;
  }

  case 'run':
  default: {
    const { run } = require('./src/main');
    run();
    break;
  }
}

function openConfig() {
  const platform = os.platform();
  let opener;

  if (platform === 'win32') opener = `start "" "${configPath}"`;
  else if (platform === 'darwin') opener = `open "${configPath}"`;
  else opener = `xdg-open "${configPath}"`;

  exec(opener, err => {
    if (err) console.error('Não foi possível abrir o arquivo config.json:', err.message);
    else console.log('Arquivo config.json aberto com sucesso.');
  });
}

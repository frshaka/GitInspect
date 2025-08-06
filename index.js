#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const mainScript = require('./src/main'); // mover o código de geração aqui
const configPath = path.join(__dirname, 'config.json');

const command = process.argv[2];

switch (command) {
  case 'config':
    openConfig();
    break;
  case 'run':
  default:
    mainScript.run();
    break;
}

function openConfig() {
  const platform = os.platform();

  let opener;
  if (platform === 'win32') {
    opener = `start "" "${configPath}"`;
  } else if (platform === 'darwin') {
    opener = `open "${configPath}"`;
  } else {
    opener = `xdg-open "${configPath}"`;
  }

  exec(opener, (err) => {
    if (err) {
      console.error('❌ Não foi possível abrir o arquivo config.json:', err.message);
    } else {
      console.log('📝 Arquivo config.json aberto com sucesso.');
    }
  });
}

# 🕵️ GitInspect

**GitInspect** é uma ferramenta CLI em Node.js para gerenciar repositórios GitLab em massa. Oferece três funcionalidades principais:

1. **Relatórios de commits**: gera planilhas Excel com atividade de usuários específicos
2. **Renomear branches**: cria branches com novo nome em todos os projetos do grupo
3. **Backup de repositórios**: clona mirrors de todos os repositórios para backup local

---

## 📦 Funcionalidades

### Relatório de Commits
* Consulta todos os repositórios de um grupo GitLab, incluindo subgrupos recursivamente (múltiplos níveis).
* Filtra commits por e-mail de usuários definidos no `config.json`.
* Busca em **todas as branches** dos repositórios.
* Gera um relatório `.xlsx` com:
  * Nome do autor
  * Projeto onde comitou
  * Data do último commit
* Exibe **"SEM COMMIT"** para usuários sem commits recentes.
* Aplica formatação visual:
  * 🔴 Vermelho: sem commit ou commit com mais de 7 dias
  * ✅ Verde: commit nos últimos 7 dias
  * 🔵 Azul no cabeçalho
* Formato de data brasileiro: `dd/MM/yyyy`
* Permite configurar o caminho onde o arquivo será salvo
* Substitui automaticamente arquivos existentes com o mesmo nome

### Renomear Branches em Massa
* Cria nova branch com nome diferente em todos os projetos do grupo
* Baseada em branch existente (não deleta a original)
* Processa subgrupos recursivamente

### Backup de Repositórios
* Clone mirror de todos os repositórios do grupo
* Suporte a múltiplos grupos raiz (`groupIds` no config)
* Atualização incremental (não reclona se já existe)
* Backup paralelo com controle de concorrência
* Opções: incluir wikis, LFS, repositórios arquivados
* Relatório de erros em JSON

### Utilitários
* Comando interativo para abrir o arquivo de configuração via terminal

---

## ⚙️ Requisitos

* Node.js 14+ (caso execute o projeto direto)
* Git (para funcionalidade de backup)
* GitLab com token de acesso pessoal:
  * `read_api` e `read_repository` (para relatórios e rename)
  * `write_repository` (para rename de branches)
* Permissões de leitura no grupo/repositórios desejados

---

## 🔧 Configuração

Antes de executar, edite o arquivo `config.json`:

```json
{
  "gitlabUrl": "https://gitlab.sankhya.com.br/api/v4",
  "token": "SEU_TOKEN_GITLAB",
  "users": ["huguinho@empresa.com.br", "zezinho@empresa.com.br"],
  "groupId": "1234",
  "groupIds": ["1234", "5678"],
  "outputPath": "./relatorios",
  "backupDir": "./gitlab-backup-mirror",
  "concurrency": 2,
  "perPage": 100,
  "includeArchived": false,
  "includeWiki": false,
  "includeLfs": false
}
```

### Campos obrigatórios

| Campo        | Descrição                                                             |
| ------------ | --------------------------------------------------------------------- |
| `gitlabUrl`  | URL da API do seu GitLab (self-hosted ou `gitlab.com`)                |
| `token`      | Token pessoal de acesso à API do GitLab                               |

### Campos para relatório de commits

| Campo        | Descrição                                                             |
| ------------ | --------------------------------------------------------------------- |
| `users`      | Lista de e-mails dos usuários que você deseja monitorar               |
| `groupId`    | ID do grupo onde estão os projetos                                    |
| `outputPath` | Caminho onde a planilha será salva (`"."` para salvar na pasta atual) |

### Campos para backup

| Campo             | Descrição                                                      | Padrão                    |
| ----------------- | -------------------------------------------------------------- | ------------------------- |
| `groupId`         | ID do grupo raiz (usado se `groupIds` não estiver definido)    | -                         |
| `groupIds`        | Array de IDs de grupos raiz para backup (sobrescreve `groupId`)| -                         |
| `backupDir`       | Diretório onde os mirrors serão salvos                         | `./gitlab-backup-mirror`  |
| `concurrency`     | Número de clones/atualizações simultâneas                      | `2`                       |
| `perPage`         | Itens por página na API                                        | `100`                     |
| `includeArchived` | Incluir repositórios arquivados no backup                      | `false`                   |
| `includeWiki`     | Fazer backup das wikis dos projetos                            | `false`                   |
| `includeLfs`      | Fazer fetch de arquivos LFS                                    | `false`                   |

---

## 🚀 Como usar

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/gitinspect.git
cd gitinspect
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Comandos disponíveis

#### Gerar relatório de commits
```bash
gitinspect run
# ou
node index.js run
```

#### Renomear branches em massa
```bash
gitinspect rename <branchOrigem> <branchDestino>
# Exemplo:
gitinspect rename develop main
```

#### Fazer backup de repositórios
```bash
gitinspect backup [diretorioDestino]
# Exemplos:
gitinspect backup
gitinspect backup ./meu-backup
```

#### Abrir arquivo de configuração
```bash
gitinspect config
```

> Ao final da execução do relatório, será gerado um arquivo Excel com os commits no diretório definido em `outputPath`.

---

## 💻 Executável (.exe) para Windows

Você pode empacotar o projeto com o [pkg](https://github.com/vercel/pkg):

```bash
npm install -g pkg
pkg . --targets node18-win-x64 --output gitinspect.exe
```

> Após gerar o `.exe`, você pode copiá-lo para qualquer máquina Windows e executar diretamente com:

```bash
gitinspect.exe
```

Certifique-se de que o arquivo `config.json` esteja no mesmo diretório do `.exe` (ou embutido, caso configure isso via `pkg`).

---

## 📊 Exemplo de planilha gerada

| Usuário                    | Projeto    | Data       |
| ---------------------------| ---------- | ---------- |
| huguinho@empresa.com.br    | projeto-x  | 06/08/2025 |
| zezinho@empresa.com.br     | SEM COMMIT | SEM COMMIT |

> Linhas em vermelho indicam ausência de commit ou inatividade (mais de 7 dias).<br>
> Linhas verdes indicam atividade recente.

---

## 🤝 Contribuições

Contribuições são muito bem-vindas!

---

## 👨‍💻 Autor

Desenvolvido por **Felipe Rosa**

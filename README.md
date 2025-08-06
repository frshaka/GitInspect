# 🕵️ GitInspect

**GitInspect** é uma ferramenta em linha de comando (CLI) feita em Node.js que consulta a API do GitLab para gerar relatórios com os commits realizados por usuários específicos em repositórios de um grupo. O resultado é exportado automaticamente em formato Excel (.xlsx), com destaque visual para ausência de commits ou inatividade.

---

## 📦 Funcionalidades

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
* Comando interativo para abrir o arquivo de configuração via terminal

---

## ⚙️ Requisitos

* Node.js (caso execute o projeto direto)
* GitLab com token de acesso pessoal (`read_api`, `read_repository`)
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
  "outputPath": "./relatorios"
}
```

| Campo        | Descrição                                                             |
| ------------ | --------------------------------------------------------------------- |
| `gitlabUrl`  | URL da API do seu GitLab (self-hosted ou `gitlab.com`)                |
| `token`      | Token pessoal de acesso à API do GitLab                               |
| `users`      | Lista de e-mails dos usuários que você deseja monitorar               |
| `groupId`    | ID do grupo onde estão os projetos                                    |
| `outputPath` | Caminho onde a planilha será salva (`"."` para salvar na pasta atual) |

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

### 3. Executar geração da planilha

```bash
gitinspect run
# ou
node index.js run
```

### 4. Abrir o arquivo de configuração (`config.json`)

```bash
gitinspect config
```

> Ao final da execução, será gerado um arquivo Excel com os commits no diretório definido em `outputPath`.

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

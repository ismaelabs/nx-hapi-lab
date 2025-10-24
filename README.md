## 🤖 Dependencias
* [node](https://www.nodejs.tech/pt-br)
* [nx](https://nx.dev/)

## ⚗️ Laboratório Nx + Hapi
### 🎯 Objetivo
#### Mostrar, na prática, como o Nx:
* Organiza múltiplas aplicações Node/Hapi no mesmo monorepo.
* Reaproveita código via libs internas.
* Usa cache inteligente e builds incrementais.
* Reduz tempo de pipeline no GitHub Actions.

## 🏗️ Estrutura do Projeto

```bash
nx-hapi-lab/
├── apps/
│   ├── api-users/        # API 1 - Hapi
│   └── api-products/     # API 2 - Hapi
├── libs/
│   ├── shared/           # Lib compartilhada (ex: utils, log, validators)
│   └── product/          # Lib somente utilizada na api-products
├── nx.json
├── project.json
├── tsconfig.base.json
├── package.json
└── .github/workflows/ci.yml
```

## 🚀 Passo a passo
### 1️⃣ Configuração
```bash
npm add --global nx # Adiciona o Nx globalmente
nx init # Cria as configurações inicias do Nx
```

### 2️⃣ Criar o workspace
```bash
npx create-nx-workspace@latest nx-hapi-lab --ci=github
# Escolhas:
✔ Which stack do you want to use? · node
✔ What framework should be used? · none
✔ Application name · api-users
✔ Would you like to generate a Dockerfile? [https://docs.docker.com/] · Yes
✔ Which unit test runner would you like to use? · jest
✔ Would you like to use ESLint? · Yes
✔ Would you like to use Prettier for code formatting? · Yes

cd nx-hapi-lab 
```

### 3️⃣ Criar aplicações Hapi
```bash
npx nx g @nx/node:application apps/api-products
npm install @hapi/hapi
```

### 4️⃣ Configurar o `main.ts` de cada app
```ts
import * as Hapi from '@hapi/hapi';
import { logRequest } from '@nx-hapi-lab/shared';

async function start() {
  const server = Hapi.server({ port: 3000 });
  
  server.route({
    method: 'GET',
    path: '/',
    handler: () => logRequest({ users: ['Alice', 'Bob'] }),
  });

  await server.start();
  console.log('🚀 API Users running on %s', 'http://localhost:3000');
}

start();

// E algo similar em api-products, mudando a rota ou porta.
```

### 5️⃣ Criar lib compartilhada
```bash
npx nx g @nx/node:library libs/shared
```
```ts
// libs/shared/src/lib/shared.ts
export function logRequest(data: unknown) {
  return { success: true, data };
}
```

### 6️⃣ Rodar aplicações
```bash
npx nx build shared # build inicial
npx nx serve api-users
npx nx serve api-products
```

### 7️⃣ Criar testes basicos
```ts
// libs/shared/src/lib/shared.spec.ts
import { logRequest } from './shared';

describe('shared', () => {
  it('should work', () => {
    const data = {test: 'alguma coisa'}
    expect(logRequest(data)).toEqual({ success: true, data });
  });
});
```

```ts
// apps/api-users-e2e/src/api-users/api-users.spec.ts
import { spawn } from 'child_process';
import { join } from 'path';
import axios from 'axios';

describe('CLI tests', () => {
  it('should print a message', async() => {
    const cliPath = join(process.cwd(), 'apps/api-users/dist');
    const processServer = spawn('node', [cliPath]);
    await new Promise(res => setTimeout(res, 1000)); // aguarda subir
    const response = await axios.get('http://localhost:3000');
    expect(response.status).toBe(200);
    processServer.kill()
  });
});

```

### 8️⃣ Monstrar cache inteligente
```bash
npx nx test shared
npx nx e2e api-users-e2e
# Depois, sem alterar nada, rode de novo
# OBS: somente para testes que não sejam e2e
```

```bash
git init 
git add --all
git commit -m 'feat: initial project structure'
```

```bash
# Depois, altere algo em libs/shared e rode novamente:
npx nx affected:test
```

### 9️⃣ Dockerfile
**OBS habilitar bundle dentro do package.json dos apps**</br>
O código da lib shared é incorporado ao main.js da aplicação no momento do nx build. O arquivo main.js se torna um binário autossuficiente que não precisa de symlinks ou de configurações complexas de module-resolution em produção.

```bash
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN npx nx build api-products --prod

FROM node:20-alpine
WORKDIR /app
LABEL maintainer="Ismael Alves <cearaismael1997@gmail.com>"
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/apps/api-products/dist ./

RUN addgroup -S app && adduser -S -G app app 

USER app

EXPOSE 3000

CMD ["node", "main.js"]
```

### 🔟 Pipeline do Github Actions
```yml
name: CI

on:
  push:
    branches:
      - master
  pull_request:

permissions:
  actions: read
  contents: read
  id-token: write

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        name: 📦 Checkout Repository
        with:
          filter: tree:0
          fetch-depth: 0

      - uses: actions/setup-node@v4
        name: 🔨 Setup Node.js
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci --legacy-peer-deps

      - name: 🔍 Get Affected Applications
        id: affected-apps
        run: |
          AFFECTED_APPS=$(npx nx show projects --affected --type=app --base=origin/master~1 --head=origin/master | grep -vE 'e2e' | sed 's/@nx-hapi-lab\///g' | xargs)
          echo "AFFECTED_APPS=$AFFECTED_APPS" >> $GITHUB_OUTPUT
          echo "Found affected apps:"
          echo "$AFFECTED_APPS"

      - name: 🧪 Run Tests for Affected Apps
        if: steps.affected-apps.outputs.AFFECTED_APPS != ''
        run: npx nx affected --base=origin/master~1 --head=origin/master -t lint test build typecheck --parallel --configuration=ci

      - name: 🚀 Deploy dos apps afetados
        if: steps.affected-apps.outputs.AFFECTED_APPS != ''
        run: |
          for app in ${{ steps.affected-apps.outputs.AFFECTED_APPS }}; do
            echo "🚀 Fazendo deploy do app: $app"
            docker build -f apps/$app/Dockerfile -t $app .
          done
```

### 🔷 Extra
```bash
# Remoção de Apps ou Libs sempre olhe name dentro do package.json do que você esta removendo

nx g @nx/workspace:remove @nx-hapi-lab/apps/api-products
nx g @nx/workspace:remove @nx-hapi-lab/libs/shared
```

```bash
# Mostrar grafico em arvore com as dependencias do projeto
nx graph
```

```bash
# Lint
nx lint api-users --fix
nx affected -t lint --fix
```

```bash
# Mostra detalhes de cache e dependencias do projeto
 nx show project api-products
```
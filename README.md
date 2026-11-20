# InAndOut

Plataforma de controle do fluxo de saída de alunos da sala de aula (ex.: ida ao banheiro) e de métricas de permanência, voltada à rotina escolar do ensino médio.

Cada sala possui um **Terminal de Sala** público (tablet/computador), bloqueado pelo professor via PIN de 4 dígitos, onde o aluno solicita saída e retorno pelo seu **RA**. A **Coordenação** acompanha tudo em tempo real, recebe alertas escalados e exporta relatórios.

## Principais funcionalidades

- **Concorrência única**: apenas um aluno por vez fora da sala, com **fila de espera FIFO** para os demais.
- **Tempo real** via WebSocket (Socket.io) entre terminais de sala e painel da coordenação.
- **Escalonamento de alertas** para a Coordenação quando limites de permanência são excedidos.
- **Privacidade (LGPD)**: o terminal público exibe apenas o _Nome Público_ (ex.: "Lucas S.").
- **Multissala**: terminais isolados por sala, com sessões de aula (professor, turma, disciplina).
- **Cadastros da Coordenação**: salas, turmas (código + ano letivo), catálogo de alunos.
- **Analytics e exportação** em PDF (`@react-pdf/renderer`) e Excel (`exceljs`).

## Tecnologias

| Camada         | Stack                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Frontend       | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), React Router 7, TanStack Table, Recharts |
| Backend        | Node.js 22, Fastify 5, Socket.io, TypeScript                                                             |
| Banco de dados | PostgreSQL 16 + Prisma ORM                                                                               |
| Qualidade      | Biome (lint/format), Vitest + Testing Library, Husky + lint-staged, Knip                                 |
| Infra          | Docker / Docker Compose, pnpm                                                                            |

### Arquitetura

Clean Architecture/SOLID com injeção de dependência manual (ver [ADR 0001](docs/adr/0001-architecture-and-stack.md)):

```
src/
├── shared/   # DTOs, enums e eventos de domínio (sem dependências de infraestrutura)
├── server/   # domain · application (casos de uso) · infrastructure (Prisma / in-memory) · presentation (Fastify + Socket.io) · main
└── client/   # SPA React (pages, components, hooks, services)
prisma/       # schema, migrations e seed
tests/        # testes automatizados
```

Os testes rodam sem banco ou rede, usando adaptadores in-memory e `app.inject()`.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 9 (`corepack enable` ou `npm i -g pnpm`)
- [Docker](https://www.docker.com/) com Docker Compose (para o PostgreSQL)

## Instalação rápida

```bash
# 1. Clonar e instalar dependências
git clone https://github.com/Allaaxx/InAndOut.git
cd InAndOut
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Subir o PostgreSQL (porta 5433)
pnpm db:up

# 4. Criar tabelas e popular dados de exemplo
pnpm db:migrate
pnpm db:seed

# 5. Iniciar backend e frontend (em dois terminais)
pnpm dev:server   # API em http://localhost:3000
pnpm dev:client   # SPA em http://localhost:5173 (porta padrão do Vite)
```

### Usuários de exemplo (seed)

| Perfil      | E-mail                       | Senha      |
| ----------- | ---------------------------- | ---------- |
| Professor   | `prof@linsdorego.edu.br`     | `senha123` |
| Professora  | `fernanda@linsdorego.edu.br` | `senha123` |
| Coordenação | `coord@linsdorego.edu.br`    | `coord123` |
| Admin       | `admin@linsdorego.edu.br`    | `admin123` |

> [!WARNING]
> Credenciais apenas para desenvolvimento. Não use em produção.

## Variáveis de ambiente

Definidas em `.env` (modelo em [.env.example](.env.example)):

| Variável                                              | Padrão                                         | Descrição                      |
| ----------------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| `PORT` / `HOST`                                       | `3000` / `0.0.0.0`                             | Endereço da API                |
| `NODE_ENV`                                            | `development`                                  | Ambiente                       |
| `VITE_API_URL`                                        | `http://localhost:3000`                        | URL da API usada pelo frontend |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `inandout_user` / `inandout_pass` / `inandout` | Credenciais do banco           |
| `POSTGRES_PORT`                                       | `5433`                                         | Porta do PostgreSQL no host    |
| `DATABASE_URL`                                        | ver `.env.example`                             | Conexão usada pelo Prisma      |

## Rodando com Docker (app completo)

Sobe PostgreSQL e a aplicação (API + build do frontend) em containers:

```bash
docker compose --profile app up --build
```

A aplicação fica em `http://localhost:3000`. Rode as migrations e o seed (`pnpm db:migrate`, `pnpm db:seed`) apontando para o banco em `localhost:5433` na primeira execução.

## Scripts úteis

| Comando                                              | Descrição                                          |
| ---------------------------------------------------- | -------------------------------------------------- |
| `pnpm dev:server` / `pnpm dev:client`                | Desenvolvimento (API com watch / Vite)             |
| `pnpm build`                                         | Typecheck + build do frontend                      |
| `pnpm test` / `pnpm test:watch`                      | Testes (Vitest)                                    |
| `pnpm typecheck`                                     | Verificação de tipos                               |
| `pnpm lint:check` / `pnpm check`                     | Lint e formatação com Biome (verificar / corrigir) |
| `pnpm audit:deps`                                    | Detecta código e dependências não usados (Knip)    |
| `pnpm db:up` / `pnpm db:down`                        | Liga/desliga o PostgreSQL                          |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:reset` | Migrations, seed e reset do banco                  |
| `pnpm db:studio`                                     | Interface visual do Prisma                         |

## Documentação

- [Documentação da API REST](docs/api.md)
- [Glossário do domínio](GLOSSARY.md)
- Decisões de arquitetura ([ADRs](docs/adr/)):
  - [0001 – Arquitetura e stack](docs/adr/0001-architecture-and-stack.md)
  - [0002 – Escalonamento e transição de sessão](docs/adr/0002-escalation-and-session-transition.md)
  - [0003 – Privacidade e resolução de coordenação](docs/adr/0003-privacy-and-coordination-resolution.md)
  - [0004 – Stack frontend e shadcn](docs/adr/0004-frontend-stack-and-shadcn-components.md)
  - [0005 – Monorepo e pipeline de qualidade](docs/adr/0005-monorepo-workspace-and-quality-pipeline.md)
  - [0006 – Shells de navegação e terminal kiosk](docs/adr/0006-navigation-shells-and-terminal-kiosk.md)
  - [0007 – Exportação de analytics (PDF/Excel)](docs/adr/0007-analytics-export-react-pdf-and-exceljs.md)
  - [0008 – Isolamento multissala de terminais](docs/adr/0008-multi-room-terminal-isolation.md)
  - [0009 – Turmas e catálogo de alunos](docs/adr/0009-class-groups-and-student-catalog.md)

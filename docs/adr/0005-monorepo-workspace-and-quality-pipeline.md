# ADR 0005: Pipeline Automatizada de Qualidade, Guardrails e Arquitetura Unificada

## Contexto

À medida que o ecossistema InAndOut evolui para atender múltiplos pontos de interação (terminais de sala de aula e painel central da coordenação), tornou-se essencial estabelecer guardrails automatizados contra regressões de tipos, inconsistências de estilo, dependências órfãs e falhas silenciosas de compilação.

Anteriormente, o desenvolvimento carecia de validações automáticas pré-commit e de um pipeline formal de integração contínua (CI), sobrecarregando a revisão de código com apontamentos de formatação e tipagem em detrimento da análise arquitetural e da integridade do domínio escolar. Além disso, uma decomposição prematura em monorepo com pacotes fictícios em `apps/*` introduzia complexidade e redundância, visto que a aplicação já está organicamente organizada e coesa em `src/` (`src/client`, `src/server`, `src/shared`).

## Decisão

Adotamos uma arquitetura unificada e coesa com tooling nativo de alta performance e automação de qualidade em múltiplos níveis:

1. **Repositório Unificado e Coeso (`src/`)**:
   - Organização clara de responsabilidades:
     - `src/server/`: Backend Node.js / Fastify / Socket.io / Prisma.
     - `src/client/`: SPA React 19 / Vite / Tailwind CSS v3 / Radix UI / TanStack Table.
     - `src/shared/`: DTOs, Enums canônicos e formatadores compartilhados.
   - Eliminação de estruturas artificiais (`apps/*`), mantendo um único `package.json` transparente e determinístico com `pnpm`.
   - Gerenciamento de scripts de build via `allowBuilds` no `pnpm-workspace.yaml`.

2. **Linter e Formatter Unificado (`Biome`)**:
   - Adoção do Biome como engine unificado de linting e formatação de código baseado em Rust, substituindo a combinação tradicional ESLint + Prettier.
   - Execução em sub-segundo tanto localmente sobre arquivos modificados quanto globalmente no pipeline de CI (~88ms para 180+ arquivos).

3. **Auditoria de Código Morto e Dependências Órfãs (`Knip`)**:
   - Integração do Knip para varredura estática de grafos de imports em `src/`, identificando dependências não utilizadas, módulos órfãos e exportações mortas.
   - Execução no pipeline de CI com saída 100% limpa (0 issues).

4. **Guardrails Locais de Pré-commit (`Husky` + `lint-staged`)**:
   - Instalação de hooks de ciclo de vida git que interceptam tentativas de commit.
   - Formatação e linting in-place exclusivamente sobre arquivos em staging, validação de tipos TypeScript (`tsc --noEmit`) em menos de 2 segundos.

5. **Pipeline de Integração Contínua (`GitHub Actions`)**:
   - Execução automática em pushes para `main` e em Pull Requests.
   - Restauração de cache do pnpm e instalação com `--frozen-lockfile`.
   - Execução das etapas de static verification (Biome, TypeScript, Knip), suíte completa de testes automatizados (Vitest) e build smoke test garantindo a emissão de artefatos válidos em `dist/`.

## Consequências e Trade-offs

### Benefícios

- **Simplicidade e Clareza (KISS / YAGNI)**: Todo o código de desenvolvimento vive diretamente em `src/`, eliminando stubs fictícios ou duplicados.
- **Velocidade de Feedback**: A suíte de tooling nativo (Biome/pnpm) permite feedback sub-segundo para desenvolvedores e agentes autônomos.
- **Foco em Domínio**: Revisões de código deixam de focar em sintaxe e estilo, priorizando regras de negócio e aderência às especificações.
- **Build Smoke Test**: Nenhum código que quebre a geração de distribuição de produção (`dist/index.html` e assets) pode ser integrado na branch principal.

### Trade-offs e Mitigações

- Caso no futuro o backend e o frontend precisem de ciclos de deploy totalmente desacoplados ou repositórios autônomos, a separação já existente em `src/client` e `src/server` facilitará qualquer extração sem retrabalho no domínio.

# ADR 0005: Monorepo Workspace, Tooling de Qualidade e Pipeline de CI

## Contexto

À medida que o ecossistema InAndOut evolui para atender múltiplos pontos de interação (terminais de sala de aula e painel central da coordenação), tornou-se essencial estabelecer limites arquiteturais claros entre as aplicações de backend (`apps/server`) e frontend web (`apps/client`), além de prover guardrails automatizados contra regressões de tipos, inconsistências de estilo e falhas silenciosas de compilação.

Anteriormente, o desenvolvimento carecia de validações automáticas pré-commit e de um pipeline formal de integração contínua (CI), sobrecarregando a revisão de código com apontamentos de formatação e tipagem em detrimento da análise arquitetural e da integridade do domínio escolar.

## Decisão

Adotamos uma infraestrutura corporativa baseada em monorepo, tooling nativo de alta performance e automação de qualidade em múltiplos níveis:

1. **Topologia Monorepo com `pnpm` Workspaces**:
   - Centralização e orquestração de pacotes sob `pnpm-workspace.yaml` com mapeamento `apps/*`.
   - Isolamento estrito de dependências por hardlinks e links simbólicos através da virtual store do pnpm, eliminando dependências fantasmas (*phantom dependencies*) causadas por hoisting acidental.
   - Divisão estrutural em aplicações dedicadas:
     - `@inandout/server` (`apps/server`): Backend Node.js / Fastify / Prisma isolado com seus próprios contratos de compilação.
     - `@inandout/client` (`apps/client`): Single Page Application React / Vite / Tailwind com bundle e tipagem dedicados.
   - Costuras de comando unificadas na raiz (`package.json`) delegando para os pacotes do workspace via execução recursiva (`pnpm -r run build` e `pnpm -r run typecheck`).

2. **Linter e Formatter Unificado (`Biome`)**:
   - Adoção do Biome como engine unificado de linting e formatação de código baseado em Rust, substituindo a combinação tradicional ESLint + Prettier.
   - Execução em sub-segundo tanto localmente sobre arquivos modificados quanto globalmente no pipeline de CI.

3. **Auditoria de Código Morto e Dependências Órfãs (`Knip`)**:
   - Integração do Knip para varredura estática de grafos de imports, identificando dependências não utilizadas, módulos órfãos e exportações mortas.
   - Execução agendada no pipeline de CI para não impactar a agilidade dos commits locais.

4. **Guardrails Locais de Pré-commit (`Husky` + `lint-staged`)**:
   - Instalação de hooks de ciclo de vida git que interceptam tentativas de commit.
   - Formatação e linting in-place exclusivamente sobre arquivos em staging, validação de tipos TypeScript e execução de testes correlacionados em menos de 2 segundos.

5. **Pipeline de Integração Contínua (`GitHub Actions`)**:
   - Execução automática em pushes para `main` e em Pull Requests.
   - Restauração de cache do pnpm e instalação com `--frozen-lockfile`.
   - Execução das etapas de static verification (Biome, TypeScript, Knip), testes unitários/integração (Vitest) e build smoke test garantindo a emissão de artefatos válidos em `dist/`.

## Consequências e Trade-offs

### Benefícios
- **Isolamento e Determinismo**: Cada pacote do workspace declara explicitamente suas dependências, prevenindo vazamentos entre frontend e backend.
- **Velocidade de Feedback**: A suíte de tooling nativo (Biome/pnpm) permite feedback sub-segundo para desenvolvedores e agentes autônomos.
- **Foco em Domínio**: Revisões de código deixam de focar em sintaxe e estilo, priorizando regras de negócio e aderência às especificações.
- **Build Smoke Test**: Nenhum código que quebre a geração de distribuição de produção pode ser integrado na branch principal.

### Trade-offs e Mitigações
- O rigor do isolamento do pnpm requer declaração explícita de dependências e configuração de scripts de ciclo de vida (`allowBuilds` no `pnpm-workspace.yaml`).
- Configurações de compilação (`tsconfig.json`) precisam de manutenção síncrona nos pacotes do workspace e na raiz para garantir compatibilidade.

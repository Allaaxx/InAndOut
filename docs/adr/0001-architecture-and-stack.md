# ADR 0001: Arquitetura em Camadas e Stack Tecnológica

## Contexto

A plataforma InAndOut necessita gerenciar eventos em tempo real em múltiplos terminais de sala de aula e no painel central da coordenação escolar, garantindo sub-segundo de resposta, integridade no controle de concorrência e facilidade de teste sem depender de serviços externos pesados durante o desenvolvimento e execução de testes em CI.

## Decisão

Adotamos uma Clean Architecture monolítica em TypeScript estruturada em três camadas bem isoladas:
1. `src/shared/`: Contratos de DTOs, enumeradores tipados e eventos de domínio sem dependências de infraestrutura.
2. `src/server/`: Backend organizado em domínio puro (`entities`, `value-objects`, `repositories`), casos de uso desacoplados (`application`), adaptadores de infraestrutura (`Prisma`, `Socket.io`, implementações in-memory para testes) e apresentação em `Fastify`.
3. `src/client/`: SPA reativa em React 19, Vite, Tailwind CSS e Shadcn UI.

Para a suíte de testes automatizados, todas as dependências de infraestrutura e comunicação (repositórios, emissores de notificação, relógio) utilizam inversão de dependência manual (Pure Dependency Injection via Factory/Container), permitindo testar ponta a ponta via `app.inject()` sem levantar portas de rede ou bancos externos.

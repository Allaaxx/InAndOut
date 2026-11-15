# ADR 0001: Arquitetura em Camadas e Stack Tecnológica

## Contexto

A plataforma InAndOut necessita gerenciar eventos em tempo real em múltiplos terminais de sala de aula e no painel central da coordenação escolar, garantindo sub-segundo de resposta, integridade no controle de concorrência e facilidade de teste sem depender de serviços externos pesados durante o desenvolvimento e execução de testes em CI.

## Decisão

O sistema InAndOut adota Node.js com TypeScript, estruturado sob os princípios da Clean Architecture e SOLID com injeção de dependência manual (Pure Dependency Injection via Factory/Container):

1. `src/shared/`: Contratos de DTOs, enumeradores tipados e eventos de domínio sem dependências de infraestrutura.
2. `src/server/`: Backend organizado em domínio puro (`entities`, `value-objects`, `repositories`), casos de uso desacoplados (`application`), adaptadores de infraestrutura (`Prisma` com PostgreSQL para produção, adaptadores in-memory para testes rápidos e desenvolvimento sem banco externo) e apresentação em `Fastify` com WebSocket `Socket.io` desacoplado pelo contrato `INotificationSender`.
3. `src/client/`: SPA reativa em React 19, Vite, Tailwind CSS e Shadcn UI.

Para a suíte de testes automatizados, todas as dependências de infraestrutura e comunicação (repositórios, emissores de notificação, relógio) utilizam inversão de dependência manual, permitindo testar ponta a ponta via `app.inject()` sem levantar portas de rede ou bancos externos.

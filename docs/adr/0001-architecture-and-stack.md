# 1. Arquitetura em Camadas e Stack Tecnológica

O sistema InAndOut adota Node.js com TypeScript, estruturado sob os princípios da Clean Architecture e SOLID com injeção de dependência. A persistência de produção utilizará PostgreSQL abstraída por repositórios de domínio, permitindo testes com SQLite em memória. Notificações para a Coordenação serão entregues via WebSocket através de um contrato de serviço desacoplado (`INotificationSender`).

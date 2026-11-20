# ADR 0008: Isolamento Multi-Salas e Roteamento de Terminais Independentes

## Contexto

A versão anterior do InAndOut utilizava um identificador padrão implícito de sala (`SALA-01`), gerando colisão de estado quando múltiplos professores operavam simultaneamente: duas contas de professores autenticados compartilhavam a mesma sessão de terminal ou conflitavam ao tentar iniciar aulas distintas. Além disso, no ambiente escolar, os professores são nômades — transportam seus próprios notebooks ou tablets entre diferentes salas físicas ao longo do dia letivo —, exigindo flexibilidade na seleção e troca de sala sem comprometer a integridade das saídas de alunos em andamento.

## Decisão

1. **Entidade de Domínio e Catálogo de Salas (`Room`)**:
   - Criação da entidade `Room` no banco de dados (`id`, `code` único normalizado, `name`, `isActive`), gerenciada formalmente pela Coordenação em uma rota dedicada na barra lateral (`/coordination/rooms`).
   - Carga inicial (`seed`) com salas padrão (`SALA-01`, `SALA-02`, `SALA-03`, `LAB-01`) preservando total retrocompatibilidade com a suíte de testes.

2. **Roteamento Dinâmico e Nômade do Terminal (`/terminal/:roomCode`)**:
   - O Terminal adota rota dinâmica parametrizada por sala (`/terminal/:roomCode`).
   - Ao acessar `/terminal` sem parâmetro prévio, um modal amigável de seleção de sala é exibido. A sala escolhida é persistida no `localStorage` do dispositivo móvel do professor.
   - Em estado de espera (sem aula ativa na sala), o terminal exibe a identidade da sala e a ação explícita de _"Trocar de Sala"_, permitindo que o professor transite para a próxima sala ao fim de cada período pedagógico.

3. **Travas Estritas de Concorrência**:
   - **Trava por Sala**: Uma sala física admite no máximo uma única `ClassSession` com status `ACTIVE` simultaneamente.
   - **Trava por Professor**: Um mesmo professor pode manter apenas uma única `ClassSession` ativa na escola. Para iniciar aula em outra sala, a anterior deve ser encerrada.
   - **Troca de Sala Bloqueada Durante a Aula**: A troca de sala pelo terminal só é permitida quando a aula corrente estiver finalizada. Ao encerrar a aula, saídas em aberto são convertidas para `IN_TRANSIT_UNRESOLVED` sob tutela da Coordenação (ADR 0002), liberando a sala limpa para o próximo uso.

4. **Isolamento de Comunicação em Tempo Real (WebSockets)**:
   - Eventos de ciclo de vida do terminal e da sala (ex.: `session:started`, `session:ended`) são emitidos para o canal da sala física (`room:<roomCode>`).
   - Eventos intrajornada (saídas de alunos, retornos, fila de espera) mantêm o isolamento estrito no canal da sessão pedagógica (`session:<sessionId>`).

5. **Visibilidade Operacional na Coordenação**:
   - A tela de monitoramento ao vivo (`/coordination/live`) exibe cartões superiores resumindo as salas ativas e suas métricas instantâneas, complementada pela tabela de saídas com coluna de identificação e filtro por sala.

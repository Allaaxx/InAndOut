# ADR 0002: Escalonamento Híbrido de Alertas e Transição de Sessões de Aula

## Contexto

Quando um aluno ultrapassa o tempo limite permitido fora de sala, o professor precisa ser alertado com antecedência sem que a coordenação seja acionada prematuramente por atrasos triviais. Ao mesmo tempo, quando o sinal da escola toca e a aula é finalizada pelo professor, saídas que ainda não foram concluídas não podem ser descartadas ou perdidas entre as trocas de aula de 50 minutos.

## Decisão

Implementamos uma máquina de estados com escalonamento em dois estágios e transição automática no encerramento de sessão:
1. **Estágio Amarelo (80%) e Vermelho (100%)**: Ao atingir 80% do tempo limite (`allowedLimitMinutes`), o status visual do terminal torna-se amarelo. Ao ultrapassar 100%, o status torna-se `OVERDUE` e inicia-se uma janela de tolerância de 2 minutos para ação exclusiva do professor em sala.
2. **Escalonamento Automático**: Se o aluno não retornar e o professor não intervir no prazo de 2 minutos, o sistema aciona um temporizador em background (`EvaluateOverdueMovementsUseCase`) que migra o status para `ESCALATED_TO_COORDINATION` com `escalationType: 'AUTOMATIC'` e emite alerta com áudio e notificação visual no Painel da Coordenação via WebSocket. O professor também pode antecipar essa ação manualmente a qualquer momento.
3. **Saída em Trânsito**: Se a `ClassSession` for finalizada pelo professor enquanto houver movimentações em `IN_TRANSIT` ou `OVERDUE`, essas saídas são automaticamente convertidas para `IN_TRANSIT_UNRESOLVED` (Saída em Trânsito) e transferidas para a fila de resolução direta da Coordenação, desocupando o terminal da próxima aula.

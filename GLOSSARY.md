# InAndOut - Glossário do Domínio

Contexto de controle de fluxo de saída de alunos da sala de aula para o banheiro e métricas de permanência na Escola Lins do Rego.

## Linguagem

**Aluno**:
Estudante do ensino médio identificado por RA com permissão para solicitar saída de sala.
_Avoid_: Usuário comum, cliente

**Professor**:
Educador responsável pela condução da aula e gestão do fluxo de saídas em sala.
_Avoid_: Monitor, instrutor

**Coordenação**:
Setor administrativo e pedagógico da escola responsável pela gestão disciplinar e acompanhamento dos alertas escalados.
_Avoid_: Diretoria, administração central

**RA (Registro do Aluno)**:
Código alfanumérico único atribuído a cada estudante pela instituição de ensino.
_Avoid_: Matrícula, ID de usuário, CPF

**Sessão de Aula**:
Período delimitado de tempo em que uma turma está sob a responsabilidade de um professor em uma disciplina específica.
_Avoid_: Período, turno, horário

**Terminal de Sala**:
Dispositivo físico (computador ou tablet) na sala de aula onde a sessão é mantida aberta e os alunos registram suas saídas e retornos.
_Avoid_: Totem, quiosque, máquina

**Saída de Sala**:
Registro de afastamento temporário do aluno da sala de aula para ida ao banheiro, contendo carimbos de saída e retorno.
_Avoid_: Ausência, falta, evasão

**Fila de Espera**:
Lista ordenada (FIFO) de alunos aguardando liberação para saída de sala quando o limite de concorrência for atingido.
_Avoid_: Lista de espera, fila virtual

**Janela de Confirmação da Fila**:
Tempo de tolerância (2 minutos) concedido ao próximo aluno da fila para confirmar sua saída antes de passar a vez ao seguinte.
_Avoid_: Tempo de espera, reserva

**Tempo Limite**:
Duração máxima tolerada para o retorno do aluno à sala antes do disparo de alerta de estouro.
_Avoid_: Timeout, carência

**Tempo Especial**:
Tempo limite diferenciado associado ao cadastro de alunos com necessidades de saúde ou recomendações médicas.
_Avoid_: Tolerância médica, exceção de saúde

**Liberação de Emergência**:
Autorização concedida pelo professor permitindo a saída concorrente de mais de um aluno simultaneamente ou com tempo estendido.
_Avoid_: Exceção, override, bypass

**Autorização Avulsa**:
Liberação pontual do professor para registrar a saída de um aluno não matriculado na turma da aula em andamento.
_Avoid_: Saída avulsa, liberação manual

**Notificação de Ocorrência**:
Alerta emitido em tempo real para a Coordenação contendo dados do aluno, tempo decorrido fora e identificação da turma/professor.
_Avoid_: Advertência, chamado, ticket

**Escalonamento Automático**:
Envio autônomo da notificação de ocorrência para a Coordenação caso o professor não intervenha no alerta dentro da janela de carência.
_Avoid_: Notificação automática, alarme silencioso

**Saída em Trânsito**:
Saída de sala que permanece em aberto no momento em que a sessão de aula é encerrada, sendo transferida para a tutela da Coordenação.
_Avoid_: Saída órfã, pendência aberta

**Desfecho de Ocorrência**:
Classificação final registrada pela Coordenação para dar baixa em uma saída em trânsito ou extrapolada (Retorno Confirmado, Atendimento Pedagógico, Enfermaria, Evasão).
_Avoid_: Fechamento, encerramento de ticket

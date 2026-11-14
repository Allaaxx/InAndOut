# InAndOut

Sistema de controle de fluxo de saída de alunos para banheiro e monitoramento pedagógico em tempo real na rotina escolar do ensino médio.

## Language

### Sessões e Usuários

**Sessão de Aula**:
Período pedagógico ativo de aula conduzido por um professor para uma turma e disciplina específicas.
_Avoid_: Aula, turno, período livre

**Terminal de Sala**:
Interface reativa pública instalada no computador ou tablet da sala de aula, bloqueada pelo professor via PIN de 4 dígitos.
_Avoid_: Painel do professor, quiosque, tela de login

**Registro Acadêmico (RA)**:
Identificador numérico exclusivo de um estudante no sistema escolar utilizado para solicitar saída e retorno.
_Avoid_: Matrícula, ID de aluno, CPF

**Nome Público LGPD**:
Formatação restrita do nome do estudante (primeiro nome e inicial do último sobrenome, ex.: "Lucas S.") exibida no terminal público de sala.
_Avoid_: Nome abreviado, apelido, anonimato

### Fluxo de Movimentação

**Registro de Saída**:
Registro temporal que marca a saída de um aluno da sala, seu tempo decorrido, limites aplicáveis e status de retorno ou desfecho.
_Avoid_: Ida ao banheiro, passe de saída, ocorrência inicial

**Concorrência Única**:
Regra institucional estrita que permite apenas um estudante por vez fora da sala de aula em condições normais.
_Avoid_: Limite de um, vaga única

**Fila de Espera**:
Estrutura FIFO virtual onde solicitações adicionais de saída são enfileiradas quando a sala já possui um aluno em trânsito.
_Avoid_: Lista de espera, fila do banheiro

**Janela de Confirmação**:
Intervalo de 2 minutos concedido ao primeiro aluno da fila após o retorno do aluno anterior para confirmar sua saída antes da vaga expirar.
_Avoid_: Tempo de espera, tolerância da fila

**Liberação de Emergência**:
Ação exclusiva do professor que autoriza a saída imediata de um estudante para atendimento urgente, ignorando a concorrência única.
_Avoid_: Saída dupla, exceção manual

**Autorização Avulsa**:
Ação do professor que permite a saída de um aluno transferido ou pertencente a outra turma não cadastrado na sessão corrente.
_Avoid_: Aluno convidado, saída avulsa

### Temporalidade e Alertas

**Tempo Limite**:
Duração máxima padrão em minutos (geralmente 10 minutos) permitida para ausência de um estudante durante a aula.
_Avoid_: Tempo padrão, prazo de volta

**Tempo Especial**:
Tempo limite estendido concedido individualmente a estudantes portadores de laudo ou condição médica documentada.
_Avoid_: Tempo médico, tolerância especial

**Janela de Tolerância do Professor**:
Período de 2 minutos concedido ao professor após o estouro do tempo limite para intervir antes do acionamento do escalonamento externo.
_Avoid_: Margem de erro, carência

**Escalonamento Automático**:
Transição de status disparada pelo sistema após o esgotamento da tolerância do professor, enviando alerta crítico em tempo real para a Coordenação.
_Avoid_: Notificação externa, transbordo

### Coordenação e Resoluções

**Saída em Trânsito**:
Movimento de saída que permanece sem registro de retorno no momento em que a sessão de aula é encerrada pelo professor, passando para a tutela da Coordenação.
_Avoid_: Saída pendente, aluno desaparecido, saída órfã

**Desfecho de Ocorrência**:
Classificação administrativa formal atribuída pela Coordenação para encerrar uma saída escalada ou em trânsito (Retornou à sala, Atendido na Coordenação, Enfermaria ou Evasão).
_Avoid_: Motivo, justificativa, solução

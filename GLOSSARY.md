# InAndOut - Glossário do Domínio

Contexto de controle de fluxo de saída de alunos da sala de aula para o banheiro e métricas de permanência na rotina escolar do ensino médio.

## Linguagem

### Sessões e Usuários

**Aluno**:
Estudante do ensino médio identificado por RA com permissão para solicitar saída de sala.
_Avoid_: Usuário comum, cliente

**Professor**:
Educador responsável pela condução da aula e gestão do fluxo de saídas em sala.
_Avoid_: Monitor, instrutor

**Coordenação**:
Setor administrativo e pedagógico da escola responsável pela gestão disciplinar e acompanhamento dos alertas escalados.
_Avoid_: Diretoria, administração central

**Sala (ou Sala de Aula)**:
Ambiente físico cadastrado pela Coordenação (ex.: Sala 01, Laboratório 01) onde ocorrem as aulas e no qual um Terminal de Sala opera.
_Avoid_: Turma, classe, carteira, ambiente virtual

**Turma**:
Agrupamento acadêmico ou série de estudantes (ex.: 1A, 2B, 3A) que assistem às aulas em uma Sala.
_Avoid_: Sala, período, grupo

**Sessão de Aula**:
Período pedagógico ativo de aula conduzido por um professor para uma turma e disciplina específicas dentro de uma Sala.
_Avoid_: Aula, turno, período livre, horário

**Terminal de Sala**:
Interface reativa pública instalada no computador ou tablet fixado ou alocado a uma Sala de Aula, vinculada à Sessão de Aula ativa daquele espaço e bloqueada pelo professor via PIN de 4 dígitos.
_Avoid_: Totem, quiosque, máquina, painel do professor, tela de login

**Registro Acadêmico (RA)**:
Identificador numérico exclusivo de um estudante no sistema escolar utilizado para solicitar saída e retorno.
_Avoid_: Matrícula, ID de aluno, ID de usuário, CPF

**Nome Público LGPD**:
Formatação restrita do nome do estudante (primeiro nome e inicial do último sobrenome, ex.: "Lucas S.") exibida no terminal público de sala.
_Avoid_: Nome abreviado, apelido, anonimato

### Fluxo de Movimentação

**Registro de Saída**:
Registro temporal que marca a saída de um aluno da sala, seu tempo decorrido, limites aplicáveis e status de retorno ou desfecho.
_Avoid_: Ida ao banheiro, passe de saída, ocorrência inicial, ausência, falta

**Concorrência Única**:
Regra institucional estrita que permite apenas um estudante por vez fora da sala de aula em condições normais.
_Avoid_: Limite de um, vaga única

**Fila de Espera**:
Estrutura FIFO virtual onde solicitações adicionais de saída são enfileiradas quando a sala já possui um aluno em trânsito.
_Avoid_: Lista de espera, fila do banheiro, fila virtual

**Auto-Enfileiramento por RA**:
Comportamento reativo do Terminal de Sala onde a submissão de um RA válido no teclado virtual posiciona o estudante diretamente na fila de espera caso a concorrência única já esteja ocupada.
_Avoid_: Fila automática, fila rápida, pré-reserva

**Janela de Confirmação**:
Intervalo de 2 minutos concedido ao primeiro aluno da fila após o retorno do aluno anterior para confirmar sua saída antes da vaga expirar.
_Avoid_: Tempo de espera, tolerância da fila, reserva

**Liberação de Emergência**:
Ação exclusiva do professor que autoriza a saída imediata de um estudante para atendimento urgente, ignorando a concorrência única.
_Avoid_: Saída dupla, exceção manual, override, bypass

**Autorização Avulsa**:
Ação do professor que permite a saída de um aluno transferido ou pertencente a outra turma não cadastrado na sessão corrente.
_Avoid_: Aluno convidado, saída avulsa, liberação manual

### Temporalidade e Alertas

**Tempo Limite**:
Duração máxima padrão em minutos (geralmente 10 minutos) permitida para ausência de um estudante durante a aula.
_Avoid_: Tempo padrão, prazo de volta, timeout, carência

**Tempo Especial**:
Tempo limite estendido concedido individualmente a estudantes portadores de laudo ou condição médica documentada.
_Avoid_: Tempo médico, tolerância especial, exceção de saúde

**Janela de Tolerância do Professor**:
Período de 2 minutos concedido ao professor após o estouro do tempo limite para intervir antes do acionamento do escalonamento externo.
_Avoid_: Margem de erro, carência

**Notificação de Ocorrência**:
Alerta emitido em tempo real para a Coordenação contendo dados do aluno, tempo decorrido fora e identificação da turma/professor.
_Avoid_: Advertência, chamado, ticket

**Escalonamento Automático**:
Transição de status disparada pelo sistema após o esgotamento da tolerância do professor, enviando alerta crítico em tempo real para a Coordenação.
_Avoid_: Notificação externa, transbordo, alarme silencioso

### Coordenação e Resoluções

**Saída em Trânsito**:
Movimento de saída que permanece sem registro de retorno no momento em que a sessão de aula é encerrada pelo professor, passando para a tutela direta da Coordenação.
_Avoid_: Saída pendente, aluno desaparecido, saída órfã, pendência aberta

**Desfecho de Ocorrência**:
Classificação administrativa formal atribuída pela Coordenação para encerrar uma saída escalada ou em trânsito (Retorno Confirmado / Retornou à sala, Atendimento Pedagógico / Atendido na Coordenação, Encaminhado à Enfermaria ou Evasão escolar).
_Avoid_: Motivo, justificativa, solução, fechamento, encerramento de ticket

### Exportações e Métricas

**Relatório de Movimentações**:
Documento analítico consolidado que lista os registros de saída e métricas associadas para uma turma, período ou estudante específico.
_Avoid_: Extrato, listagem simples, print de tela

**Exportação Analítica**:
Processamento estruturado de extração de dados históricos de fluxo escolar em arquivos padronizados (PDF executivo diagramado ou planilha XLSX nativa).
_Avoid_: Download de tabela, dump, export de banco

**Formato de Exportação**:
Padrão de codificação do arquivo gerado pelo caso de uso analítico (`xlsx` para planilha eletrônica nativa do Excel ou `pdf` para documento portátil diagramado).
_Avoid_: Tipo de arquivo, extensão livre

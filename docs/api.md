# InAndOut — Documentação da API REST

A API do InAndOut é construída em **Fastify** com TypeScript e fornece endpoints tipados para autenticação, controle de fluxo de alunos, fila virtual de espera, gestão da coordenação e métricas analíticas.

---

## 1. Autenticação e Terminal

### `POST /auth/login`

Autentica o professor ou coordenador através de email e senha, retornando token JWT e token de atualização.

- **Corpo da requisição**:

  ```json
  {
    "email": "prof@linsdorego.edu.br",
    "password": "senha"
  }
  ```
- **Resposta (200 OK)**:

  ```json
  {
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "user": {
      "id": "user-1",
      "name": "Prof. Carlos Eduardo",
      "email": "prof@linsdorego.edu.br",
      "role": "TEACHER"
    }
  }
  ```

### `POST /auth/verify-pin`

Verifica o PIN de 4 dígitos digitado pelo professor para desbloquear a tela do terminal de sala.

- **Corpo da requisição**:

  ```json
  { "pin": "1234" }
  ```
- **Resposta (200 OK)**:

  ```json
  {
    "valid": true,
    "unlockedToken": "jwt-token",
    "user": { "id": "user-1", "name": "Prof. Carlos", "role": "TEACHER" }
  }
  ```

### `POST /auth/refresh-token`

Renova o token de acesso através do refresh token.

---

## 2. Sessões de Aula

### `POST /sessions/start`

Inicia uma nova sessão de aula para a turma e disciplina informadas. Requer perfil `TEACHER` ou `ADMIN`.

- **Corpo da requisição**:

  ```json
  {
    "classCode": "1A",
    "subject": "Matemática",
    "roomId": "SALA-01",
    "plannedDurationMinutes": 50,
    "defaultTimeLimitMinutes": 10
  }
  ```
- **Resposta (201 Created)**:

  ```json
  {
    "session": {
      "id": "session-id",
      "classCode": "1A",
      "subject": "Matemática",
      "status": "ACTIVE",
      "startedAt": "2026-03-10T08:00:00.000Z"
    }
  }
  ```

### `GET /sessions/active`

Consulta a sessão ativa para uma sala ou professor, retornando também os alunos fora e a fila de espera.

- **Query Params**: `?roomId=SALA-01` ou `?sessionId=session-id`
- **Resposta (200 OK)**:

  ```json
  {
    "session": { ... },
    "activeMovements": [ ... ],
    "queue": [ ... ]
  }
  ```

### `POST /sessions/end`

Encerra a sessão ativa. Quaisquer alunos ainda em trânsito são automaticamente convertidos para `IN_TRANSIT_UNRESOLVED` (Saída em Trânsito) para resolução da Coordenação.

- **Corpo da requisição**:

  ```json
  { "sessionId": "session-id" }
  ```
- **Resposta (200 OK)**:

  ```json
  {
    "session": { ... },
    "metrics": {
      "totalExits": 5,
      "inTransitUnresolvedCount": 1,
      "elapsedMinutes": 50
    },
    "inTransitMovements": [ ... ]
  }
  ```

---

## 3. Movimentações de Saída e Retorno

### `POST /movements/exit`

Registra a saída de um aluno pelo RA digitado no terminal. Se já houver um aluno fora, retorna status 409 Conflict orientando o enfileiramento.

- **Corpo da requisição**:

  ```json
  {
    "ra": "1001",
    "sessionId": "session-id"
  }
  ```
- **Resposta (201 Created)**:

  ```json
  {
    "movement": {
      "id": "mov-id",
      "studentRa": "1001",
      "studentPublicName": "Lucas S.",
      "status": "IN_TRANSIT",
      "alertLevel": "GREEN",
      "startedAt": "2026-03-10T08:10:00.000Z",
      "allowedLimitMinutes": 10
    }
  }
  ```

### `POST /movements/return`

Registra o retorno do aluno pelo RA no terminal, finaliza o cálculo de duração e chama o próximo estudante da fila virtual se houver.

- **Corpo da requisição**:

  ```json
  {
    "ra": "1001",
    "sessionId": "session-id"
  }
  ```
- **Resposta (200 OK)**:

  ```json
  {
    "movement": {
      "id": "mov-id",
      "status": "RETURNED_NORMAL",
      "durationMinutes": 6.5,
      "attendedMinutes": 43.5,
      "attendancePercentage": 87
    },
    "message": "Retorno registrado com sucesso",
    "nextCalledQueueEntry": { ... }
  }
  ```

### `POST /movements/emergency-exit`

Liberação de emergência acionada pelo professor, permitindo saída imediata mesmo com a sala ocupada.

- **Corpo da requisição**:

  ```json
  {
    "ra": "1002",
    "sessionId": "session-id",
    "reason": "Mal-estar súbito"
  }
  ```

### `POST /movements/guest-exit`

Autorização avulsa para aluno não matriculado na turma atual ou transferido.

- **Corpo da requisição**:

  ```json
  {
    "ra": "9999",
    "fullName": "Mariana Santos",
    "originClassCode": "2B",
    "sessionId": "session-id"
  }
  ```

### `POST /movements/:id/escalate`

Aciona manualmente o escalonamento da saída em atraso para a Coordenação Pedagógica.

### `POST /movements/check-overdue` e `POST /movements/evaluate-overdue`

Avalia as saídas ativas contra o relógio do sistema, transitando para `OVERDUE` ou acionando o escalonamento automático via WebSocket.

---

## 4. Fila Virtual de Espera (FIFO)

### `POST /movements/queue/enqueue`

Adiciona um estudante na fila de espera da sessão atual.

### `POST /movements/queue/:id/cancel`

Cancela a posição de um estudante na fila de espera.

### `POST /movements/queue/:id/claim`

Confirma a saída do estudante chamado dentro da janela de tolerância de 2 minutos.

---

## 5. Painel da Coordenação

### `GET /coordination/active-movements`

Retorna todas as saídas ativas em toda a escola (`IN_TRANSIT`, `OVERDUE`, `ESCALATED_TO_COORDINATION`, `IN_TRANSIT_UNRESOLVED`). Requer perfil `COORDINATOR` ou `ADMIN`.

- **Query Params**: `?classCode=1A&status=OVERDUE`

### `POST /coordination/movements/:id/resolve`

Registra o desfecho formal de uma ocorrência ou Saída em Trânsito.

- **Corpo da requisição**:

  ```json
  {
    "outcome": "RETURNED_TO_CLASS",
    "notes": "Aluno retornou após atendimento na enfermaria."
  }
  ```
- **Desfechos válidos (`IncidentOutcome`)**:
  - `RETURNED_TO_CLASS`: Retornou à sala
  - `ATTENDED_AT_COORDINATION`: Atendido na Coordenação
  - `SENT_TO_INFIRMARY`: Encaminhado à Enfermaria
  - `EVASION`: Evasão escolar

---

## 6. Métricas e Análises Escolares

### `GET /analytics/overview`

Retorna indicadores agregados da escola: tempo médio fora, conformidade, saídas no dia, distribuição horária, desfechos e comparativo por turma.

- **Query Params**: `?classCode=1A&date=2026-03-10`

### `GET /analytics/students/:ra`

Retorna o histórico individual completo de um estudante por RA (total de saídas, minutos ausente, % de presença efetiva e lista detalhada de saídas).

- **Query Params**: `?startDate=2026-03-01&endDate=2026-03-31`

### `GET /analytics/export`

Exporta os dados analíticos e de histórico no formato especificado.

- **Query Params**: `?format=csv` ou `?format=pdf` (`&ra=1001` ou `&classCode=1A`)

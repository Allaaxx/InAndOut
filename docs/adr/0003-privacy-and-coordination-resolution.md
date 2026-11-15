# ADR 0003: Privacidade em Terminal Público e Desfechos de Ocorrência

## Contexto

O Terminal de Sala é projetado para operar em tablets ou monitores visíveis para todos os alunos em sala de aula. A exibição de nomes completos, contadores punitivos de regressão em segundos ou motivos médicos de Tempo Especial geraria constrangimento aos estudantes e violaria preceitos da Lei Geral de Proteção de Dados (LGPD). Em contrapartida, a Coordenação Escolar precisa de contexto total (nome completo, RA, turma de origem, professor e foto do estudante) para agir eficazmente em casos de urgência.

## Decisão

1. **Separação de Contexto por Nível de Visibilidade**:
   - No terminal público de sala, o estudante é identificado exclusivamente pelo Nome Público LGPD (`formatPublicStudentName`: primeiro nome e inicial do último sobrenome, ex.: "Lucas S."), com sinalizadores visuais por badges de cor (verde, amarelo, vermelho) e sem cronômetros punitivos públicos decrescentes, resguardando a privacidade e evitando constrangimentos coletivos.
   - No painel da Coordenação, restrito a perfis com papel `COORDINATOR` ou `ADMIN`, os dados completos (RA, turma, professor responsável, avatar/placeholder e tempo decorrido total) são apresentados na íntegra.
2. **Tipificação Formal de Desfechos de Ocorrência**:
   - Ao encerrar uma ocorrência escalada ou uma Saída em Trânsito, o coordenador deve obrigatoriamente registrar um dos quatro desfechos tipificados (`IncidentOutcome`): `RETURNED_TO_CLASS` (Retorno Confirmado / Retornou à sala), `ATTENDED_AT_COORDINATION` (Atendimento Pedagógico / Atendido na Coordenação), `SENT_TO_INFIRMARY` (Encaminhado à Enfermaria) ou `EVASION` (Evasão escolar), enriquecendo as métricas institucionais para tomada de decisão preventiva.

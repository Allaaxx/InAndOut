# ADR 0009: Catálogo de Turmas Versionadas por Ano Letivo e Gestão do Ciclo de Vida de Alunos

status: accepted

## Contexto

Com a introdução do catálogo formal de **Salas de Aula** (ADR 0008), as **Turmas** ainda permaneciam representadas como strings livres (`classCode`) com lista fixa no cliente (`StartSessionModal`), e os **Alunos** existiam apenas via carga inicial (`seed`) sem fluxo administrativo de cadastro, transferência ou desativação. Ao estruturar ambos os catálogos para uso contínuo ao longo de múltiplos anos letivos, três decisões estruturais de difícil reversão precisaram ser definidas: identidade temporal das Turmas, concorrência de sessões por Turma e ciclo de vida lógico de Alunos.

## Decisão

1. **Unicidade Composta de Turma por `(code, academicYear)` e Vínculo por ID com Snapshot Histórico**:
   - Cada **Turma** possui `id`, `code` normalizado em maiúsculas (ex.: `1A`), `name`, `academicYear` (inteiro, ex.: `2026`) e `isActive`.
   - A unicidade é composta por `(code, academicYear)`, permitindo que códigos limpos como `1A` coexistam em anos letivos distintos sem colisão ou necessidade de sufixos artificiais no código.
   - **Alunos** e **Sessões de Aula** referenciam a Turma pelo seu `id` (`classGroupId`), mantendo `classCode` sincronizado para exibição e retrocompatibilidade; **Registros de Saída** continuam gravando o snapshot de `classCode` no momento da saída para que transferências de Turma nunca reescrevam o histórico passado.

2. **Trava Estrita de Concorrência por Turma (Extensão do ADR 0008)**:
   - Além da trava por **Sala de Aula** (máximo 1 sessão ativa por sala) e por **Professor** (máximo 1 sessão ativa por professor), uma **Turma** admite no máximo **1 Sessão de Aula ativa simultaneamente** na escola. Se uma Turma já está em aula em um ambiente (ex.: Laboratório), o sistema rejeita a abertura de outra sessão para a mesma Turma em outra sala (HTTP 409).
   - A desativação de uma Turma é bloqueada apenas se houver **Sessão de Aula ativa** nela; é permitida mesmo com Alunos ativos vinculados (cenário comum de encerramento de ano letivo), apenas impedindo novas sessões e novas matrículas naquela Turma.

3. **Ciclo de Vida Lógico de Alunos, RA Imutável e Privacidade (LGPD)**:
   - **Alunos** possuem `isActive` (sem exclusão física) e **Registro Acadêmico (RA)** numérico **imutável** após a criação, preservando a integridade referencial dos históricos de movimentação.
   - **Alunos inativos** são bloqueados no **Terminal de Sala** para qualquer fluxo (saída normal, Fila de Espera, Liberação de Emergência e Autorização Avulsa).
   - A desativação ou transferência de Turma de um Aluno **não** é bloqueada caso exista saída em trânsito ou entrada em fila; eventuais ocorrências em aberto permanecem sob responsabilidade operacional da Coordenação/Admin (ADR 0002).
   - O **Tempo Especial** mantém apenas sinalização booleana e limite em minutos (`hasSpecialCondition` e `specialLimitMinutes`), sem armazenar texto clínico ou descrição de laudo médico, em conformidade com a LGPD.

## Consequências

- **Turmas divididas**: A trava estrita por Turma impede que uma mesma Turma opere duas sessões simultâneas em salas diferentes; caso a escola passe a dividir turmas em subgrupos concorrentes no futuro, será necessário modelar subgrupos ou relaxar essa trava.
- **Virada de ano letivo**: A Coordenação pode desativar Turmas do ano anterior e criar novas com os mesmos códigos para o novo Ano Letivo sem perda de histórico nem migração destrutiva.
- **Evolução de papéis**: Mantém-se a gestão sob `COORDINATOR` e `ADMIN` nesta etapa, deixando a futura migração de governança cadastral para `ADMIN` e a criação da visão operacional de portaria para `COORDINATOR` como decisão independente posterior.

# ADR 0006: Shells de Navegação e Kiosk de Terminal

## Contexto

A aplicação mantinha visões fragmentadas em estados locais de componente no cliente e formulários redundantes no Terminal de Sala (como um campo secundário de RA dentro do painel da fila de espera). Além disso, o fluxo da Coordenação exigia separação ergonômica de suas funcionalidades (tempo real, visão analítica geral, consulta por aluno e preferências de som/alertas) em abas de uma barra lateral, enquanto o Terminal demandava cabeçalho e rodapé padronizados para o ambiente de sala de aula.

## Decisão

1. **Dashboard Shell e Roteamento da Coordenação**:
   - Adoção de rotas do `react-router-dom` com layout de Dashboard Shell (inspirado no padrão `@ss-blocks/dashboard-shell-01`) contendo barra lateral retrátil dividida em 4 seções:
     - `/coordination/live`: Monitoramento em tempo real de saídas com tabela reativa e gaveta lateral (`Sheet`) de resolução de ocorrências.
     - `/coordination/analytics`: Visão geral com cartões consolidados e gráficos analíticos de horários de pico e desfechos.
     - `/coordination/students`: Consulta por aluno por RA com histórico de movimentações e exportação de relatórios.
     - `/coordination/settings`: Preferências da aplicação para despoluir as visões operacionais (ativar/desativar alerta sonoro, taxa de atualização).

2. **Kiosk do Terminal com Numpad Unificado e Auto-Enfileiramento**:
   - Cabeçalho minimalista adaptado do padrão `@ss-blocks/navbar-component-01`: exibe marca, indicador de status da concorrência da sala e botão de bloqueio de tela (PIN), agrupando ações de encerramento em menu discreto.
   - Rodapé minimalista adaptado do padrão `@ss-blocks/footer-component-01`: informações institucionais e versão.
   - Unificação da interação do aluno no Teclado Numérico (Numpad): a digitação do RA gerencia de forma inteligente a saída imediata, o retorno, a confirmação de vaga chamada ou o **Auto-Enfileiramento por RA** quando a sala já estiver ocupada. A desistência da fila é viabilizada tanto por ação direta no painel quanto por redigitação do RA no teclado numérico.

3. **Simplificação do Login**:
   - Autenticação restrita a E-mail e Senha, alinhando a especificação e os testes do cliente para eliminar a definição redundante de PIN na tela de login.

# ADR 0004: Interface Web com Shadcn UI e Blocos de Dashboard

## Contexto

A interface precisa oferecer alta reatividade com baixa sobrecarga em dispositivos escolares com hardware modesto (tablets e navegadores antigos em salas de aula). A navegação precisa ser simples para alunos digitarem seu RA sem complicações, enquanto as visões da coordenação e administração exigem componentes ricos de tabela, filtros, gavetas laterais de ação rápida e gráficos analíticos.

## Decisão

Adotamos:
1. **React 19 com Vite e Tailwind CSS**: Proporciona carregamento instantâneo, baixo bundle size e suporte nativo a componentes modernos e transições de estado.
2. **Componentes baseados em Shadcn UI**:
   - `InputOTP`: Utilizado para o desbloqueio rápido de tela do terminal pelo professor via PIN de 4 dígitos.
   - `DataTable`: Utilizado para o monitoramento em tempo real de todas as turmas na Coordenação com filtros por turma e status.
   - `Sheet` (Gaveta lateral): Utilizado para o formulário de resolução rápida de ocorrências na Coordenação sem perder o contexto visual do painel.
   - `AlertDialog`: Utilizado para confirmação protegida de Liberações de Emergência e Autorizações Avulsas pelo professor.
   - `Sonner Toast`: Alertas flutuantes em tempo real com ações diretas integrados a notificações sonoras por AudioContext nativo.
3. **Visualizações Recharts**: Utilizadas para apresentar a distribuição de saídas por faixa horária (BarChart) e composição de desfechos de ocorrência (PieChart).

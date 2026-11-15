# ADR 0007: Exportação Analítica com React-PDF e ExcelJS

## Contexto

A coordenação escolar necessita extrair relatórios históricos de movimentações de alunos e turmas em dois formatos essenciais:

1. **Planilhas eletrônicas (Excel)**: Para cruzamento de dados, filtros dinâmicos e análises pedagógicas. O formato legado em CSV com separador vírgula causava o problema de "dados aglomerados" em computadores configurados no padrão brasileiro (pt-BR), onde o delimitador esperado é ponto-e-vírgula ou o formato binário OpenXML (.xlsx).
2. **Documentos portáteis (PDF)**: Para reuniões pedagógicas e registros impressos formais. A implementação anterior utilizava `pdfkit` de forma imperativa (cálculos manuais de coordenadas X/Y e desenho vetorial), o que dificultava a manutenção de layout, adição de cards de métricas e estilização consistente com o design system.

## Decisão

1. **Planilha Nativa com ExcelJS (`.xlsx`)**:
   - A geração de planilhas passa a utilizar a biblioteca `exceljs` no backend Node.js (`ExportAnalyticsReportUseCase`).
   - O arquivo gerado é um `.xlsx` nativo, com uma aba estruturada ("Movimentações"), metadados no cabeçalho (instituição, turma, período e total de registros), cabeçalho estilizado (fundo escuro corporativo, tipografia destacada), congelamento de painel (_freeze panes_ na linha do cabeçalho), auto-filtro ativado e colunas com larguras ajustadas ao conteúdo.
   - Os dados são tipados nativamente (datas, números inteiros para duração e minutos, textos e porcentagens), evitando conversões incorretas no leitor de planilhas do usuário.

2. **PDF Declarativo com `@react-pdf/renderer`**:
   - A geração de PDF substitui o `pdfkit` imperativo por `@react-pdf/renderer` no backend Fastify.
   - O documento é modelado declarativamente em componentes React (`Document`, `Page`, `View`, `Text`, `StyleSheet`), com layout Flexbox moderno.
   - A estrutura do PDF compreende:
     - Cabeçalho institucional formal e metadados dos filtros aplicados.
     - Bloco de indicadores executivos consolidados (total de saídas, média de tempo fora da sala, taxa de presença).
     - Grade tabular paginada com quebra automática e estilo zebrado.
     - Rodapé com numeração dinâmica de páginas ("Página X de Y") e carimbo de data/hora UTC.

3. **Arquitetura e Contrato de API**:
   - A geração permanece no backend (`ExportAnalyticsReportUseCase`), servindo os arquivos via stream/buffer binário através do endpoint `GET /analytics/export?format=xlsx|pdf`.
   - Compatibilidade retroativa garantida para chamadas legadas com `format=csv`, direcionando para geração compatível.

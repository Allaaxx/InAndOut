import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

export interface MovementReportPdfRow {
  id: string;
  date: string;
  exitTime: string;
  returnTime: string;
  studentRa: string;
  studentFullName: string;
  classCode: string;
  subject: string;
  duration: string;
  allowedLimit: string;
  status: string;
  outcome: string;
  attendance: string;
}

export interface MovementReportSummaryStats {
  totalMovements: number;
  averageDurationMinutes: number;
  averageAttendancePercentage: number;
  escalatedCount: number;
}

export interface MovementReportPdfDocumentProps {
  title: string;
  subtitle: string;
  emissionDate: string;
  filtersSummary: string;
  stats: MovementReportSummaryStats;
  movements: MovementReportPdfRow[];
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#1e293b',
  },
  header: {
    marginBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  emissionDate: {
    fontSize: 7.5,
    color: '#64748b',
  },
  subtitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginBottom: 2,
  },
  filtersBar: {
    fontSize: 7.5,
    color: '#475569',
    backgroundColor: '#f1f5f9',
    padding: 5,
    borderRadius: 3,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 6.5,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    paddingHorizontal: 3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#ffffff',
  },
  tableRowOdd: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 6.8,
    color: '#1e293b',
    paddingHorizontal: 3,
  },
  colDate: { width: '8%' },
  colExit: { width: '6%', textAlign: 'center' },
  colReturn: { width: '6%', textAlign: 'center' },
  colRa: { width: '7%' },
  colStudent: { width: '18%' },
  colClass: { width: '5%', textAlign: 'center' },
  colSubject: { width: '12%' },
  colDuration: { width: '7%', textAlign: 'center' },
  colLimit: { width: '6%', textAlign: 'center' },
  colStatus: { width: '9%' },
  colOutcome: { width: '9%' },
  colAttendance: { width: '7%', textAlign: 'center' },
  emptyMessage: {
    textAlign: 'center',
    paddingVertical: 14,
    fontSize: 8,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 5,
  },
  footerText: {
    fontSize: 6.8,
    color: '#64748b',
  },
});

export function MovementReportPdfDocument({
  title,
  subtitle,
  emissionDate,
  filtersSummary,
  stats,
  movements,
}: MovementReportPdfDocumentProps) {
  return (
    <Document title={title} author="InAndOut">
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>
              Escola Estadual José Lins do Rego — InAndOut
            </Text>
            <Text style={styles.emissionDate}>Emissão: {emissionDate}</Text>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.filtersBar}>
            Filtros aplicados: {filtersSummary} | Total de registros:{' '}
            {movements.length}
          </Text>
        </View>

        {/* Executive Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalMovements}</Text>
            <Text style={styles.statLabel}>Total de Saídas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.averageDurationMinutes} min
            </Text>
            <Text style={styles.statLabel}>Duração Média</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.averageAttendancePercentage}%
            </Text>
            <Text style={styles.statLabel}>Presença em Aula</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.escalatedCount}</Text>
            <Text style={styles.statLabel}>Ocorrências Escaladas</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Data</Text>
            <Text style={[styles.tableHeaderCell, styles.colExit]}>Saída</Text>
            <Text style={[styles.tableHeaderCell, styles.colReturn]}>
              Retorno
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colRa]}>RA</Text>
            <Text style={[styles.tableHeaderCell, styles.colStudent]}>
              Aluno
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colClass]}>Turma</Text>
            <Text style={[styles.tableHeaderCell, styles.colSubject]}>
              Disciplina
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colDuration]}>
              Duração
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colLimit]}>
              Limite
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colStatus]}>
              Status
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colOutcome]}>
              Desfecho
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colAttendance]}>
              % Presença
            </Text>
          </View>

          {movements.length === 0 ? (
            <Text style={styles.emptyMessage}>
              Nenhuma movimentação encontrada para os filtros especificados.
            </Text>
          ) : (
            movements.map((m, index) => {
              const rowStyle = [
                styles.tableRow,
                index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
              ];
              return (
                <View key={m.id} style={rowStyle} wrap={false}>
                  <Text style={[styles.tableCell, styles.colDate]}>
                    {m.date}
                  </Text>
                  <Text style={[styles.tableCell, styles.colExit]}>
                    {m.exitTime}
                  </Text>
                  <Text style={[styles.tableCell, styles.colReturn]}>
                    {m.returnTime}
                  </Text>
                  <Text style={[styles.tableCell, styles.colRa]}>
                    {m.studentRa}
                  </Text>
                  <Text style={[styles.tableCell, styles.colStudent]}>
                    {m.studentFullName}
                  </Text>
                  <Text style={[styles.tableCell, styles.colClass]}>
                    {m.classCode}
                  </Text>
                  <Text style={[styles.tableCell, styles.colSubject]}>
                    {m.subject}
                  </Text>
                  <Text style={[styles.tableCell, styles.colDuration]}>
                    {m.duration}
                  </Text>
                  <Text style={[styles.tableCell, styles.colLimit]}>
                    {m.allowedLimit}
                  </Text>
                  <Text style={[styles.tableCell, styles.colStatus]}>
                    {m.status}
                  </Text>
                  <Text style={[styles.tableCell, styles.colOutcome]}>
                    {m.outcome}
                  </Text>
                  <Text style={[styles.tableCell, styles.colAttendance]}>
                    {m.attendance}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            InAndOut — Sistema de Controle de Fluxo Escolar
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

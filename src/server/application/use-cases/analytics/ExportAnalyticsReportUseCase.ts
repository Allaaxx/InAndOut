import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import { ExportAnalyticsQueryDTO } from '@shared/dtos';

export class InvalidExportFormatError extends Error {
  constructor(format?: string) {
    super(
      `Formato inválido: "${format}". Os formatos suportados são "csv" e "pdf".`
    );
    this.name = 'InvalidExportFormatError';
  }
}

export interface ExportReportResult {
  contentType: string;
  filename: string;
  content: string | Buffer;
}

export interface ExportAnalyticsReportOptions {
  clock?: () => Date;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapePdfText(text: string): string {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalized
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function createPdfDocument(title: string, lines: string[]): Buffer {
  const contentStream: string[] = [
    'BT',
    '/F1 14 Tf',
    '40 750 Td',
    `(${escapePdfText(title)}) Tj`,
    '/F1 9 Tf',
    '0 -20 Td',
  ];

  for (const line of lines.slice(0, 40)) {
    contentStream.push(`(${escapePdfText(line)}) Tj`);
    contentStream.push('0 -14 Td');
  }
  contentStream.push('ET');

  const streamData = contentStream.join('\n');
  const streamLength = Buffer.byteLength(streamData, 'utf-8');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  // Object 1: Catalog
  offsets.push(Buffer.byteLength(pdf, 'utf-8'));
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Object 2: Pages
  offsets.push(Buffer.byteLength(pdf, 'utf-8'));
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // Object 3: Page
  offsets.push(Buffer.byteLength(pdf, 'utf-8'));
  pdf +=
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';

  // Object 4: Stream
  offsets.push(Buffer.byteLength(pdf, 'utf-8'));
  pdf += `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamData}\nendstream\nendobj\n`;

  // Object 5: Font
  offsets.push(Buffer.byteLength(pdf, 'utf-8'));
  pdf +=
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const startxref = Buffer.byteLength(pdf, 'utf-8');
  pdf += 'xref\n';
  pdf += '0 6\n';
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\n';
  pdf += 'startxref\n';
  pdf += `${startxref}\n`;
  pdf += '%%EOF\n';

  return Buffer.from(pdf, 'utf-8');
}

export class ExportAnalyticsReportUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly movementRepo: IMovementRecordRepository,
    private readonly studentRepo: IStudentRepository,
    options: ExportAnalyticsReportOptions = {}
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    query: ExportAnalyticsQueryDTO
  ): Promise<ExportReportResult> {
    const format = query.format?.toLowerCase();
    if (format !== 'csv' && format !== 'pdf') {
      throw new InvalidExportFormatError(query.format);
    }

    const now = this.clock();
    const dateStamp = now.toISOString().slice(0, 10);

    // Fetch movements
    let movements = query.ra
      ? await this.movementRepo.findByStudentRa(query.ra)
      : await this.movementRepo.findAll();

    // Filters
    movements = movements.filter((m) => {
      if (query.classCode && query.classCode !== 'TODOS') {
        if (m.classCode !== query.classCode) {
          return false;
        }
      }

      if (query.startDate) {
        const start = new Date(query.startDate);
        if (m.startedAt.getTime() < start.getTime()) {
          return false;
        }
      }

      if (query.endDate) {
        const endDateStr =
          query.endDate.length === 10
            ? `${query.endDate}T23:59:59.999Z`
            : query.endDate;
        const end = new Date(endDateStr);
        if (m.startedAt.getTime() > end.getTime()) {
          return false;
        }
      }

      return true;
    });

    // Sort newest first
    movements.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const filenamePrefix = query.ra
      ? `relatorio-aluno-${query.ra}`
      : query.classCode && query.classCode !== 'TODOS'
        ? `relatorio-turma-${query.classCode}`
        : 'relatorio-movimentacoes';

    if (format === 'csv') {
      const headers = [
        'Data/Hora',
        'RA',
        'Aluno',
        'Turma',
        'Disciplina',
        'Duração (min)',
        'Limite (min)',
        'Status',
        'Desfecho',
        '% Presença',
      ];

      const rows = movements.map((m) => {
        const duration =
          m.durationMinutes !== undefined ? String(m.durationMinutes) : '-';
        const attendance =
          m.attendancePercentage !== undefined
            ? `${m.attendancePercentage}%`
            : '-';
        const outcome = m.outcome ?? '-';

        return [
          m.startedAt.toISOString(),
          m.studentRa,
          m.studentFullName,
          m.classCode,
          m.subject,
          duration,
          String(m.allowedLimitMinutes),
          m.status,
          outcome,
          attendance,
        ].map(escapeCsvCell);
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
        '\n'
      );

      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `${filenamePrefix}-${dateStamp}.csv`,
        content: csvContent,
      };
    }

    // PDF Format
    const title = `InAndOut - Relatorio de Movimentacoes (${dateStamp})`;
    const lines: string[] = [];

    lines.push(
      `Filtros: ${query.ra ? `RA ${query.ra} | ` : ''}${query.classCode ? `Turma ${query.classCode} | ` : ''}Total de Registros: ${movements.length}`
    );
    lines.push('--------------------------------------------------------------------------------');
    lines.push('DATA/HORA        | RA    | ALUNO                    | TURMA | DUR | STATUS');
    lines.push('--------------------------------------------------------------------------------');

    for (const m of movements) {
      const datePart = m.startedAt.toISOString().slice(0, 16).replace('T', ' ');
      const raPart = m.studentRa.padEnd(5, ' ');
      const namePart = (
        m.studentFullName.length > 22
          ? m.studentFullName.slice(0, 20) + '..'
          : m.studentFullName
      ).padEnd(24, ' ');
      const turmaPart = m.classCode.padEnd(5, ' ');
      const durPart = (
        m.durationMinutes !== undefined ? `${m.durationMinutes}m` : '-'
      ).padEnd(4, ' ');
      const statusPart = m.status;

      lines.push(
        `${datePart} | ${raPart} | ${namePart} | ${turmaPart} | ${durPart} | ${statusPart}`
      );
    }

    const pdfBuffer = createPdfDocument(title, lines);

    return {
      contentType: 'application/pdf',
      filename: `${filenamePrefix}-${dateStamp}.pdf`,
      content: pdfBuffer,
    };
  }
}

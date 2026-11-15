import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import type { ExportAnalyticsQueryDTO } from '@shared/dtos';
import PDFDocument from 'pdfkit';

export class InvalidExportFormatError extends Error {
  constructor(format?: string) {
    super(
      `Formato inválido: "${format}". Os formatos suportados são "csv" e "pdf".`,
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

interface PdfMovementRow {
  startedAt: string;
  studentRa: string;
  studentFullName: string;
  classCode: string;
  duration: string;
  allowedLimit: string;
  status: string;
}

interface CreatePdfDocumentParams {
  title: string;
  subtitle: string;
  emissionDate: string;
  filtersSummary: string;
  totalRecords: number;
  movements: PdfMovementRow[];
}

function createPdfDocument(params: CreatePdfDocumentParams): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true,
      info: {
        Title: params.title,
        Author: 'InAndOut',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Header
    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#0f172a')
      .text('Escola Estadual José Lins do Rego — InAndOut', 40, 40);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(params.subtitle, 40, 60);

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#64748b')
      .text(`Emissão: ${params.emissionDate}`, 40, 75);

    doc
      .moveTo(40, 90)
      .lineTo(555, 90)
      .strokeColor('#cbd5e1')
      .lineWidth(0.75)
      .stroke();

    // Filters summary bar
    doc.rect(40, 98, 515, 22).fillAndStroke('#f8fafc', '#e2e8f0');

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#334155')
      .text(
        `Filtros: ${params.filtersSummary}  |  Total de registros: ${params.totalRecords}`,
        48,
        104,
        { width: 500, lineBreak: false, ellipsis: true },
      );

    // Columns configuration
    const cols = [
      { label: 'Data/Hora', x: 40, w: 95, align: 'left' as const },
      { label: 'RA', x: 135, w: 45, align: 'left' as const },
      { label: 'Aluno', x: 180, w: 140, align: 'left' as const },
      { label: 'Turma', x: 320, w: 45, align: 'center' as const },
      { label: 'Duração', x: 365, w: 50, align: 'center' as const },
      { label: 'Limite', x: 415, w: 45, align: 'center' as const },
      { label: 'Status', x: 460, w: 95, align: 'left' as const },
    ];

    const drawTableHeader = (y: number) => {
      doc.rect(40, y, 515, 20).fill('#f1f5f9');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b');
      for (const col of cols) {
        doc.text(col.label, col.x + 4, y + 6, {
          width: col.w - 8,
          align: col.align,
          lineBreak: false,
        });
      }
      doc
        .moveTo(40, y + 20)
        .lineTo(555, y + 20)
        .strokeColor('#cbd5e1')
        .lineWidth(0.5)
        .stroke();
    };

    let currentY = 128;
    drawTableHeader(currentY);
    currentY += 20;

    if (params.movements.length === 0) {
      doc.font('Helvetica').fontSize(8.5).fillColor('#64748b');
      doc.text(
        'Nenhuma movimentação encontrada para os filtros especificados.',
        48,
        currentY + 12,
        { width: 500, align: 'center' },
      );
    } else {
      for (let i = 0; i < params.movements.length; i++) {
        const m = params.movements[i];
        if (currentY + 18 > doc.page.height - 50) {
          doc.addPage();
          currentY = 40;
          drawTableHeader(currentY);
          currentY += 20;
        }

        if (i % 2 === 1) {
          doc.rect(40, currentY, 515, 18).fill('#f8fafc');
        }

        doc.font('Helvetica').fontSize(8).fillColor('#1e293b');
        doc.text(m.startedAt, cols[0].x + 4, currentY + 4, {
          width: cols[0].w - 8,
          align: cols[0].align,
          lineBreak: false,
        });
        doc.text(m.studentRa, cols[1].x + 4, currentY + 4, {
          width: cols[1].w - 8,
          align: cols[1].align,
          lineBreak: false,
        });
        doc.text(m.studentFullName, cols[2].x + 4, currentY + 4, {
          width: cols[2].w - 8,
          align: cols[2].align,
          lineBreak: false,
          ellipsis: true,
        });
        doc.text(m.classCode, cols[3].x + 4, currentY + 4, {
          width: cols[3].w - 8,
          align: cols[3].align,
          lineBreak: false,
        });
        doc.text(m.duration, cols[4].x + 4, currentY + 4, {
          width: cols[4].w - 8,
          align: cols[4].align,
          lineBreak: false,
        });
        doc.text(m.allowedLimit, cols[5].x + 4, currentY + 4, {
          width: cols[5].w - 8,
          align: cols[5].align,
          lineBreak: false,
        });
        doc.text(m.status, cols[6].x + 4, currentY + 4, {
          width: cols[6].w - 8,
          align: cols[6].align,
          lineBreak: false,
        });

        doc
          .moveTo(40, currentY + 18)
          .lineTo(555, currentY + 18)
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .stroke();

        currentY += 18;
      }
    }

    // Footers across all pages
    const range = doc.bufferedPageRange();
    for (let p = range.start; p < range.start + range.count; p++) {
      doc.switchToPage(p);
      doc
        .moveTo(40, doc.page.height - 40)
        .lineTo(555, doc.page.height - 40)
        .strokeColor('#e2e8f0')
        .lineWidth(0.5)
        .stroke();

      doc.font('Helvetica').fontSize(8).fillColor('#64748b');
      doc.text(
        'InAndOut — Sistema de Controle de Fluxo Escolar',
        40,
        doc.page.height - 32,
        { width: 300, align: 'left', lineBreak: false },
      );
      doc.text(
        `Página ${p + 1} de ${range.count}`,
        doc.page.width - 240,
        doc.page.height - 32,
        { width: 200, align: 'right', lineBreak: false },
      );
    }

    doc.end();
  });
}

export class ExportAnalyticsReportUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly movementRepo: IMovementRecordRepository,
    readonly _studentRepo: IStudentRepository,
    options: ExportAnalyticsReportOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    query: ExportAnalyticsQueryDTO,
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

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');

      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `${filenamePrefix}-${dateStamp}.csv`,
        content: csvContent,
      };
    }

    // PDF Format
    const subtitle = query.ra
      ? `Relatório Individual de Movimentações — Aluno RA ${query.ra}`
      : query.classCode && query.classCode !== 'TODOS'
        ? `Relatório de Movimentações — Turma ${query.classCode}`
        : 'Relatório Geral de Movimentações';

    const emissionDate = `${now.toISOString().replace('T', ' ').slice(0, 19)} UTC`;

    const filterParts: string[] = [];
    if (query.ra) {
      filterParts.push(`RA: ${query.ra}`);
    }
    if (query.classCode && query.classCode !== 'TODOS') {
      filterParts.push(`Turma: ${query.classCode}`);
    }
    if (query.startDate || query.endDate) {
      filterParts.push(
        `Período: ${query.startDate ?? ''} a ${query.endDate ?? ''}`,
      );
    }
    const filtersSummary =
      filterParts.length > 0 ? filterParts.join(' | ') : 'Todos os registros';

    const movementsRows: PdfMovementRow[] = movements.map((m) => ({
      startedAt: m.startedAt.toISOString().slice(0, 16).replace('T', ' '),
      studentRa: m.studentRa,
      studentFullName: m.studentFullName,
      classCode: m.classCode,
      duration:
        m.durationMinutes !== undefined ? `${m.durationMinutes} min` : '-',
      allowedLimit: `${m.allowedLimitMinutes} min`,
      status: m.status,
    }));

    const pdfBuffer = await createPdfDocument({
      title: 'Escola Estadual José Lins do Rego — InAndOut',
      subtitle,
      emissionDate,
      filtersSummary,
      totalRecords: movements.length,
      movements: movementsRows,
    });

    return {
      contentType: 'application/pdf',
      filename: `${filenamePrefix}-${dateStamp}.pdf`,
      content: pdfBuffer,
    };
  }
}

import { pdf } from '@react-pdf/renderer';
import type { MovementRecord } from '@server/domain/entities/MovementRecord';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import type { ExportAnalyticsQueryDTO } from '@shared/dtos';
import { MovementStatus } from '@shared/enums';
import ExcelJS from 'exceljs';
import React from 'react';
import {
  MovementReportPdfDocument,
  type MovementReportPdfRow,
  type MovementReportSummaryStats,
} from './reports/MovementReportPdfDocument';

export class InvalidExportFormatError extends Error {
  constructor(format?: string) {
    super(
      `Formato inválido: "${format}". Os formatos suportados são "xlsx", "pdf" e "csv".`,
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

interface ReportRowData {
  id: string;
  date: string;
  exitTime: string;
  returnTime: string;
  studentRa: string;
  studentFullName: string;
  classCode: string;
  subject: string;
  durationMinutes?: number;
  allowedLimitMinutes: number;
  status: string;
  outcome: string;
  attendancePercentage?: number;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (
    stringValue.includes(';') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function mapMovementToRowData(movement: MovementRecord): ReportRowData {
  const exitDate = movement.startedAt.toISOString().slice(0, 10);
  const exitTime = movement.startedAt.toISOString().slice(11, 16);
  const returnTime = movement.endedAt
    ? movement.endedAt.toISOString().slice(11, 16)
    : '-';
  const outcome = movement.outcome ?? '-';

  return {
    id: movement.id,
    date: exitDate,
    exitTime,
    returnTime,
    studentRa: movement.studentRa,
    studentFullName: movement.studentFullName,
    classCode: movement.classCode,
    subject: movement.subject,
    durationMinutes: movement.durationMinutes,
    allowedLimitMinutes: movement.allowedLimitMinutes,
    status: movement.status,
    outcome,
    attendancePercentage: movement.attendancePercentage,
  };
}

function computeReportStats(
  movements: MovementRecord[],
): MovementReportSummaryStats {
  const completedMovements = movements.filter(
    (movement) => movement.durationMinutes !== undefined,
  );
  const averageDurationMinutes =
    completedMovements.length > 0
      ? Math.round(
          completedMovements.reduce(
            (accumulated, movement) =>
              accumulated + (movement.durationMinutes ?? 0),
            0,
          ) / completedMovements.length,
        )
      : 0;

  const attendanceMovements = movements.filter(
    (movement) => movement.attendancePercentage !== undefined,
  );
  const averageAttendancePercentage =
    attendanceMovements.length > 0
      ? Math.round(
          attendanceMovements.reduce(
            (accumulated, movement) =>
              accumulated + (movement.attendancePercentage ?? 0),
            0,
          ) / attendanceMovements.length,
        )
      : 0;

  const escalatedCount = movements.filter(
    (movement) =>
      movement.escalatedAt !== undefined ||
      movement.status === MovementStatus.ESCALATED_TO_COORDINATION ||
      movement.status === MovementStatus.IN_TRANSIT_UNRESOLVED,
  ).length;

  return {
    totalMovements: movements.length,
    averageDurationMinutes,
    averageAttendancePercentage,
    escalatedCount,
  };
}

async function renderExcelWorkbook(params: {
  subtitle: string;
  emissionDate: string;
  filtersSummary: string;
  rows: ReportRowData[];
  now: Date;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'InAndOut';
  workbook.title = 'Relatório de Movimentações';
  workbook.created = params.now;

  const worksheet = workbook.addWorksheet('Movimentações', {
    views: [{ state: 'frozen', ySplit: 6 }],
  });

  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Escola Estadual José Lins do Rego — InAndOut';
  titleCell.font = {
    name: 'Calibri',
    size: 14,
    bold: true,
    color: { argb: 'FF0F172A' },
  };

  worksheet.mergeCells('A2:L2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = params.subtitle;
  subtitleCell.font = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FF334155' },
  };

  worksheet.mergeCells('A3:L3');
  const metaCell = worksheet.getCell('A3');
  metaCell.value = `Emissão: ${params.emissionDate}   |   Total de registros: ${params.rows.length}`;
  metaCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };

  worksheet.mergeCells('A4:L4');
  const filterCell = worksheet.getCell('A4');
  filterCell.value = `Filtros: ${params.filtersSummary}`;
  filterCell.font = {
    name: 'Calibri',
    size: 9,
    italic: true,
    color: { argb: 'FF475569' },
  };

  const headerRow = worksheet.getRow(6);
  headerRow.values = [
    'Data Saída',
    'Hora Saída',
    'Hora Retorno',
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
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  params.rows.forEach((rowData, index) => {
    const rowNumber = 7 + index;
    const row = worksheet.getRow(rowNumber);
    const durationDisplay =
      rowData.durationMinutes !== undefined ? rowData.durationMinutes : '-';
    const attendanceDisplay =
      rowData.attendancePercentage !== undefined
        ? `${rowData.attendancePercentage}%`
        : '-';

    row.values = [
      rowData.date,
      rowData.exitTime,
      rowData.returnTime,
      rowData.studentRa,
      rowData.studentFullName,
      rowData.classCode,
      rowData.subject,
      durationDisplay,
      rowData.allowedLimitMinutes,
      rowData.status,
      rowData.outcome,
      attendanceDisplay,
    ];
    row.height = 20;

    const isEvenRow = index % 2 === 1;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEvenRow ? 'FFF8FAFC' : 'FFFFFFFF' },
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (colNumber === 5 || colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  worksheet.autoFilter = 'A6:L6';
  worksheet.columns = [
    { width: 14 },
    { width: 12 },
    { width: 13 },
    { width: 12 },
    { width: 32 },
    { width: 10 },
    { width: 22 },
    { width: 15 },
    { width: 13 },
    { width: 22 },
    { width: 22 },
    { width: 14 },
  ];

  const excelBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(excelBuffer);
}

function renderCsvText(rows: ReportRowData[]): string {
  const headers = [
    'Data Saída',
    'Hora Saída',
    'Hora Retorno',
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

  const formattedRows = rows.map((rowData) => {
    const duration =
      rowData.durationMinutes !== undefined
        ? String(rowData.durationMinutes)
        : '-';
    const attendance =
      rowData.attendancePercentage !== undefined
        ? `${rowData.attendancePercentage}%`
        : '-';

    return [
      rowData.date,
      rowData.exitTime,
      rowData.returnTime,
      rowData.studentRa,
      rowData.studentFullName,
      rowData.classCode,
      rowData.subject,
      duration,
      String(rowData.allowedLimitMinutes),
      rowData.status,
      rowData.outcome,
      attendance,
    ].map(escapeCsvCell);
  });

  return (
    '\uFEFF' +
    [headers.join(';'), ...formattedRows.map((cells) => cells.join(';'))].join(
      '\r\n',
    )
  );
}

async function renderPdfBuffer(params: {
  subtitle: string;
  emissionDate: string;
  filtersSummary: string;
  stats: MovementReportSummaryStats;
  rows: ReportRowData[];
}): Promise<Buffer> {
  const movementsRows: MovementReportPdfRow[] = params.rows.map((rowData) => ({
    id: rowData.id,
    date: rowData.date,
    exitTime: rowData.exitTime,
    returnTime: rowData.returnTime,
    studentRa: rowData.studentRa,
    studentFullName: rowData.studentFullName,
    classCode: rowData.classCode,
    subject: rowData.subject,
    duration:
      rowData.durationMinutes !== undefined
        ? `${rowData.durationMinutes} min`
        : '-',
    allowedLimit: `${rowData.allowedLimitMinutes} min`,
    status: rowData.status,
    outcome: rowData.outcome,
    attendance:
      rowData.attendancePercentage !== undefined
        ? `${rowData.attendancePercentage}%`
        : '-',
  }));

  const pdfDocumentElement = React.createElement(MovementReportPdfDocument, {
    title: 'Escola Estadual José Lins do Rego — InAndOut',
    subtitle: params.subtitle,
    emissionDate: params.emissionDate,
    filtersSummary: params.filtersSummary,
    stats: params.stats,
    movements: movementsRows,
  });

  const stream = await pdf(pdfDocumentElement).toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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
    if (format !== 'xlsx' && format !== 'pdf' && format !== 'csv') {
      throw new InvalidExportFormatError(query.format);
    }

    const now = this.clock();
    const dateStamp = now.toISOString().slice(0, 10);

    let movements = query.ra
      ? await this.movementRepo.findByStudentRa(query.ra)
      : await this.movementRepo.findAll();

    movements = movements.filter((movement) => {
      if (query.classCode && query.classCode !== 'TODOS') {
        if (movement.classCode !== query.classCode) {
          return false;
        }
      }

      if (query.startDate) {
        const start = new Date(query.startDate);
        if (movement.startedAt.getTime() < start.getTime()) {
          return false;
        }
      }

      if (query.endDate) {
        const endDateStr =
          query.endDate.length === 10
            ? `${query.endDate}T23:59:59.999Z`
            : query.endDate;
        const end = new Date(endDateStr);
        if (movement.startedAt.getTime() > end.getTime()) {
          return false;
        }
      }

      return true;
    });

    movements.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const filenamePrefix = query.ra
      ? `relatorio-aluno-${query.ra}`
      : 'relatorio-movimentacoes';

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

    const reportRows = movements.map(mapMovementToRowData);
    const stats = computeReportStats(movements);

    if (format === 'xlsx') {
      const excelBuffer = await renderExcelWorkbook({
        subtitle,
        emissionDate,
        filtersSummary,
        rows: reportRows,
        now,
      });

      return {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${filenamePrefix}-${dateStamp}.xlsx`,
        content: excelBuffer,
      };
    }

    if (format === 'csv') {
      const csvContent = renderCsvText(reportRows);
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `${filenamePrefix}-${dateStamp}.csv`,
        content: csvContent,
      };
    }

    const pdfBuffer = await renderPdfBuffer({
      subtitle,
      emissionDate,
      filtersSummary,
      stats,
      rows: reportRows,
    });

    return {
      contentType: 'application/pdf',
      filename: `${filenamePrefix}-${dateStamp}.pdf`,
      content: pdfBuffer,
    };
  }
}

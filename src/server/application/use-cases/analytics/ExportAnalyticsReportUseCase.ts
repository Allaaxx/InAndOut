import { pdf } from '@react-pdf/renderer';
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

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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

    const completedMovements = movements.filter(
      (m) => m.durationMinutes !== undefined,
    );
    const averageDurationMinutes =
      completedMovements.length > 0
        ? Math.round(
            completedMovements.reduce(
              (acc, m) => acc + (m.durationMinutes ?? 0),
              0,
            ) / completedMovements.length,
          )
        : 0;

    const attendanceMovements = movements.filter(
      (m) => m.attendancePercentage !== undefined,
    );
    const averageAttendancePercentage =
      attendanceMovements.length > 0
        ? Math.round(
            attendanceMovements.reduce(
              (acc, m) => acc + (m.attendancePercentage ?? 0),
              0,
            ) / attendanceMovements.length,
          )
        : 100;

    const escalatedCount = movements.filter(
      (m) =>
        m.status === MovementStatus.ESCALATED_TO_COORDINATION ||
        m.status === MovementStatus.IN_TRANSIT_UNRESOLVED ||
        m.status === MovementStatus.RESOLVED,
    ).length;

    const stats: MovementReportSummaryStats = {
      totalMovements: movements.length,
      averageDurationMinutes,
      averageAttendancePercentage,
      escalatedCount,
    };

    // Format 1: XLSX (Excel nativo estruturado)
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'InAndOut';
      workbook.title = 'Relatório de Movimentações';
      workbook.created = now;

      const worksheet = workbook.addWorksheet('Movimentações', {
        views: [{ state: 'frozen', ySplit: 6 }],
      });

      // Top metadata rows
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
      subtitleCell.value = subtitle;
      subtitleCell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FF334155' },
      };

      worksheet.mergeCells('A3:L3');
      const metaCell = worksheet.getCell('A3');
      metaCell.value = `Emissão: ${emissionDate}   |   Total de registros: ${movements.length}   |   Presença Média: ${averageAttendancePercentage}%`;
      metaCell.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };

      worksheet.mergeCells('A4:L4');
      const filterCell = worksheet.getCell('A4');
      filterCell.value = `Filtros: ${filtersSummary}`;
      filterCell.font = {
        name: 'Calibri',
        size: 9,
        italic: true,
        color: { argb: 'FF475569' },
      };

      // Row 5 is blank spacer

      // Row 6: Table Headers
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

      // Data rows starting at row 7
      movements.forEach((m, idx) => {
        const rowNumber = 7 + idx;
        const row = worksheet.getRow(rowNumber);
        const exitDate = m.startedAt.toISOString().slice(0, 10);
        const exitTime = m.startedAt.toISOString().slice(11, 16);
        const returnTime = m.endedAt
          ? m.endedAt.toISOString().slice(11, 16)
          : '-';
        const duration =
          m.durationMinutes !== undefined ? m.durationMinutes : '-';
        const outcome = m.outcome ?? '-';
        const attendance =
          m.attendancePercentage !== undefined
            ? `${m.attendancePercentage}%`
            : '-';

        row.values = [
          exitDate,
          exitTime,
          returnTime,
          m.studentRa,
          m.studentFullName,
          m.classCode,
          m.subject,
          duration,
          m.allowedLimitMinutes,
          m.status,
          outcome,
          attendance,
        ];
        row.height = 20;

        const isEven = idx % 2 === 1;
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 9.5 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' },
          };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };

          // Alignment adjustments based on column
          if (colNumber === 5 || colNumber === 7) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        });
      });

      // Auto-filter on columns A6:L6
      worksheet.autoFilter = 'A6:L6';

      // Column widths
      worksheet.columns = [
        { width: 14 }, // Data Saída
        { width: 12 }, // Hora Saída
        { width: 13 }, // Hora Retorno
        { width: 12 }, // RA
        { width: 32 }, // Aluno
        { width: 10 }, // Turma
        { width: 22 }, // Disciplina
        { width: 15 }, // Duração (min)
        { width: 13 }, // Limite (min)
        { width: 22 }, // Status
        { width: 22 }, // Desfecho
        { width: 14 }, // % Presença
      ];

      const excelBuffer = await workbook.xlsx.writeBuffer();

      return {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${filenamePrefix}-${dateStamp}.xlsx`,
        content: Buffer.from(excelBuffer),
      };
    }

    // Format 2: CSV corrigido (UTF-8 BOM + separador ponto-e-vírgula para Excel pt-BR)
    if (format === 'csv') {
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

      const rows = movements.map((m) => {
        const exitDate = m.startedAt.toISOString().slice(0, 10);
        const exitTime = m.startedAt.toISOString().slice(11, 16);
        const returnTime = m.endedAt
          ? m.endedAt.toISOString().slice(11, 16)
          : '-';
        const duration =
          m.durationMinutes !== undefined ? String(m.durationMinutes) : '-';
        const attendance =
          m.attendancePercentage !== undefined
            ? `${m.attendancePercentage}%`
            : '-';
        const outcome = m.outcome ?? '-';

        return [
          exitDate,
          exitTime,
          returnTime,
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

      const csvContent =
        '\uFEFF' +
        [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `${filenamePrefix}-${dateStamp}.csv`,
        content: csvContent,
      };
    }

    // Format 3: PDF declarativo via @react-pdf/renderer
    const movementsRows: MovementReportPdfRow[] = movements.map((m) => ({
      id: m.id,
      date: m.startedAt.toISOString().slice(0, 10),
      exitTime: m.startedAt.toISOString().slice(11, 16),
      returnTime: m.endedAt ? m.endedAt.toISOString().slice(11, 16) : '-',
      studentRa: m.studentRa,
      studentFullName: m.studentFullName,
      classCode: m.classCode,
      subject: m.subject,
      duration:
        m.durationMinutes !== undefined ? `${m.durationMinutes} min` : '-',
      allowedLimit: `${m.allowedLimitMinutes} min`,
      status: m.status,
      outcome: m.outcome ?? '-',
      attendance:
        m.attendancePercentage !== undefined
          ? `${m.attendancePercentage}%`
          : '-',
    }));

    const pdfDoc = React.createElement(MovementReportPdfDocument, {
      title: 'Escola Estadual José Lins do Rego — InAndOut',
      subtitle,
      emissionDate,
      filtersSummary,
      stats,
      movements: movementsRows,
    });

    const stream = await pdf(pdfDoc).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return {
      contentType: 'application/pdf',
      filename: `${filenamePrefix}-${dateStamp}.pdf`,
      content: pdfBuffer,
    };
  }
}

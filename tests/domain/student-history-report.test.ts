import {
  ExportAnalyticsReportUseCase,
  InvalidExportFormatError,
} from '@server/application/use-cases/analytics/ExportAnalyticsReportUseCase';
import {
  GetStudentHistoryReportUseCase,
  StudentNotFoundError,
} from '@server/application/use-cases/analytics/GetStudentHistoryReportUseCase';
import { MovementRecord } from '@server/domain/entities/MovementRecord';
import { Student } from '@server/domain/entities/Student';
import { InMemoryMovementRecordRepository } from '@server/infrastructure/repositories/InMemoryMovementRecordRepository';
import { InMemoryStudentRepository } from '@server/infrastructure/repositories/InMemoryStudentRepository';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Domain Seam: Student History Report & Export Use Cases', () => {
  let studentRepo: InMemoryStudentRepository;
  let movementRepo: InMemoryMovementRecordRepository;
  const fixedClock = new Date('2026-03-10T14:00:00.000Z');

  beforeEach(async () => {
    studentRepo = new InMemoryStudentRepository(false);
    movementRepo = new InMemoryMovementRecordRepository();

    // Seed test students
    await studentRepo.save(
      Student.create({
        id: 'std-1001',
        ra: '1001',
        fullName: 'Lucas Silva Pereira',
        classCode: '1A',
      }),
    );

    await studentRepo.save(
      Student.create({
        id: 'std-1002',
        ra: '1002',
        fullName: 'Mariana Lima Rocha',
        classCode: '1A',
      }),
    );
  });

  describe('GetStudentHistoryReportUseCase', () => {
    it('queries student by RA and calculates departure counts, outside minutes, average duration, attended minutes, and attendance percentage', async () => {
      const useCase = new GetStudentHistoryReportUseCase(
        studentRepo,
        movementRepo,
        { clock: () => fixedClock },
      );

      // Exit 1: 5 minutes out of 50m session -> 45m attended (90%)
      const mov1 = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: 'std-1001',
        studentRa: '1001',
        studentFullName: 'Lucas Silva Pereira',
        classCode: '1A',
        subject: 'Matemática',
        allowedLimitMinutes: 10,
        startedAt: new Date('2026-03-10T08:00:00.000Z'),
      });
      mov1.registerReturn(new Date('2026-03-10T08:05:00.000Z'), 50);
      await movementRepo.save(mov1);

      // Exit 2: 15 minutes out of 50m session -> 35m attended (70%)
      const mov2 = MovementRecord.create({
        sessionId: 'sess-2',
        studentId: 'std-1001',
        studentRa: '1001',
        studentFullName: 'Lucas Silva Pereira',
        classCode: '1A',
        subject: 'Física',
        allowedLimitMinutes: 10,
        startedAt: new Date('2026-03-10T10:00:00.000Z'),
      });
      mov2.registerReturn(new Date('2026-03-10T10:15:00.000Z'), 50);
      await movementRepo.save(mov2);

      const report = await useCase.execute({ ra: '1001' });

      // Student info
      expect(report.student.ra).toBe('1001');
      expect(report.student.fullName).toBe('Lucas Silva Pereira');
      expect(report.student.classCode).toBe('1A');

      // Summary metrics
      expect(report.summary.totalDepartures).toBe(2);
      expect(report.summary.totalExits).toBe(2);
      expect(report.summary.totalMinutesOutside).toBe(20);
      expect(report.summary.totalAbsentMinutes).toBe(20);
      expect(report.summary.averageDurationPerExit).toBe(10);
      expect(report.summary.averageDurationMinutes).toBe(10);
      expect(report.summary.attendedMinutes).toBe(80);
      // (80 attended out of 100 planned) = 80%
      expect(report.summary.attendancePercentage).toBe(80);
      expect(report.summary.effectiveAttendancePercentage).toBe(80);

      // History movements
      expect(report.history).toHaveLength(2);
      expect(report.history[0].studentRa).toBe('1001');
    });

    it('throws StudentNotFoundError if the RA is not registered', async () => {
      const useCase = new GetStudentHistoryReportUseCase(
        studentRepo,
        movementRepo,
        { clock: () => fixedClock },
      );

      await expect(useCase.execute({ ra: '9999' })).rejects.toThrow(
        StudentNotFoundError,
      );
    });

    it('returns 100% attendance and zero departures for student without movements', async () => {
      const useCase = new GetStudentHistoryReportUseCase(
        studentRepo,
        movementRepo,
        { clock: () => fixedClock },
      );

      const report = await useCase.execute({ ra: '1002' });

      expect(report.student.ra).toBe('1002');
      expect(report.summary.totalExits).toBe(0);
      expect(report.summary.totalMinutesOutside).toBe(0);
      expect(report.summary.averageDurationPerExit).toBe(0);
      expect(report.summary.attendedMinutes).toBe(0);
      expect(report.summary.attendancePercentage).toBe(100);
      expect(report.history).toHaveLength(0);
    });

    it('filters student history by startDate and endDate', async () => {
      const useCase = new GetStudentHistoryReportUseCase(
        studentRepo,
        movementRepo,
        { clock: () => fixedClock },
      );

      // Day 1
      const mov1 = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: 'std-1001',
        studentRa: '1001',
        studentFullName: 'Lucas Silva Pereira',
        classCode: '1A',
        subject: 'Matemática',
        startedAt: new Date('2026-03-01T08:00:00.000Z'),
      });
      mov1.registerReturn(new Date('2026-03-01T08:06:00.000Z'), 50);
      await movementRepo.save(mov1);

      // Day 2
      const mov2 = MovementRecord.create({
        sessionId: 'sess-2',
        studentId: 'std-1001',
        studentRa: '1001',
        studentFullName: 'Lucas Silva Pereira',
        classCode: '1A',
        subject: 'História',
        startedAt: new Date('2026-03-05T09:00:00.000Z'),
      });
      mov2.registerReturn(new Date('2026-03-05T09:08:00.000Z'), 50);
      await movementRepo.save(mov2);

      // Day 3
      const mov3 = MovementRecord.create({
        sessionId: 'sess-3',
        studentId: 'std-1001',
        studentRa: '1001',
        studentFullName: 'Lucas Silva Pereira',
        classCode: '1A',
        subject: 'Física',
        startedAt: new Date('2026-03-10T10:00:00.000Z'),
      });
      mov3.registerReturn(new Date('2026-03-10T10:10:00.000Z'), 50);
      await movementRepo.save(mov3);

      // Query only 2026-03-04 to 2026-03-08
      const filtered = await useCase.execute({
        ra: '1001',
        startDate: '2026-03-04',
        endDate: '2026-03-08',
      });

      expect(filtered.history).toHaveLength(1);
      expect(filtered.history[0].subject).toBe('História');
      expect(filtered.summary.totalExits).toBe(1);
      expect(filtered.summary.totalMinutesOutside).toBe(8);
    });
  });

  describe('ExportAnalyticsReportUseCase', () => {
    it('generates a formatted CSV file with headers and movement records', async () => {
      const useCase = new ExportAnalyticsReportUseCase(
        movementRepo,
        studentRepo,
        { clock: () => fixedClock },
      );

      const mov1 = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: 'std-1001',
        studentRa: '1001',
        studentFullName: 'Lucas Silva Pereira',
        classCode: '1A',
        subject: 'Matemática',
        allowedLimitMinutes: 10,
        startedAt: new Date('2026-03-10T08:00:00.000Z'),
      });
      mov1.registerReturn(new Date('2026-03-10T08:05:00.000Z'), 50);
      await movementRepo.save(mov1);

      const result = await useCase.execute({ format: 'csv' });

      expect(result.contentType).toContain('text/csv');
      expect(result.filename).toMatch(/\.csv$/);
      expect(typeof result.content).toBe('string');

      const csvText = result.content as string;
      expect(csvText).toContain('Data Saída');
      expect(csvText).toContain('RA');
      expect(csvText).toContain('Aluno');
      expect(csvText).toContain('Lucas Silva Pereira');
      expect(csvText).toContain('1001');
      expect(csvText).toContain('Matemática');
      expect(csvText).toContain('RETURNED_NORMAL');
    });

    it('generates a valid structured Excel (.xlsx) file with worksheets and metadata', async () => {
      const useCase = new ExportAnalyticsReportUseCase(
        movementRepo,
        studentRepo,
        { clock: () => fixedClock },
      );

      const mov1 = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: 'std-1001',
        studentRa: '1001',
        studentFullName: 'Lucas Silva Pereira',
        classCode: '1A',
        subject: 'Matemática',
        allowedLimitMinutes: 10,
        startedAt: new Date('2026-03-10T08:00:00.000Z'),
      });
      mov1.registerReturn(new Date('2026-03-10T08:05:00.000Z'), 50);
      await movementRepo.save(mov1);

      const result = await useCase.execute({ format: 'xlsx', classCode: '1A' });

      expect(result.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(result.filename).toMatch(/\.xlsx$/);
      expect(Buffer.isBuffer(result.content)).toBe(true);

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(
        result.content as unknown as import('exceljs').Buffer,
      );

      const worksheet = workbook.getWorksheet('Movimentações');
      expect(worksheet).toBeDefined();
      expect(worksheet?.getCell('A1').value).toContain('InAndOut');
      expect(worksheet?.getRow(6).getCell(1).value).toBe('Data Saída');
      expect(worksheet?.getRow(6).getCell(5).value).toBe('Aluno');
      expect(worksheet?.getRow(7).getCell(4).value).toBe('1001');
      expect(worksheet?.getRow(7).getCell(5).value).toBe('Lucas Silva Pereira');
    });

    it('generates a valid PDF document payload beginning with %PDF- header', async () => {
      const useCase = new ExportAnalyticsReportUseCase(
        movementRepo,
        studentRepo,
        { clock: () => fixedClock },
      );

      const mov1 = MovementRecord.create({
        sessionId: 'sess-1',
        studentId: 'std-1001',
        studentRa: '1001',
        studentFullName: 'Lucas Silva Pereira',
        classCode: '1A',
        subject: 'Matemática',
        allowedLimitMinutes: 10,
        startedAt: new Date('2026-03-10T08:00:00.000Z'),
      });
      mov1.registerReturn(new Date('2026-03-10T08:05:00.000Z'), 50);
      await movementRepo.save(mov1);

      const result = await useCase.execute({
        format: 'pdf',
        ra: '1001',
      });

      expect(result.contentType).toBe('application/pdf');
      expect(result.filename).toMatch(/\.pdf$/);

      const buffer = Buffer.isBuffer(result.content)
        ? result.content
        : Buffer.from(result.content);
      const header = buffer.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
      const tail = buffer.toString('utf-8');
      expect(tail).toContain('%%EOF');
    });

    it('throws InvalidExportFormatError if an unsupported format is requested', async () => {
      const useCase = new ExportAnalyticsReportUseCase(
        movementRepo,
        studentRepo,
        { clock: () => fixedClock },
      );

      await expect(
        useCase.execute({ format: 'docx' as unknown as 'csv' }),
      ).rejects.toThrow(InvalidExportFormatError);
    });
  });
});

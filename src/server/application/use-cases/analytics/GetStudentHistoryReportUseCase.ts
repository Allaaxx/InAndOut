import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IStudentRepository } from '@server/domain/repositories/IStudentRepository';
import type {
  StudentHistoryQueryDTO,
  StudentHistoryReportDTO,
  StudentHistorySummaryDTO,
} from '@shared/dtos';
import {
  getEndOfDayInAppTimezone,
  getStartOfDayInAppTimezone,
} from '@shared/timezone';

export class StudentNotFoundError extends Error {
  constructor(ra: string) {
    super(`Aluno com RA "${ra}" não encontrado.`);
    this.name = 'StudentNotFoundError';
  }
}

export interface GetStudentHistoryReportInput extends StudentHistoryQueryDTO {
  ra: string;
}

export interface GetStudentHistoryReportOptions {
  clock?: () => Date;
}

export class GetStudentHistoryReportUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly studentRepo: IStudentRepository,
    private readonly movementRepo: IMovementRecordRepository,
    options: GetStudentHistoryReportOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: GetStudentHistoryReportInput,
  ): Promise<StudentHistoryReportDTO> {
    const ra = (
      input.ra ??
      (input as unknown as { studentRa?: string }).studentRa ??
      ''
    ).trim();
    if (!ra) {
      throw new Error('O RA do estudante é obrigatório.');
    }

    const student = await this.studentRepo.findByRa(ra);
    if (!student) {
      throw new StudentNotFoundError(ra);
    }

    const allMovements = await this.movementRepo.findByStudentRa(ra);

    // Filter by startDate and endDate if provided
    const filteredMovements = allMovements.filter((m) => {
      if (input.startDate) {
        const start = getStartOfDayInAppTimezone(input.startDate);
        if (m.startedAt.getTime() < start.getTime()) {
          return false;
        }
      }

      if (input.endDate) {
        const end = getEndOfDayInAppTimezone(input.endDate);
        if (m.startedAt.getTime() > end.getTime()) {
          return false;
        }
      }

      return true;
    });

    // Sort newest first
    filteredMovements.sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );

    const completedMovements = filteredMovements.filter(
      (m) => typeof m.durationMinutes === 'number',
    );

    const totalExits = filteredMovements.length;
    const totalAbsentMinutes =
      completedMovements.length > 0
        ? Math.round(
            completedMovements.reduce(
              (sum, m) => sum + (m.durationMinutes ?? 0),
              0,
            ) * 10,
          ) / 10
        : 0;

    const averageDurationMinutes =
      completedMovements.length > 0
        ? Math.round((totalAbsentMinutes / completedMovements.length) * 10) / 10
        : 0;

    const attendedMinutes =
      completedMovements.length > 0
        ? Math.round(
            completedMovements.reduce(
              (sum, m) => sum + (m.attendedMinutes ?? 0),
              0,
            ) * 10,
          ) / 10
        : 0;

    // Total planned session duration across the completed exits (default 50 minutes each)
    const totalPlannedMinutes =
      completedMovements.length > 0
        ? completedMovements.reduce(
            (sum, m) =>
              sum +
              Math.max(50, (m.durationMinutes ?? 0) + (m.attendedMinutes ?? 0)),
            0,
          )
        : 0;

    const rawAttendancePercentage =
      completedMovements.length > 0
        ? totalPlannedMinutes > 0
          ? Math.round((attendedMinutes / totalPlannedMinutes) * 10000) / 100
          : 100
        : 100;

    const attendancePercentage = Math.max(
      0,
      Math.min(100, rawAttendancePercentage),
    );

    const summary: StudentHistorySummaryDTO = {
      totalExits,
      totalDepartures: totalExits,
      totalAbsentMinutes,
      totalMinutesOutside: totalAbsentMinutes,
      averageDurationMinutes,
      averageDurationPerExit: averageDurationMinutes,
      attendedMinutes,
      attendancePercentage,
      effectiveAttendancePercentage: attendancePercentage,
    };

    const now = this.clock();

    return {
      student: {
        id: student.id,
        ra: student.ra,
        fullName: student.fullName,
        name: student.fullName,
        classCode: student.classCode,
        specialTimeLimitMinutes: student.specialTimeLimitMinutes,
      },
      summary,
      history: filteredMovements.map((m) => m.toDTO(now)),
    };
  }
}

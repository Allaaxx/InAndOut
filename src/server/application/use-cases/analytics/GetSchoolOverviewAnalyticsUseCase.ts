import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type {
  ClassComparisonItemDTO,
  HourlyDistributionItemDTO,
  OutcomeDistributionItemDTO,
  SchoolOverviewAnalyticsDTO,
  SchoolOverviewQueryDTO,
  SchoolOverviewStatsDTO,
} from '@shared/dtos';
import { IncidentOutcome, MovementStatus } from '@shared/enums';

export interface GetSchoolOverviewAnalyticsOptions {
  clock?: () => Date;
}

export class GetSchoolOverviewAnalyticsUseCase {
  private readonly clock: () => Date;

  constructor(
    private readonly movementRepo: IMovementRecordRepository,
    options: GetSchoolOverviewAnalyticsOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    query: SchoolOverviewQueryDTO = {},
  ): Promise<SchoolOverviewAnalyticsDTO> {
    const allMovements = await this.movementRepo.findAll();
    const now = this.clock();

    // 1. Filtering
    const filteredMovements = allMovements.filter((m) => {
      // Date filter
      if (query.date) {
        const isoDate = m.startedAt.toISOString().slice(0, 10);
        if (isoDate !== query.date) {
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

      // Class filter
      if (query.classCode && query.classCode !== 'TODOS') {
        if (m.classCode !== query.classCode) {
          return false;
        }
      }

      // Grade filter
      if (query.grade && query.grade !== 'TODOS') {
        if (!m.classCode.startsWith(query.grade)) {
          return false;
        }
      }

      return true;
    });

    // 2. Stat Cards
    const completedMovements = filteredMovements.filter(
      (m) => typeof m.durationMinutes === 'number',
    );

    const averageOutsideMinutes =
      completedMovements.length > 0
        ? Math.round(
            (completedMovements.reduce(
              (sum, m) => sum + (m.durationMinutes ?? 0),
              0,
            ) /
              completedMovements.length) *
              10,
          ) / 10
        : 0;

    const todayStr = query.date ?? now.toISOString().slice(0, 10);
    const totalExitsToday = filteredMovements.filter(
      (m) => m.startedAt.toISOString().slice(0, 10) === todayStr,
    ).length;

    const compliantMovements = completedMovements.filter(
      (m) => (m.durationMinutes ?? 0) <= m.allowedLimitMinutes,
    );
    const complianceRate =
      completedMovements.length > 0
        ? Math.round(
            (compliantMovements.length / completedMovements.length) * 1000,
          ) / 10
        : 100;

    const activeIncidentsCount = filteredMovements.filter(
      (m) =>
        m.status === MovementStatus.OVERDUE ||
        m.status === MovementStatus.ESCALATED_TO_COORDINATION ||
        m.status === MovementStatus.IN_TRANSIT_UNRESOLVED,
    ).length;

    const stats: SchoolOverviewStatsDTO = {
      averageOutsideMinutes,
      averageAbsentMinutes: averageOutsideMinutes,
      totalExitsToday,
      complianceRate,
      activeIncidentsCount,
      activeIncidents: activeIncidentsCount,
    };

    // 3. Hourly Distribution (Hours 07h00 to 18h00 + any active hours)
    const hourCounts = new Map<number, number>();
    for (let h = 7; h <= 18; h++) {
      hourCounts.set(h, 0);
    }

    for (const m of filteredMovements) {
      const isoHour = parseInt(m.startedAt.toISOString().slice(11, 13), 10);
      hourCounts.set(isoHour, (hourCounts.get(isoHour) ?? 0) + 1);
    }

    const sortedHours = Array.from(hourCounts.keys()).sort((a, b) => a - b);
    const hourlyDistribution: HourlyDistributionItemDTO[] = sortedHours.map(
      (h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        count: hourCounts.get(h) ?? 0,
      }),
    );

    // 4. Outcome Distribution
    let returnedCount = 0;
    let infirmaryCount = 0;
    let coordinationCount = 0;
    let evasionCount = 0;

    for (const m of filteredMovements) {
      if (
        m.status === MovementStatus.RETURNED_NORMAL ||
        m.outcome === IncidentOutcome.RETURNED_TO_CLASS
      ) {
        returnedCount++;
      } else if (m.outcome === IncidentOutcome.SENT_TO_INFIRMARY) {
        infirmaryCount++;
      } else if (
        m.outcome === IncidentOutcome.ATTENDED_AT_COORDINATION ||
        m.outcome === IncidentOutcome.HANDLED_AT_COORDINATION
      ) {
        coordinationCount++;
      } else if (m.outcome === IncidentOutcome.EVASION) {
        evasionCount++;
      }
    }

    const totalOutcomes =
      returnedCount + infirmaryCount + coordinationCount + evasionCount;

    const calcPercentage = (count: number): number =>
      totalOutcomes > 0 ? Math.round((count / totalOutcomes) * 1000) / 10 : 0;

    const outcomeDistribution: OutcomeDistributionItemDTO[] = [
      {
        outcome: 'RETURNED_NORMAL',
        label: 'Retorno normal',
        count: returnedCount,
        percentage: calcPercentage(returnedCount),
      },
      {
        outcome: IncidentOutcome.SENT_TO_INFIRMARY,
        label: 'Enfermaria',
        count: infirmaryCount,
        percentage: calcPercentage(infirmaryCount),
      },
      {
        outcome: IncidentOutcome.ATTENDED_AT_COORDINATION,
        label: 'Atendimento na Coordenação',
        count: coordinationCount,
        percentage: calcPercentage(coordinationCount),
      },
      {
        outcome: IncidentOutcome.EVASION,
        label: 'Evasão',
        count: evasionCount,
        percentage: calcPercentage(evasionCount),
      },
    ];

    // 5. Class Comparison
    const classGroups = new Map<
      string,
      { totalExits: number; outsideMinutes: number; completedCount: number }
    >();

    for (const m of filteredMovements) {
      const code = m.classCode || 'Outros';
      const existing = classGroups.get(code) ?? {
        totalExits: 0,
        outsideMinutes: 0,
        completedCount: 0,
      };
      existing.totalExits += 1;
      if (typeof m.durationMinutes === 'number') {
        existing.outsideMinutes += m.durationMinutes;
        existing.completedCount += 1;
      }
      classGroups.set(code, existing);
    }

    const classComparison: ClassComparisonItemDTO[] = Array.from(
      classGroups.entries(),
    )
      .map(([classCode, data]) => ({
        classCode,
        totalExits: data.totalExits,
        totalOutsideMinutes: Math.round(data.outsideMinutes * 10) / 10,
        averageOutsideMinutes:
          data.completedCount > 0
            ? Math.round((data.outsideMinutes / data.completedCount) * 10) / 10
            : 0,
      }))
      .sort((a, b) => a.classCode.localeCompare(b.classCode));

    return {
      stats,
      hourlyDistribution,
      peakHours: hourlyDistribution,
      outcomeDistribution,
      outcomesDistribution: outcomeDistribution,
      classComparison,
    };
  }
}

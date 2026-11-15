import { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import { MovementDTO } from '@shared/dtos';
import { MovementStatus } from '@shared/enums';

export interface GetActiveMovementsOverviewInput {
  classCode?: string;
  status?: MovementStatus;
}

export interface GetActiveMovementsOverviewOutput {
  movements: MovementDTO[];
}

export class GetActiveMovementsOverviewUseCase {
  private readonly movementRepo: IMovementRecordRepository;
  private readonly clock: () => Date;

  constructor(
    movementRepo: IMovementRecordRepository,
    options: {
      clock?: () => Date;
    } = {}
  ) {
    this.movementRepo = movementRepo;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: GetActiveMovementsOverviewInput = {}
  ): Promise<GetActiveMovementsOverviewOutput> {
    const allRecords = await this.movementRepo.findAll();
    const now = this.clock();

    const normalizedClassCode = input.classCode?.trim().toLowerCase();

    const filtered = allRecords.filter((record) => {
      // Status filter
      if (input.status) {
        if (record.status !== input.status) {
          return false;
        }
      } else {
        // By default, list active or in-transit unresolved movements
        const isEligible =
          record.isActive() ||
          record.status === MovementStatus.IN_TRANSIT_UNRESOLVED;
        if (!isEligible) {
          return false;
        }
      }

      // Class code filter
      if (normalizedClassCode) {
        if (record.classCode.trim().toLowerCase() !== normalizedClassCode) {
          return false;
        }
      }

      return true;
    });

    // Sort priority: ESCALATED_TO_COORDINATION, OVERDUE, IN_TRANSIT_UNRESOLVED, IN_TRANSIT
    // Within same category, startedAt desc
    const statusPriority: Record<MovementStatus, number> = {
      [MovementStatus.ESCALATED_TO_COORDINATION]: 1,
      [MovementStatus.OVERDUE]: 2,
      [MovementStatus.IN_TRANSIT_UNRESOLVED]: 3,
      [MovementStatus.IN_TRANSIT]: 4,
      [MovementStatus.REQUESTED]: 5,
      [MovementStatus.WAITING_QUEUE]: 6,
      [MovementStatus.RETURNED_NORMAL]: 7,
      [MovementStatus.RESOLVED]: 8,
    };

    filtered.sort((a, b) => {
      const pA = statusPriority[a.status] ?? 99;
      const pB = statusPriority[b.status] ?? 99;
      if (pA !== pB) {
        return pA - pB;
      }
      return b.startedAt.getTime() - a.startedAt.getTime();
    });

    return {
      movements: filtered.map((m) => m.toDTO(now)),
    };
  }
}

import type { IClassSessionRepository } from '@server/domain/repositories/IClassSessionRepository';
import type { IMovementRecordRepository } from '@server/domain/repositories/IMovementRecordRepository';
import type { IRoomRepository } from '@server/domain/repositories/IRoomRepository';
import type { ActiveRoomSessionSummaryDTO, MovementDTO } from '@shared/dtos';
import { MovementStatus } from '@shared/enums';
import { normalizeRoomCode } from '@shared/roomCode';

export interface GetActiveMovementsOverviewInput {
  classCode?: string;
  roomId?: string;
  status?: MovementStatus;
}

export interface GetActiveMovementsOverviewOutput {
  movements: MovementDTO[];
  activeRooms: ActiveRoomSessionSummaryDTO[];
}

export class GetActiveMovementsOverviewUseCase {
  private readonly movementRepo: IMovementRecordRepository;
  private readonly sessionRepo?: IClassSessionRepository;
  private readonly roomRepo?: IRoomRepository;
  private readonly clock: () => Date;

  constructor(
    movementRepo: IMovementRecordRepository,
    options: {
      clock?: () => Date;
      sessionRepo?: IClassSessionRepository;
      roomRepo?: IRoomRepository;
    } = {},
  ) {
    this.movementRepo = movementRepo;
    this.sessionRepo = options.sessionRepo;
    this.roomRepo = options.roomRepo;
    this.clock = options.clock ?? (() => new Date());
  }

  public async execute(
    input: GetActiveMovementsOverviewInput = {},
  ): Promise<GetActiveMovementsOverviewOutput> {
    const allRecords = await this.movementRepo.findAll();
    const now = this.clock();

    const normalizedClassCode = input.classCode?.trim().toLowerCase();
    const normalizedRoomId = input.roomId
      ? normalizeRoomCode(input.roomId)
      : undefined;

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

      // Room filter
      if (normalizedRoomId) {
        if (normalizeRoomCode(record.roomId ?? '') !== normalizedRoomId) {
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

    const activeRooms = await this.buildActiveRoomsSummary(allRecords);

    return {
      movements: filtered.map((m) => m.toDTO(now)),
      activeRooms,
    };
  }

  private async buildActiveRoomsSummary(
    allRecords: Awaited<ReturnType<IMovementRecordRepository['findAll']>>,
  ): Promise<ActiveRoomSessionSummaryDTO[]> {
    if (!this.sessionRepo) {
      return [];
    }

    const [activeSessions, rooms] = await Promise.all([
      this.sessionRepo.findAllActive(),
      this.roomRepo ? this.roomRepo.findAll() : Promise.resolve([]),
    ]);

    const roomNameByCode = new Map(
      rooms.map((room) => [normalizeRoomCode(room.code), room.name]),
    );

    return activeSessions
      .map((session) => {
        const sessionActiveMovements = allRecords.filter(
          (record) => record.sessionId === session.id && record.isActive(),
        );
        const normalizedCode = normalizeRoomCode(session.roomId);

        return {
          sessionId: session.id,
          roomId: session.roomId,
          roomName: roomNameByCode.get(normalizedCode) ?? session.roomId,
          teacherId: session.teacherId,
          teacherName: session.teacherName,
          classCode: session.classCode,
          subject: session.subject,
          startedAt: session.startedAt.toISOString(),
          activeExitCount: sessionActiveMovements.length,
          hasOverdue: sessionActiveMovements.some(
            (record) => record.status === MovementStatus.OVERDUE,
          ),
          hasEscalated: sessionActiveMovements.some(
            (record) =>
              record.status === MovementStatus.ESCALATED_TO_COORDINATION,
          ),
        };
      })
      .sort((a, b) => a.roomId.localeCompare(b.roomId));
  }
}

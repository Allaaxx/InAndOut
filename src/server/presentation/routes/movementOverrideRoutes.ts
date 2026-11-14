import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppContainer } from '@server/main/container';
import {
  AuthorizeEmergencyExitUseCase,
  AuthorizeGuestExitUseCase,
  MovementAuthorizationError,
} from '@server/application/use-cases/movements/EmergencyAndGuestExitUseCases';
import {
  MovementConcurrencyConflictError,
  MovementNotFoundError,
  MovementValidationError,
  StudentNotInClassError,
} from '@server/application/use-cases/movements/RequestStudentExitUseCase';
import { extractBearerToken } from '@server/presentation/middlewares/authMiddleware';
import {
  EmergencyExitRequestDTO,
  GuestExitRequestDTO,
} from '@shared/dtos';
import { UserRole } from '@shared/enums';

interface OverrideAuthFields {
  pin?: string;
  teacherId?: string;
  sessionId?: string;
  roomId?: string;
}

export async function registerMovementOverrideRoutes(
  app: FastifyInstance,
  container: AppContainer
): Promise<void> {
  const authorizeEmergencyExitUseCase = new AuthorizeEmergencyExitUseCase(
    container.sessionRepo,
    container.studentRepo,
    container.movementRepo,
    container.notificationSender,
    { clock: container.clock }
  );

  const authorizeGuestExitUseCase = new AuthorizeGuestExitUseCase(
    container.sessionRepo,
    container.studentRepo,
    container.movementRepo,
    container.notificationSender,
    { clock: container.clock }
  );

  async function resolveAuthorizedTeacherId(
    request: FastifyRequest<{ Body?: OverrideAuthFields }>,
    reply: FastifyReply
  ): Promise<string | null> {
    const token = extractBearerToken(request);
    const body = request.body ?? {};

    if (token) {
      try {
        const payload = container.tokenService.verifyAccessToken(token);
        const allowedRoles = [
          UserRole.TEACHER,
          UserRole.COORDINATOR,
          UserRole.ADMIN,
        ];
        if (!allowedRoles.includes(payload.role)) {
          reply.status(403).send({
            error:
              'Acesso negado: apenas professores ou coordenadores podem autorizar liberações especiais.',
          });
          return null;
        }

        if (body.pin !== undefined) {
          const user = await container.userRepo.findById(payload.sub);
          if (!user || !user.verifyPin(body.pin)) {
            reply.status(401).send({
              error: 'PIN do professor inválido.',
            });
            return null;
          }
        }

        return payload.sub;
      } catch (err) {
        reply.status(401).send({
          error:
            err instanceof Error
              ? err.message
              : 'Token de autenticação inválido ou expirado.',
        });
        return null;
      }
    }

    if (body.pin) {
      let targetTeacherId = body.teacherId;
      if (!targetTeacherId) {
        const session = body.sessionId
          ? await container.sessionRepo.findById(body.sessionId)
          : await container.sessionRepo.findActiveByRoomId(
              body.roomId ?? 'SALA-01'
            );
        targetTeacherId = session?.teacherId ?? 'teacher-1';
      }

      const user = await container.userRepo.findById(targetTeacherId);
      if (user && user.verifyPin(body.pin)) {
        return user.id;
      }

      reply.status(401).send({
        error: 'PIN de autorização do professor inválido.',
      });
      return null;
    }

    reply.status(401).send({
      error:
        'Autorização do professor é obrigatória para realizar esta operação.',
    });
    return null;
  }

  function handleOverrideError(err: unknown, reply: FastifyReply) {
    if (err instanceof MovementValidationError) {
      return reply.status(400).send({ error: err.message });
    }
    if (err instanceof MovementAuthorizationError) {
      return reply.status(401).send({ error: err.message });
    }
    if (err instanceof StudentNotInClassError) {
      return reply.status(403).send({ error: err.message });
    }
    if (err instanceof MovementNotFoundError) {
      return reply.status(404).send({ error: err.message });
    }
    if (err instanceof MovementConcurrencyConflictError) {
      return reply.status(409).send({ error: err.message });
    }
    return reply.status(500).send({
      error:
        err instanceof Error
          ? err.message
          : 'Erro interno ao processar autorização do professor.',
    });
  }

  app.post<{ Body: EmergencyExitRequestDTO & OverrideAuthFields }>(
    '/movements/emergency',
    async (request, reply) => {
      const authorizedByTeacherId = await resolveAuthorizedTeacherId(
        request,
        reply
      );
      if (reply.sent || !authorizedByTeacherId) {
        return;
      }

      try {
        const body = request.body ?? ({} as EmergencyExitRequestDTO);
        const result = await authorizeEmergencyExitUseCase.execute({
          ra: body.ra,
          sessionId: body.sessionId,
          roomId: body.roomId,
          reason: body.reason,
          authorizedByTeacherId,
        });
        return reply.status(201).send(result);
      } catch (err) {
        return handleOverrideError(err, reply);
      }
    }
  );

  app.post<{ Body: GuestExitRequestDTO & OverrideAuthFields }>(
    '/movements/guest-exit',
    async (request, reply) => {
      const authorizedByTeacherId = await resolveAuthorizedTeacherId(
        request,
        reply
      );
      if (reply.sent || !authorizedByTeacherId) {
        return;
      }

      try {
        const body = request.body ?? ({} as GuestExitRequestDTO);
        const result = await authorizeGuestExitUseCase.execute({
          ra: body.ra,
          fullName: body.fullName,
          originClassCode: body.originClassCode,
          sessionId: body.sessionId,
          roomId: body.roomId,
          forceConcurrent: body.forceConcurrent,
          authorizedByTeacherId,
        });
        return reply.status(201).send(result);
      } catch (err) {
        return handleOverrideError(err, reply);
      }
    }
  );
}

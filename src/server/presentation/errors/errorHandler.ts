import { InvalidExportFormatError } from '@server/application/use-cases/analytics/ExportAnalyticsReportUseCase';
import { StudentNotFoundError } from '@server/application/use-cases/analytics/GetStudentHistoryReportUseCase';
import {
  AuthenticationError,
  ValidationError,
} from '@server/application/use-cases/auth/LoginUseCase';
import {
  ClassGroupConflictError,
  ClassGroupValidationError,
} from '@server/application/use-cases/classes/CreateClassGroupUseCase';
import { ClassGroupNotFoundError } from '@server/application/use-cases/classes/UpdateClassGroupUseCase';
import {
  MovementNotFoundError as CoordinationMovementNotFoundError,
  InvalidOutcomeError,
} from '@server/application/use-cases/coordination/ResolveMovementIncidentUseCase';
import { MovementAuthorizationError } from '@server/application/use-cases/movements/AuthorizeEmergencyExitUseCase';
import {
  QueueConflictError,
  QueueWindowExpiredError,
} from '@server/application/use-cases/movements/EnqueueStudentUseCase';
import {
  MovementConcurrencyConflictError,
  MovementNotFoundError as MovementNotFoundExitError,
  MovementValidationError,
  StudentNotInClassError,
} from '@server/application/use-cases/movements/RequestStudentExitUseCase';
import {
  RoomConflictError,
  RoomValidationError,
} from '@server/application/use-cases/rooms/CreateRoomUseCase';
import { RoomNotFoundError } from '@server/application/use-cases/rooms/UpdateRoomStatusUseCase';
import { SessionNotFoundError } from '@server/application/use-cases/sessions/EndClassSessionUseCase';
import {
  SessionConflictError,
  SessionValidationError,
} from '@server/application/use-cases/sessions/StartClassSessionUseCase';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface ErrorResponse {
  statusCode: number;
  body: {
    error: string;
  };
}

export function mapErrorToResponse(err: unknown): ErrorResponse {
  if (
    err instanceof ValidationError ||
    err instanceof MovementValidationError ||
    err instanceof SessionValidationError ||
    err instanceof RoomValidationError ||
    err instanceof ClassGroupValidationError ||
    err instanceof InvalidOutcomeError ||
    err instanceof InvalidExportFormatError ||
    err instanceof MovementAuthorizationError ||
    err instanceof QueueWindowExpiredError
  ) {
    return {
      statusCode: 400,
      body: { error: err.message },
    };
  }

  if (err instanceof AuthenticationError) {
    return {
      statusCode: 401,
      body: { error: err.message },
    };
  }

  if (err instanceof StudentNotInClassError) {
    return {
      statusCode: 403,
      body: { error: err.message },
    };
  }

  if (
    err instanceof MovementNotFoundExitError ||
    err instanceof CoordinationMovementNotFoundError ||
    err instanceof SessionNotFoundError ||
    err instanceof StudentNotFoundError ||
    err instanceof RoomNotFoundError ||
    err instanceof ClassGroupNotFoundError
  ) {
    return {
      statusCode: 404,
      body: { error: err.message },
    };
  }

  if (
    err instanceof MovementConcurrencyConflictError ||
    err instanceof QueueConflictError ||
    err instanceof SessionConflictError ||
    err instanceof RoomConflictError ||
    err instanceof ClassGroupConflictError
  ) {
    return {
      statusCode: 409,
      body: { error: err.message },
    };
  }

  const message =
    err instanceof Error ? err.message : 'Erro interno do servidor.';
  return {
    statusCode: 500,
    body: { error: message },
  };
}

export function setupFastifyErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
      const { statusCode, body } = mapErrorToResponse(error);
      return reply.status(statusCode).send(body);
    },
  );
}

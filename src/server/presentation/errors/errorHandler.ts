import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  MovementConcurrencyConflictError,
  MovementNotFoundError as MovementNotFoundExitError,
  MovementValidationError,
  StudentNotInClassError,
} from '@server/application/use-cases/movements/RequestStudentExitUseCase';
import {
  QueueConflictError,
  QueueWindowExpiredError,
} from '@server/application/use-cases/movements/EnqueueStudentUseCase';
import { MovementAuthorizationError } from '@server/application/use-cases/movements/AuthorizeEmergencyExitUseCase';
import {
  AuthenticationError,
  ValidationError,
} from '@server/application/use-cases/auth/LoginUseCase';
import {
  InvalidOutcomeError,
  MovementNotFoundError as CoordinationMovementNotFoundError,
} from '@server/application/use-cases/coordination/ResolveMovementIncidentUseCase';
import {
  SessionConflictError,
  SessionValidationError,
} from '@server/application/use-cases/sessions/StartClassSessionUseCase';
import { SessionNotFoundError } from '@server/application/use-cases/sessions/EndClassSessionUseCase';
import { StudentNotFoundError } from '@server/application/use-cases/analytics/GetStudentHistoryReportUseCase';
import { InvalidExportFormatError } from '@server/application/use-cases/analytics/ExportAnalyticsReportUseCase';

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
    err instanceof StudentNotFoundError
  ) {
    return {
      statusCode: 404,
      body: { error: err.message },
    };
  }

  if (
    err instanceof MovementConcurrencyConflictError ||
    err instanceof QueueConflictError ||
    err instanceof SessionConflictError
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
    (
      error: unknown,
      _request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const { statusCode, body } = mapErrorToResponse(error);
      return reply.status(statusCode).send(body);
    }
  );
}

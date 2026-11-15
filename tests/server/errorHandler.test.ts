import { describe, it, expect } from 'vitest';
import { mapErrorToResponse } from '@server/presentation/errors/errorHandler';
import { MovementValidationError, MovementNotFoundError, StudentNotInClassError, MovementConcurrencyConflictError } from '@server/application/use-cases/movements/RequestStudentExitUseCase';
import { AuthenticationError, ValidationError } from '@server/application/use-cases/auth/LoginUseCase';
import { SessionConflictError } from '@server/application/use-cases/sessions/StartClassSessionUseCase';
import { InvalidOutcomeError } from '@server/application/use-cases/coordination/ResolveMovementIncidentUseCase';

describe('Presentation Seam: Centralized Fastify Error Handler', () => {
  it('maps validation and outcome errors to 400 Bad Request', () => {
    const vErr = new MovementValidationError('Dados inválidos');
    expect(mapErrorToResponse(vErr)).toEqual({
      statusCode: 400,
      body: { error: 'Dados inválidos' },
    });

    const oErr = new InvalidOutcomeError('Desfecho inválido');
    expect(mapErrorToResponse(oErr)).toEqual({
      statusCode: 400,
      body: { error: 'Desfecho inválido' },
    });

    const bErr = new ValidationError('Email obrigatório');
    expect(mapErrorToResponse(bErr)).toEqual({
      statusCode: 400,
      body: { error: 'Email obrigatório' },
    });
  });

  it('maps authentication errors to 401 Unauthorized', () => {
    const aErr = new AuthenticationError('Credenciais incorretas');
    expect(mapErrorToResponse(aErr)).toEqual({
      statusCode: 401,
      body: { error: 'Credenciais incorretas' },
    });
  });

  it('maps authorization and studentNotInClass errors to 403 Forbidden', () => {
    const fErr = new StudentNotInClassError('Aluno não pertence à turma');
    expect(mapErrorToResponse(fErr)).toEqual({
      statusCode: 403,
      body: { error: 'Aluno não pertence à turma' },
    });
  });

  it('maps not found errors to 404 Not Found', () => {
    const nfErr = new MovementNotFoundError('Saída não encontrada');
    expect(mapErrorToResponse(nfErr)).toEqual({
      statusCode: 404,
      body: { error: 'Saída não encontrada' },
    });
  });

  it('maps conflict errors to 409 Conflict', () => {
    const cErr = new MovementConcurrencyConflictError('Sala já ocupada');
    expect(mapErrorToResponse(cErr)).toEqual({
      statusCode: 409,
      body: { error: 'Sala já ocupada' },
    });

    const sErr = new SessionConflictError('Sessão ativa já existe');
    expect(mapErrorToResponse(sErr)).toEqual({
      statusCode: 409,
      body: { error: 'Sessão ativa já existe' },
    });
  });

  it('maps unhandled errors to 500 Internal Server Error', () => {
    const uErr = new Error('Falha inesperada no banco');
    expect(mapErrorToResponse(uErr)).toEqual({
      statusCode: 500,
      body: { error: 'Falha inesperada no banco' },
    });
  });
});

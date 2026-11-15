import type {
  ITokenService,
  TokenPayload,
} from '@server/application/contracts/ITokenService';
import type { UserRole } from '@shared/enums';
import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: TokenPayload;
  }
}

export function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim();
}

export function createAuthMiddleware(tokenService: ITokenService) {
  const requireAuth = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const token = extractBearerToken(request);
    if (!token) {
      reply.status(401).send({ error: 'Token de autenticação não fornecido.' });
      return;
    }

    try {
      const payload = tokenService.verifyAccessToken(token);
      request.authUser = payload;
    } catch (err) {
      reply.status(401).send({
        error:
          err instanceof Error ? err.message : 'Token inválido ou expirado.',
      });
    }
  };

  const requireRoles = (allowedRoles: UserRole[]) => {
    return async (
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void> => {
      await requireAuth(request, reply);
      if (reply.sent || !request.authUser) {
        return;
      }
      if (!allowedRoles.includes(request.authUser.role)) {
        reply.status(403).send({
          error: 'Acesso negado para o perfil atual.',
        });
      }
    };
  };

  return {
    requireAuth,
    requireRoles,
  };
}

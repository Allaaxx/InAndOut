import type { UserRole } from '@shared/enums';

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  pinVerified: boolean;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface ITokenService {
  signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>): string;
  signRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>): string;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
}

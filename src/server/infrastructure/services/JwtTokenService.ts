import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ITokenService,
  TokenPayload,
} from '@server/application/contracts/ITokenService';

export interface JwtTokenServiceOptions {
  secret?: string;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
  clock?: () => Date;
}

export class JwtTokenService implements ITokenService {
  private readonly secret: string;
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlSeconds: number;
  private readonly clock: () => Date;

  constructor(options: JwtTokenServiceOptions = {}) {
    this.secret = options.secret ?? 'inandout-secret-key-2026';
    this.accessTokenTtlSeconds = options.accessTokenTtlSeconds ?? 60 * 60; // 1 hour
    this.refreshTokenTtlSeconds =
      options.refreshTokenTtlSeconds ?? 60 * 60 * 12; // 12 hours
    this.clock = options.clock ?? (() => new Date());
  }

  public signAccessToken(
    payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>
  ): string {
    return this.sign(payload, 'access', this.accessTokenTtlSeconds);
  }

  public signRefreshToken(
    payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>
  ): string {
    return this.sign(payload, 'refresh', this.refreshTokenTtlSeconds);
  }

  public verifyAccessToken(token: string): TokenPayload {
    const payload = this.verify(token);
    if (payload.type && payload.type !== 'access') {
      throw new Error('Token inválido para acesso.');
    }
    return payload;
  }

  public verifyRefreshToken(token: string): TokenPayload {
    const payload = this.verify(token);
    if (payload.type !== 'refresh') {
      throw new Error('Refresh token inválido.');
    }
    return payload;
  }

  private sign(
    payload: Omit<TokenPayload, 'iat' | 'exp' | 'type'>,
    type: 'access' | 'refresh',
    ttlSeconds: number
  ): string {
    const iat = Math.floor(this.clock().getTime() / 1000);
    const exp = iat + ttlSeconds;
    const fullPayload: TokenPayload = {
      ...payload,
      type,
      iat,
      exp,
    };

    const headerB64 = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' })
    ).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString(
      'base64url'
    );
    const signature = this.createSignature(`${headerB64}.${payloadB64}`);
    return `${headerB64}.${payloadB64}.${signature}`;
  }

  private verify(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token malformado.');
    }
    const [headerB64, payloadB64, signature] = parts;
    const expectedSignature = this.createSignature(
      `${headerB64}.${payloadB64}`
    );

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      throw new Error('Assinatura do token inválida.');
    }

    const decodedJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(decodedJson) as TokenPayload;
    const nowSeconds = Math.floor(this.clock().getTime() / 1000);
    if (typeof payload.exp === 'number' && nowSeconds >= payload.exp) {
      throw new Error('Sessão expirada.');
    }

    return payload;
  }

  private createSignature(input: string): string {
    return createHmac('sha256', this.secret).update(input).digest('base64url');
  }
}

export const CLIENT_NAME = '@inandout/client';
export const CLIENT_VERSION = '1.0.0';

export interface ClientStatus {
  status: 'ready' | 'loading' | 'error';
  env: string;
}

export function getClientStatus(): ClientStatus {
  return {
    status: 'ready',
    env: 'production',
  };
}

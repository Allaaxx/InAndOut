export const SERVER_NAME = '@inandout/server';
export const SERVER_VERSION = '1.0.0';

export interface ServerStatus {
  status: 'online' | 'offline';
  timestamp: string;
}

export function getServerStatus(): ServerStatus {
  return {
    status: 'online',
    timestamp: new Date().toISOString(),
  };
}

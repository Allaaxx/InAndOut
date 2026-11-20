export const DEFAULT_ROOM_CODE = 'SALA-01';

/**
 * Normalizes a physical room code into a URL- and channel-safe uppercase slug.
 * Example: "Lab Química" -> "LAB-QUIMICA", "Sala/1" -> "SALA-1".
 */
export function normalizeRoomCode(code: string): string {
  return code
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

/**
 * Normalizes an optional room code and falls back to DEFAULT_ROOM_CODE when empty.
 */
export function resolveRoomCode(code?: string | null): string {
  const normalized = normalizeRoomCode(code ?? '');
  return normalized || DEFAULT_ROOM_CODE;
}

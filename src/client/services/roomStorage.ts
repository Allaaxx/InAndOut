export const TERMINAL_ROOM_STORAGE_KEY = 'inandout_room_code';

export function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

export function getSavedRoomCode(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(TERMINAL_ROOM_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  const normalized = normalizeRoomCode(stored);
  return normalized.length > 0 ? normalized : null;
}

export function saveRoomCode(roomCode: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  const normalized = normalizeRoomCode(roomCode);
  if (!normalized) {
    return;
  }
  localStorage.setItem(TERMINAL_ROOM_STORAGE_KEY, normalized);
}

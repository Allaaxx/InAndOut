import { Room } from '@server/domain/entities/Room';
import {
  DEFAULT_ROOM_CODE,
  normalizeRoomCode,
  resolveRoomCode,
} from '@shared/roomCode';
import { describe, expect, it } from 'vitest';

describe('Room Code Normalization (src/shared/roomCode.ts)', () => {
  it('normalizes room codes into URL- and channel-safe uppercase slugs', () => {
    expect(normalizeRoomCode('Lab Química')).toBe('LAB-QUIMICA');
    expect(normalizeRoomCode('sala-01')).toBe('SALA-01');
    expect(normalizeRoomCode('Sala/1')).toBe('SALA-1');
    expect(normalizeRoomCode('  Lab  --  Física!!  ')).toBe('LAB-FISICA');
    expect(normalizeRoomCode('---')).toBe('');
    expect(normalizeRoomCode('   ')).toBe('');
  });

  it('resolves empty or missing room codes to DEFAULT_ROOM_CODE', () => {
    expect(resolveRoomCode(undefined)).toBe(DEFAULT_ROOM_CODE);
    expect(resolveRoomCode(null)).toBe(DEFAULT_ROOM_CODE);
    expect(resolveRoomCode('   ')).toBe(DEFAULT_ROOM_CODE);
    expect(resolveRoomCode('---')).toBe(DEFAULT_ROOM_CODE);
    expect(resolveRoomCode('Lab Química')).toBe('LAB-QUIMICA');
  });

  it('rejects rooms whose code normalizes to an empty slug', () => {
    expect(() => Room.create({ code: '---', name: 'Sala Inválida' })).toThrow(
      /código da sala é obrigatório/i,
    );
  });
});

import { User } from '@server/domain/entities/User';
import { PinCode } from '@server/domain/value-objects/PinCode';
import { UserRole } from '@shared/enums';
import { describe, expect, it } from 'vitest';

describe('Domain Seam: PinCode Value Object & User Entity', () => {
  it('creates a valid 4-digit numeric PinCode and verifies matching input', () => {
    const pin = PinCode.create('1234');
    expect(pin.value).toBe('1234');
    expect(pin.matches('1234')).toBe(true);
    expect(pin.matches('9999')).toBe(false);
  });

  it('rejects PINs that do not consist of exactly 4 numeric digits', () => {
    expect(() => PinCode.create('123')).toThrow(/4 dígitos/i);
    expect(() => PinCode.create('12345')).toThrow(/4 dígitos/i);
    expect(() => PinCode.create('12a4')).toThrow(/4 dígitos/i);
    expect(() => PinCode.create('')).toThrow(/4 dígitos/i);
  });

  it('creates a User entity and validates or updates their 4-digit PIN', () => {
    const user = User.create({
      id: 'teacher-1',
      name: 'Prof. Carlos',
      email: 'prof@linsdorego.edu.br',
      passwordHash: 'hashed-pass',
      role: UserRole.TEACHER,
      pinCode: '1234',
    });

    expect(user.verifyPin('1234')).toBe(true);
    expect(user.verifyPin('0000')).toBe(false);

    user.updatePin('5678');
    expect(user.verifyPin('5678')).toBe(true);
    expect(user.verifyPin('1234')).toBe(false);
  });
});

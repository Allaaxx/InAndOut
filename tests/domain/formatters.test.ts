import { describe, it, expect } from 'vitest';
import { formatPublicStudentName } from '@shared/formatters';

describe('Shared Formatter: formatPublicStudentName', () => {
  it('formats full name with first name and last initial for LGPD compliance', () => {
    expect(formatPublicStudentName('Lucas Silva')).toBe('Lucas S.');
    expect(formatPublicStudentName('Maria Eduarda Santos')).toBe('Maria S.');
  });

  it('handles single names and edge cases gracefully', () => {
    expect(formatPublicStudentName('Gabriel')).toBe('Gabriel');
    expect(formatPublicStudentName('   ')).toBe('');
    expect(formatPublicStudentName('Ana   Clara   Lima')).toBe('Ana L.');
  });
});

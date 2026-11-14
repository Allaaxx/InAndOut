/**
 * Formats a student's full name for public classroom terminal display in compliance with LGPD (ADR 0003).
 * Example: "Lucas Silva" -> "Lucas S.", "Maria Eduarda Santos" -> "Maria S."
 */
export function formatPublicStudentName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

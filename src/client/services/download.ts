/**
 * Utility to trigger browser file download from a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Builds the standard download filename for analytics exports.
 */
export function buildReportFilename(
  format: 'xlsx' | 'pdf' | 'csv',
  ra?: string,
): string {
  const extension =
    format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
  const prefix = ra ? `relatorio-aluno-${ra}` : 'relatorio-movimentacoes';
  return `${prefix}.${extension}`;
}

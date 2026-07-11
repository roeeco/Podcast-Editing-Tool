/**
 * Shared escapeHtml helper to securely escape all user-controlled strings 
 * preventing XSS and injection vulnerabilities in dynamic contexts.
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  const s = typeof str === 'string' ? str : String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

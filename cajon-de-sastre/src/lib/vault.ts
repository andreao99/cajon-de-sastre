// Código secreto del vault: se guarda solo en este dispositivo; Firestore usa su hash.
const KEY = 'cajon:code';
export const MIN_CODE_LENGTH = 16;
// Sin caracteres ambiguos (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join('')).join('-');
}

/** Quita espacios y guiones y pasa a mayúsculas, para que el mismo código dé siempre el mismo hash. */
export const normalizeCode = (code: string) => code.replace(/[\s-]/g, '').toUpperCase();

export function validateCode(code: string): string | null {
  return normalizeCode(code).length >= MIN_CODE_LENGTH ? null : `El código debe tener al menos ${MIN_CODE_LENGTH} caracteres.`;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const vaultId = (code: string) => sha256Hex(normalizeCode(code));

export const maskCode = (code: string) => code.replace(/[A-Z0-9]/g, (c, i) => (i % 5 < 2 || i > 17 ? c : '•'));

export const getStoredCode = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const storeCode = (code: string) => localStorage.setItem(KEY, code);
export const clearStoredCode = () => localStorage.removeItem(KEY);

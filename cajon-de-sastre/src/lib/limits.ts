// Firestore limita cada documento a 1 MiB (1.048.576 bytes). Dejamos margen para el resto de campos.
export const DOC_LIMIT = 1_048_576;
export const DOC_MARGIN = 8_192;
export const MAX_BYTES = DOC_LIMIT - DOC_MARGIN;
export const WARN_BYTES = Math.floor(MAX_BYTES * 0.8);

export const byteLength = (s: string) => new TextEncoder().encode(s).length;
export const entriesBytes = (e: Record<string, string>) => Object.entries(e).reduce((n, [k, v]) => n + byteLength(k) + byteLength(v), 0);

export type SizeState = 'ok' | 'warn' | 'over';
export const sizeState = (bytes: number): SizeState => (bytes > MAX_BYTES ? 'over' : bytes > WARN_BYTES ? 'warn' : 'ok');
export const formatKB = (b: number) => `${Math.round(b / 1024)} KB`;

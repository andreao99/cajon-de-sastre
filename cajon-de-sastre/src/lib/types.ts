export type PastelName = 'rose' | 'sage' | 'lav' | 'peach' | 'sky' | 'butter' | 'mint' | 'clay';
export const PASTELS: { name: string; key: PastelName }[] = [
  { name: 'Rosa', key: 'rose' }, { name: 'Salvia', key: 'sage' }, { name: 'Lavanda', key: 'lav' },
  { name: 'Melocotón', key: 'peach' }, { name: 'Cielo', key: 'sky' }, { name: 'Mantequilla', key: 'butter' },
  { name: 'Menta', key: 'mint' }, { name: 'Arcilla', key: 'clay' },
];

/** Modelo alineado con vaults/{hash}/apps y /folders (el html se añade en la fase 2). */
export interface AppItem { id: string; name: string; icon: string; color: PastelName; html?: string; adapt?: boolean; fit?: boolean; folderId: string | null; page: number; order: number; createdAt: number }
export interface Folder { id: string; name: string; page: number; order: number }

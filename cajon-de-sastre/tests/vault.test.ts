import { describe, expect, it } from 'vitest';
import { generateCode, normalizeCode, sha256Hex, validateCode, vaultId } from '../src/lib/vault';

describe('vault', () => {
  it('genera códigos de 16 caracteres válidos', () => {
    const c = generateCode();
    expect(c).toMatch(/^([A-Z2-9]{4}-){3}[A-Z2-9]{4}$/);
    expect(validateCode(c)).toBeNull();
    expect(generateCode()).not.toBe(c);
  });
  it('rechaza códigos cortos', () => expect(validateCode('ABCD-1234')).not.toBeNull());
  it('normaliza guiones, espacios y mayúsculas', () => expect(normalizeCode(' ab-cd ef ')).toBe('ABCDEF'));
  it('hash SHA-256 conocido', async () =>
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
  it('el id del vault no depende del formato', async () =>
    expect(await vaultId('abcd-efgh-ijkl-mnpq')).toBe(await vaultId('ABCDEFGHIJKLMNPQ')));
});

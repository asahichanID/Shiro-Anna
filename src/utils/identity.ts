export function generateUuid(): string {
  if (typeof globalThis !== 'undefined') {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
      return cryptoObj.randomUUID();
    }
  }

  return `uuid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function generateEightDigitCode(existingCodes: Iterable<string> = []): string {
  const used = new Set(Array.from(existingCodes, (value) => String(value)));
  let code = '';

  do {
    code = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
  } while (used.has(code));

  return code;
}

export function canonicalRoomId(a: string, b: string): string {
  return [String(a).trim(), String(b).trim()].sort((left, right) => left.localeCompare(right)).join('::');
}

export function normalizeId(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}


export function canonicalDirectRoomId(a: string, b: string): string {
  return [String(a).trim(), String(b).trim()].sort((left, right) => left.localeCompare(right)).join('::');
}

export function generateSessionToken(): string {
  return generateUuid();
}

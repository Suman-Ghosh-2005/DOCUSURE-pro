import crypto from 'crypto';

/**
 * Deterministic canonical JSON serialization.
 * Recursively sorts keys of all objects to guarantee stable string output regardless of insertion order.
 */
export function canonicalSerialize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalSerialize).join(',') + ']';
  }

  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const serializedEntries = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalSerialize((obj as Record<string, unknown>)[key])}`
  );
  return '{' + serializedEntries.join(',') + '}';
}

/**
 * Computes SHA-256 event hash for an audit event
 */
export function computeEventHash(params: {
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
  previousHash: string | null;
}): string {
  const { eventType, eventData, createdAt, previousHash } = params;

  const canonicalData = canonicalSerialize(eventData);
  const payloadToHash = `${eventType}:${canonicalData}:${createdAt}:${previousHash || ''}`;

  return crypto.createHash('sha256').update(payloadToHash).digest('hex');
}

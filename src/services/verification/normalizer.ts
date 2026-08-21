/**
 * Deterministic Text Normalization & String Similarity Utilities
 */

export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(/\b(MR|MRS|MS|DR|SH|SMT)\b\.?/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // Format: YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return cleaned;
}

export function normalizeIncome(incomeStr: string): number | null {
  if (!incomeStr) return null;
  const digitsOnly = incomeStr.replace(/[^0-9]/g, '');
  if (!digitsOnly) return null;
  const parsed = parseInt(digitsOnly, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Deterministic Levenshtein Distance
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return track[str2.length][str1.length];
}

/**
 * Deterministic Token-Sort String Similarity (0.0 to 1.0)
 * Sorts tokens alphabetically before calculating Levenshtein distance
 */
export function calculateTokenSortSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeName(str1);
  const norm2 = normalizeName(str2);

  if (!norm1 && !norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;
  if (norm1 === norm2) return 1.0;

  // Token sort: "KUMAR RAHUL" == "RAHUL KUMAR"
  const sorted1 = norm1.split(' ').sort().join(' ');
  const sorted2 = norm2.split(' ').sort().join(' ');

  if (sorted1 === sorted2) return 1.0;

  const maxLen = Math.max(sorted1.length, sorted2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(sorted1, sorted2);
  const similarity = 1 - distance / maxLen;

  return Math.round(similarity * 1000) / 1000;
}

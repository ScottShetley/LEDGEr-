import { BaitRigType } from '../types';

export const STANDARD_BAIT_RIGS: BaitRigType[] = [
  'Cut Skipjack Head',
  'Cut Skipjack Chunk',
  'Cut Bluegill',
  'Live Bluegill',
  'Live Gizzard Shad',
  'Cut Gizzard Shad',
  'Live Threadfin Shad',
  'Cut Threadfin Shad',
  'Largemouth Bass (Live / Cut)',
  'Cut Carp / Carp Chunk',
  'Crappie (Live / Cut)',
  'White Bass (Cut / Live)',
  'Live Shad',
  'Dip / Prepared Bait',
  'Nightcrawler',
  'Custom',
];

/**
 * Normalizes user-entered or legacy bait names to canonical fishing terms.
 * Specifically unifies 'cutbait' vs 'cut bait' vs 'cut', case variations,
 * and canonical species groupings (e.g. 'Cutbait Gizzard Shad' -> 'Cut Gizzard Shad').
 */
export function normalizeBaitName(rawBait?: string | null): string {
  if (!rawBait || typeof rawBait !== 'string') return 'Other';
  const trimmed = rawBait.trim();
  if (!trimmed) return 'Other';

  const lower = trimmed.toLowerCase();

  // If already exactly matches one of the canonical options
  const exactMatch = STANDARD_BAIT_RIGS.find(
    (b) => b.toLowerCase() === lower && b !== 'Custom'
  );
  if (exactMatch) return exactMatch;

  // Gizzard Shad
  if (lower.includes('gizzard')) {
    if (lower.includes('live')) {
      return 'Live Gizzard Shad';
    }
    // "cutbait gizzard shad", "cut bait gizzard shad", "cut gizzard shad", "gizzard shad cut", "gizzard cutbait"
    return 'Cut Gizzard Shad';
  }

  // Skipjack
  if (lower.includes('skipjack') || lower.includes('skip jack')) {
    if (lower.includes('head')) {
      return 'Cut Skipjack Head';
    }
    return 'Cut Skipjack Chunk';
  }

  // Threadfin Shad
  if (lower.includes('threadfin')) {
    if (lower.includes('live')) {
      return 'Live Threadfin Shad';
    }
    return 'Cut Threadfin Shad';
  }

  // Generic Shad (if neither gizzard nor threadfin is specified)
  if (
    lower === 'shad' ||
    lower === 'cut shad' ||
    lower === 'cutbait shad' ||
    lower === 'cut bait shad'
  ) {
    return 'Cut Gizzard Shad';
  }
  if (lower === 'live shad') {
    return 'Live Shad';
  }

  // Bluegill / Sunfish / Bream
  if (lower.includes('bluegill') || lower.includes('sunfish') || lower.includes('bream')) {
    if (lower.includes('live')) {
      return 'Live Bluegill';
    }
    return 'Cut Bluegill';
  }

  // Carp
  if (lower.includes('carp')) {
    return 'Cut Carp / Carp Chunk';
  }

  // Crappie
  if (lower.includes('crappie')) {
    return 'Crappie (Live / Cut)';
  }

  // White Bass
  if (lower.includes('white bass')) {
    return 'White Bass (Cut / Live)';
  }

  // Largemouth Bass
  if (lower.includes('largemouth') || (lower.includes('bass') && !lower.includes('white'))) {
    return 'Largemouth Bass (Live / Cut)';
  }

  // Dip / Prepared
  if (
    lower.includes('dip') ||
    lower.includes('punch') ||
    lower.includes('stink') ||
    lower.includes('dough')
  ) {
    return 'Dip / Prepared Bait';
  }

  // Nightcrawler / Worms
  if (lower.includes('nightcrawler') || lower.includes('worm')) {
    return 'Nightcrawler';
  }

  // General transformation: if starts with "cutbait " or "cut bait ", normalize to "Cut "
  let cleaned = trimmed
    .replace(/^cutbait[\s\-_]+/i, 'Cut ')
    .replace(/^cut[\s\-_]+bait[\s\-_]+/i, 'Cut ')
    .replace(/[\s\-_]+cutbait$/i, '')
    .replace(/[\s\-_]+cut[\s\-_]+bait$/i, '');

  // Capitalize first letter of each word if still custom
  cleaned = cleaned.replace(/\b\w/g, (char) => char.toUpperCase());

  return cleaned;
}

import { ClassificationResult, SensitivityLevel, RoutingTarget, Workflow } from '@baniya/types';
import { PATTERNS, SENSITIVE_KEYS } from './patterns/india-pii';
import { estimateCost } from './cost-estimator';

const LEVEL_ORDER: SensitivityLevel[] = ['public', 'internal', 'private', 'critical'];

const PATTERN_LEVEL: Record<string, SensitivityLevel> = {
  aadhaar:      'critical',
  pan:          'critical',
  ifsc:         'critical',
  bank_account: 'critical',
  credit_card:  'critical',
  passport_IN:  'critical',
  phone_IN:     'private',
  email:        'private',
  dob:          'private',
};

const ROUTING_MAP: Record<SensitivityLevel, RoutingTarget> = {
  critical: 'local',
  private:  'local',
  internal: 'hybrid',
  public:   'cloud',
};

function maxLevel(a: SensitivityLevel, b: SensitivityLevel): SensitivityLevel {
  return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

function scanValue(value: unknown, found: Set<string>): SensitivityLevel {
  if (value === null || value === undefined) return 'public';
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      let level: SensitivityLevel = 'public';
      for (const item of value) {
        level = maxLevel(level, scanValue(item, found));
      }
      return level;
    }
    return scanObject(value as Record<string, unknown>, found);
  }
  const str = String(value);
  let level: SensitivityLevel = 'public';
  for (const [name, regex] of Object.entries(PATTERNS)) {
    regex.lastIndex = 0;
    if (regex.test(str)) {
      found.add(name);
      level = maxLevel(level, PATTERN_LEVEL[name] ?? 'internal');
    }
  }
  return level;
}

function scanObject(obj: Record<string, unknown>, found: Set<string>): SensitivityLevel {
  let level: SensitivityLevel = 'public';
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      found.add(`key:${key}`);
      level = 'critical';
    }
    level = maxLevel(level, scanValue(val, found));
  }
  return level;
}

export function classify(
  payload: unknown,
  workflow?: Workflow,
  executionsPerDay?: number
): ClassificationResult {
  const found = new Set<string>();
  const level = typeof payload === 'object' && payload !== null
    ? (Array.isArray(payload) ? scanValue(payload, found) : scanObject(payload as Record<string, unknown>, found))
    : scanValue(payload, found);

  const patterns = [...found];
  const confidence = patterns.length === 0 ? 0.95 : Math.min(0.7 + patterns.length * 0.1, 0.99);

  return {
    level,
    detectedPatterns: patterns,
    confidence,
    routingRecommendation: ROUTING_MAP[level],
    costEstimate: estimateCost(payload, level, workflow, executionsPerDay),
  };
}

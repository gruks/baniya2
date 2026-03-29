import { describe, it, expect } from 'vitest';
import { classify } from '../classifier';

describe('DataClassifier', () => {
  it('classifies clean business text as public', () => {
    const result = classify({ message: 'Please summarise Q3 revenue trends' });
    expect(result.level).toBe('public');
    expect(result.routingRecommendation).toBe('cloud');
    expect(result.detectedPatterns).toHaveLength(0);
    expect(result.confidence).toBe(0.95);
  });

  it('classifies email-only payload as private', () => {
    const result = classify({ contact: 'user@example.com' });
    expect(result.level).toBe('private');
    expect(result.routingRecommendation).toBe('local');
    expect(result.detectedPatterns).toContain('email');
  });

  it('classifies Aadhaar in nested field as critical', () => {
    const result = classify({
      user: {
        profile: {
          identity: '234567890123',
        },
      },
    });
    expect(result.level).toBe('critical');
    expect(result.routingRecommendation).toBe('local');
    expect(result.detectedPatterns).toContain('aadhaar');
  });

  it('classifies key named "password" as critical regardless of value', () => {
    const result = classify({ password: 'hello123' });
    expect(result.level).toBe('critical');
    expect(result.routingRecommendation).toBe('local');
    expect(result.detectedPatterns).toContain('key:password');
  });

  it('classifies PAN card as critical', () => {
    const result = classify({ document: 'PAN: ABCDE1234F' });
    expect(result.level).toBe('critical');
    expect(result.routingRecommendation).toBe('local');
    expect(result.detectedPatterns).toContain('pan');
  });
});

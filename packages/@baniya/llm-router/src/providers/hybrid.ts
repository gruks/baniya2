import crypto from 'crypto';
import type { LLMResponse, RouterConfig } from '@baniya/types';
import { classify } from '@baniya/data-classifier';
import { sanitize, restore } from '../sanitizer';
import { callCloud } from './cloud';

export async function callHybrid(payload: unknown, prompt: string, config: RouterConfig): Promise<LLMResponse> {
  const classification = classify(payload);
  const requestId = crypto.randomUUID();

  // Sanitize the prompt
  const sanitizedPrompt = sanitize(requestId, prompt, classification.detectedPatterns);

  // Call cloud with sanitized prompt
  const response = await callCloud(sanitizedPrompt, config);

  // Restore PII in response
  response.text = restore(requestId, response.text);
  response.routing = 'hybrid';
  response.sanitizerApplied = true;

  return response;
}

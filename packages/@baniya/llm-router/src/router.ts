import type { LLMResponse, ClassificationResult, RoutingTarget, RouterConfig } from '@baniya/types';
import { classify } from '@baniya/data-classifier';
import { estimateCost } from './cost-estimator';
import { callLocal } from './providers/local';
import { callCloud } from './providers/cloud';
import { callHybrid } from './providers/hybrid';
import { HardBlockError } from './errors';

export class BaniyaRouter {
  async route(payload: unknown, prompt: string, config: RouterConfig): Promise<LLMResponse> {
    const classification = classify(payload);
    const target = this.resolveTarget(classification, config);

    // Hard block: critical data cannot go to cloud even if overridden
    if (classification.level === 'critical' && target === 'cloud') {
      throw new HardBlockError('Critical data cannot be routed to cloud. Set BANIYA_BLOCK_CLOUD_FOR=critical.');
    }

    const start = Date.now();
    let response: LLMResponse;

    if (target === 'local') {
      response = await callLocal(prompt, config);
    } else if (target === 'hybrid') {
      response = await callHybrid(payload, prompt, config);
    } else {
      response = await callCloud(prompt, config);
    }

    response.latencyMs = Date.now() - start;
    response.costUSD = estimateCost(response.model, response.tokensIn, response.tokensOut);
    response.routing = target;
    response.sensitivity = classification.level;

    return response;
  }

  private resolveTarget(c: ClassificationResult, config: RouterConfig): RoutingTarget {
    if (config.forceRoute && config.forceRoute !== 'auto') return config.forceRoute;
    return c.routingRecommendation;
  }
}

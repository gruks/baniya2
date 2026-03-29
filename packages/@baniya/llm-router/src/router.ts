import type { LLMResponse, ClassificationResult, RoutingTarget, RouterConfig } from '@baniya/types';
import { classify } from '@baniya/data-classifier';
import { estimateCost } from './cost-estimator';
import { callLocal, type LocalSettings } from './providers/local';
import { callCloud, type CloudSettings } from './providers/cloud';
import { callHybrid } from './providers/hybrid';
import { HardBlockError } from './errors';

export interface RouterSettings {
  local?: LocalSettings;
  cloud?: CloudSettings;
}

export class BaniyaRouter {
  async route(payload: unknown, prompt: string, config: RouterConfig, settings?: RouterSettings): Promise<LLMResponse> {
    const classification = classify(payload);
    const target = this.resolveTarget(classification, config);

    if (classification.level === 'critical' && target === 'cloud') {
      throw new HardBlockError('Critical data cannot be routed to cloud. Set BANIYA_BLOCK_CLOUD_FOR=critical.');
    }

    const start = Date.now();
    let response: LLMResponse;

    if (target === 'local') {
      response = await callLocal(prompt, config, settings?.local);
    } else if (target === 'hybrid') {
      response = await callHybrid(payload, prompt, config);
    } else {
      response = await callCloud(prompt, config, settings?.cloud);
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

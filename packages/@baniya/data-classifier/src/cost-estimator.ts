import type {
  ProjectCostEstimate,
  ModelCostEstimate,
  RoutingScenario,
  SensitivityLevel,
  RoutingTarget,
  Workflow,
} from '@baniya/types';

const USD_TO_INR = 83;

// Pricing per 1M tokens (input / output) in USD
const MODEL_PRICING: Array<{
  model: string;
  provider: string;
  route: RoutingTarget;
  inPer1M: number;
  outPer1M: number;
}> = [
  { model: 'gpt-4o',          provider: 'openai',    route: 'cloud', inPer1M: 5.00,  outPer1M: 15.00 },
  { model: 'gpt-4o-mini',     provider: 'openai',    route: 'cloud', inPer1M: 0.15,  outPer1M: 0.60  },
  { model: 'claude-3-5-sonnet', provider: 'anthropic', route: 'cloud', inPer1M: 3.00, outPer1M: 15.00 },
  { model: 'gemini-2.0-flash', provider: 'google',   route: 'cloud', inPer1M: 0.10,  outPer1M: 0.40  },
  { model: 'gemini-2.5-flash', provider: 'google',   route: 'cloud', inPer1M: 0.30,  outPer1M: 2.50  },
  { model: 'llama3.2',        provider: 'ollama',    route: 'local', inPer1M: 0,     outPer1M: 0     },
  { model: 'mistral',         provider: 'ollama',    route: 'local', inPer1M: 0,     outPer1M: 0     },
  { model: 'phi3',            provider: 'lmstudio',  route: 'local', inPer1M: 0,     outPer1M: 0     },
];

// AI node types that consume tokens
const AI_NODE_TYPES = new Set([
  'ai.llm', 'ai.classify', 'ai.embed', 'ai.summarise',
  'ai.extract', 'ai.rewrite', 'ai.translate', 'ai.moderate',
]);

// Rough token estimates per AI node type (in + out)
const NODE_TOKEN_ESTIMATE: Record<string, { in: number; out: number }> = {
  'ai.llm':       { in: 800,  out: 400  },
  'ai.classify':  { in: 300,  out: 50   },
  'ai.embed':     { in: 500,  out: 0    },
  'ai.summarise': { in: 1200, out: 300  },
  'ai.extract':   { in: 600,  out: 200  },
  'ai.rewrite':   { in: 700,  out: 700  },
  'ai.translate': { in: 500,  out: 500  },
  'ai.moderate':  { in: 300,  out: 30   },
};

function countTokensFromPayload(payload: unknown): number {
  // Rough heuristic: 1 token ≈ 4 chars
  try {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return Math.ceil(str.length / 4);
  } catch {
    return 200;
  }
}

function calcModelCost(
  model: (typeof MODEL_PRICING)[number],
  tokensIn: number,
  tokensOut: number
): ModelCostEstimate {
  const costUSD =
    (tokensIn / 1_000_000) * model.inPer1M +
    (tokensOut / 1_000_000) * model.outPer1M;
  return {
    model: model.model,
    provider: model.provider,
    tokensIn,
    tokensOut,
    costUSD,
    costINR: costUSD * USD_TO_INR,
  };
}

function buildScenarios(
  byModel: ModelCostEstimate[],
  sensitivity: SensitivityLevel
): RoutingScenario[] {
  const cloudOnly = byModel
    .filter(m => m.provider !== 'ollama' && m.provider !== 'lmstudio')
    .reduce((best, m) => (!best || m.costUSD < best.costUSD ? m : best), null as ModelCostEstimate | null);

  const cloudCost = cloudOnly?.costUSD ?? 0;

  const scenarios: RoutingScenario[] = [];

  // All-cloud (cheapest cloud model)
  if (cloudOnly) {
    scenarios.push({
      name: `All Cloud (${cloudOnly.model})`,
      route: 'cloud',
      costUSD: cloudCost,
      costINR: cloudCost * USD_TO_INR,
      savingsVsCloudUSD: 0,
      savingsPercent: 0,
    });
  }

  // All-local (free)
  const localCost = 0;
  scenarios.push({
    name: 'All Local (Ollama/LMStudio)',
    route: 'local',
    costUSD: localCost,
    costINR: 0,
    savingsVsCloudUSD: cloudCost - localCost,
    savingsPercent: cloudCost > 0 ? 100 : 0,
  });

  // Hybrid: route sensitive data local, public to cloud
  const hybridCost = sensitivity === 'public' ? cloudCost : cloudCost * 0.3;
  scenarios.push({
    name: 'Hybrid (Baniya Smart Route)',
    route: 'hybrid',
    costUSD: hybridCost,
    costINR: hybridCost * USD_TO_INR,
    savingsVsCloudUSD: cloudCost - hybridCost,
    savingsPercent: cloudCost > 0 ? ((cloudCost - hybridCost) / cloudCost) * 100 : 0,
  });

  return scenarios;
}

export function estimateCost(
  payload: unknown,
  sensitivity: SensitivityLevel,
  workflow?: Workflow,
  executionsPerDay = 100
): ProjectCostEstimate {
  // Base token count from payload
  const payloadTokensIn = countTokensFromPayload(payload);
  const payloadTokensOut = Math.ceil(payloadTokensIn * 0.4);

  // If workflow provided, sum up AI node token estimates
  let totalIn = payloadTokensIn;
  let totalOut = payloadTokensOut;

  if (workflow?.nodes) {
    for (const node of workflow.nodes) {
      if (AI_NODE_TYPES.has(node.type) && !node.disabled) {
        const est = NODE_TOKEN_ESTIMATE[node.type] ?? { in: 500, out: 200 };
        totalIn += est.in;
        totalOut += est.out;
      }
    }
  }

  const byModel = MODEL_PRICING.map(m => calcModelCost(m, totalIn, totalOut));
  const scenarios = buildScenarios(byModel, sensitivity);

  // Recommended: cheapest model allowed by sensitivity
  const allowedModels = byModel.filter(m =>
    sensitivity === 'critical' || sensitivity === 'private'
      ? m.provider === 'ollama' || m.provider === 'lmstudio'
      : true
  );
  const recommended = allowedModels.reduce(
    (best, m) => (!best || m.costUSD < best.costUSD ? m : best),
    null as ModelCostEstimate | null
  );

  const recommendedRoute: RoutingTarget =
    sensitivity === 'critical' || sensitivity === 'private' ? 'local'
    : sensitivity === 'internal' ? 'hybrid'
    : 'cloud';

  const perExecCost = recommended?.costUSD ?? 0;
  const monthlyCostUSD = perExecCost * executionsPerDay * 30;

  return {
    estimatedTokensIn: totalIn,
    estimatedTokensOut: totalOut,
    byModel,
    scenarios,
    recommendedModel: recommended?.model ?? 'llama3.2',
    recommendedRoute,
    monthlyProjection: {
      executionsPerDay,
      costUSD: monthlyCostUSD,
      costINR: monthlyCostUSD * USD_TO_INR,
    },
    sensitivityLevel: sensitivity,
  };
}

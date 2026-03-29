// ─── Enums / Literals ─────────────────────────────────────────────
export type SensitivityLevel = 'public' | 'internal' | 'private' | 'critical';
export type RoutingTarget = 'local' | 'hybrid' | 'cloud';
export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';
export type NodeType =
  | 'trigger.manual'
  | 'trigger.webhook'
  | 'trigger.schedule'
  | 'ai.llm'
  | 'ai.classify'
  | 'ai.embed'
  | 'ai.summarise'
  | 'ai.extract'
  | 'ai.rewrite'
  | 'ai.translate'
  | 'ai.moderate'
  | 'logic.if'
  | 'logic.switch'
  | 'logic.merge'
  | 'logic.loop'
  | 'logic.wait'
  | 'data.set'
  | 'data.transform'
  | 'data.filter'
  | 'data.aggregate'
  | 'output.response'
  | 'output.log'
  | 'storage.read'
  | 'storage.write'
  | 'storage.list'
  | 'storage.delete'
  | 'storage.mkdir'
  | 'folder.connect'
  | 'folder.list'
  | 'folder.read'
  | 'folder.write'
  | 'folder.patch';

// ─── Core Structures ──────────────────────────────────────────────
export interface Position {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  position: Position;
  config: Record<string, unknown>;
  disabled: boolean;
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  sourceHandle: string; // 'main' | 'true' | 'false' | 'error'
  targetNodeId: string;
  targetHandle: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Classification ───────────────────────────────────────────────
export interface ClassificationResult {
  level: SensitivityLevel;
  detectedPatterns: string[];
  confidence: number;
  routingRecommendation: RoutingTarget;
  costEstimate?: ProjectCostEstimate;
}

// ─── Project Cost Estimation ──────────────────────────────────────
export interface ModelCostEstimate {
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  costINR: number;
}

export interface RoutingScenario {
  name: string;
  route: RoutingTarget;
  costUSD: number;
  costINR: number;
  savingsVsCloudUSD: number;
  savingsPercent: number;
}

export interface ProjectCostEstimate {
  /** Estimated tokens for the given payload/prompt */
  estimatedTokensIn: number;
  estimatedTokensOut: number;
  /** Per-model cost breakdown */
  byModel: ModelCostEstimate[];
  /** Routing scenario comparison */
  scenarios: RoutingScenario[];
  /** Recommended cheapest safe option */
  recommendedModel: string;
  recommendedRoute: RoutingTarget;
  /** Monthly projection (assumes executions/day) */
  monthlyProjection: {
    executionsPerDay: number;
    costUSD: number;
    costINR: number;
  };
  /** Data sensitivity drives routing */
  sensitivityLevel: SensitivityLevel;
}

// ─── LLM ──────────────────────────────────────────────────────────
export interface LLMResponse {
  text: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUSD: number;
  latencyMs: number;
  routing: RoutingTarget;
  sensitivity: SensitivityLevel;
  sanitizerApplied: boolean;
}

export interface RouterConfig {
  forceRoute?: 'auto' | RoutingTarget;
  preferredLocalModel?: string;
  preferredCloudModel?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

// ─── Execution ────────────────────────────────────────────────────
export interface NodeExecutionResult {
  nodeId: string;
  status: NodeStatus;
  output: Record<string, unknown>;
  error?: string;
  startedAt: string;
  finishedAt: string;
  llmMeta?: Pick<LLMResponse, 'model' | 'costUSD' | 'latencyMs' | 'routing' | 'sensitivity'>;
}

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  totalCostUSD: number;
  totalLatencyMs: number;
  nodeResults: NodeExecutionResult[];
  startedAt: string;
  finishedAt?: string;
}

export interface TriggerPayload {
  source: 'manual' | 'webhook' | 'schedule';
  data: Record<string, unknown>;
  triggeredAt: string;
}

// ─── Audit ────────────────────────────────────────────────────────
export interface AuditRow {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  sensitivityLevel: SensitivityLevel;
  detectedPatterns: string[];
  routingDecision: RoutingTarget;
  modelUsed: string;
  costUSD: number;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  sanitizerApplied: boolean;
  createdAt: string;
}

export interface CostSummary {
  totalCostUSD: number;
  totalCostINR: number;
  savingsVsAllCloudUSD: number;
  savingsPercent: number;
  byModel: Record<string, number>;
  byRoute: Record<RoutingTarget, number>;
  executionCount: number;
}

// ─── Providers ────────────────────────────────────────────────────
export interface ProviderStatus {
  ollama: boolean;
  lmstudio: boolean;
  openai: boolean;
  anthropic: boolean;
  gemini: boolean;
}

// ─── Node Handler ─────────────────────────────────────────────────
export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  nodeId: string;
  emit: (event: string, data: unknown) => void;
}

export interface NodeHandlerOutput {
  main?: unknown;
  true?: unknown;
  false?: unknown;
  error?: unknown;
}

export interface NodeHandler {
  execute(
    input: unknown,
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<NodeHandlerOutput>;
}

// ─── Node Registry ────────────────────────────────────────────────
export interface Handle {
  id: string;
  label: string;
  type: 'source' | 'target';
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'code' | 'expression' | 'password';
  default?: unknown;
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  description?: string;
  min?: number;
  max?: number;
}

export interface NodeMeta {
  type: NodeType;
  label: string;
  description: string;
  category: 'trigger' | 'ai' | 'logic' | 'data' | 'output' | 'storage';
  color: string;
  icon: string; // inline SVG path d= value
  handles: {
    inputs: Handle[];
    outputs: Handle[];
  };
  configSchema: ConfigField[];
}

// ─── WebSocket Events ─────────────────────────────────────────────
export type WSEvent =
  | { type: 'execution:started'; executionId: string; workflowId: string }
  | { type: 'node:running'; executionId: string; nodeId: string }
  | { type: 'node:done'; executionId: string; nodeId: string; result: NodeExecutionResult }
  | { type: 'node:error'; executionId: string; nodeId: string; error: string }
  | { type: 'execution:done'; executionId: string; summary: ExecutionSummary }
  | { type: 'providers:status'; status: ProviderStatus };

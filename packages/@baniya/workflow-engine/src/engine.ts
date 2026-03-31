import { EventEmitter } from 'events';
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  ExecutionSummary,
  NodeExecutionResult,
  TriggerPayload,
  NodeHandler,
  ExecutionContext,
  NodeHandlerOutput,
} from '@baniya/types';
import {
  triggerManualHandler,
  triggerWebhookHandler,
  triggerScheduleHandler,
  aiLlmHandler,
  aiClassifyHandler,
  aiEmbedHandler,
  aiSummariseHandler,
  aiExtractHandler,
  aiRewriteHandler,
  aiTranslateHandler,
  aiModerateHandler,
  aiOllamaHandler,
  aiAgentHandler,
  logicIfHandler,
  logicSwitchHandler,
  logicMergeHandler,
  logicLoopHandler,
  logicWaitHandler,
  dataSetHandler,
  dataTransformHandler,
  dataFilterHandler,
  dataAggregateHandler,
  outputResponseHandler,
  outputLogHandler,
  storageReadHandler,
  storageWriteHandler,
  storageListHandler,
  storageDeleteHandler,
  storageMkdirHandler,
  folderConnectHandler,
  folderListHandler,
  folderReadHandler,
  folderWriteHandler,
  folderPatchHandler,
  executeAgentNode,
  chatAgentNode,
} from './handlers';

const HANDLER_MAP: Record<NodeType, NodeHandler> = {
  'trigger.manual': triggerManualHandler,
  'trigger.webhook': triggerWebhookHandler,
  'trigger.schedule': triggerScheduleHandler,
  'ai.llm': aiLlmHandler,
  'ai.classify': aiClassifyHandler,
  'ai.embed': aiEmbedHandler,
  'ai.summarise': aiSummariseHandler,
  'ai.extract': aiExtractHandler,
  'ai.rewrite': aiRewriteHandler,
  'ai.translate': aiTranslateHandler,
  'ai.moderate': aiModerateHandler,
  'ai.ollama': aiOllamaHandler,
  'ai.agent': aiAgentHandler,
  'logic.if': logicIfHandler,
  'logic.switch': logicSwitchHandler,
  'logic.merge': logicMergeHandler,
  'logic.loop': logicLoopHandler,
  'logic.wait': logicWaitHandler,
  'data.set': dataSetHandler,
  'data.transform': dataTransformHandler,
  'data.filter': dataFilterHandler,
  'data.aggregate': dataAggregateHandler,
  'output.response': outputResponseHandler,
  'output.log': outputLogHandler,
  'storage.read': storageReadHandler,
  'storage.write': storageWriteHandler,
  'storage.list': storageListHandler,
  'storage.delete': storageDeleteHandler,
  'storage.mkdir': storageMkdirHandler,
  'folder.connect': folderConnectHandler,
  'folder.list': folderListHandler,
  'folder.read': folderReadHandler,
  'folder.write': folderWriteHandler,
  'folder.patch': folderPatchHandler,
  'agent.execute': executeAgentNode,
  'agent.chat': chatAgentNode,
};

export class WorkflowEngine extends EventEmitter {
  async execute(
    workflow: Workflow,
    trigger: TriggerPayload
  ): Promise<ExecutionSummary> {
    const executionId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const nodeResults: NodeExecutionResult[] = [];
    const nodeOutputs = new Map<string, unknown>();
    const skippedNodes = new Set<string>();

    this.emit('execution:started', { executionId, workflowId: workflow.id });

    // Topological sort
    const tiers = this.resolveExecutionOrder(workflow.nodes, workflow.edges);

    let hasError = false;

    for (const tier of tiers) {
      const promises = tier.map(async node => {
        if (node.disabled) {
          skippedNodes.add(node.id);
          const result: NodeExecutionResult = {
            nodeId: node.id,
            status: 'skipped',
            output: {},
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
          };
          nodeResults.push(result);
          return;
        }

        this.emit('node:running', { executionId, nodeId: node.id });

        const nodeStart = new Date().toISOString();

        try {
          // Gather input from upstream nodes
          const { input, skip, skipReason } = this.gatherInput(
            node,
            workflow.edges,
            nodeOutputs,
            trigger,
            skippedNodes
          );

          if (skip) {
            skippedNodes.add(node.id);
            const result: NodeExecutionResult = {
              nodeId: node.id,
              status: 'skipped',
              output: {},
              error: skipReason,
              startedAt: nodeStart,
              finishedAt: new Date().toISOString(),
            };
            nodeResults.push(result);
            this.emit('node:done', { executionId, nodeId: node.id, result });
            return;
          }

          const context: ExecutionContext = {
            workflowId: workflow.id,
            executionId,
            nodeId: node.id,
            emit: (event, data) => this.emit(event, data),
          };

          const handler = this.getNodeHandler(node.type);
          const handlerResult = await handler.execute(
            input,
            node.config,
            context
          );

          // Store node output for downstream nodes
          this.storeOutputs(
            node.id,
            handlerResult as NodeHandlerOutput & Record<string, unknown>,
            workflow.edges,
            nodeOutputs
          );

          const output =
            handlerResult.main ??
            handlerResult.true ??
            handlerResult.false ??
            handlerResult.error ??
            (handlerResult as Record<string, unknown>).private ??
            (handlerResult as Record<string, unknown>).public ??
            {};

          const result: NodeExecutionResult = {
            nodeId: node.id,
            status: 'success',
            output:
              typeof output === 'object' && output !== null
                ? (output as Record<string, unknown>)
                : { value: output },
            startedAt: nodeStart,
            finishedAt: new Date().toISOString(),
          };

          // Attach LLM meta if this was an AI node
          if (
            output &&
            typeof output === 'object' &&
            'model' in (output as Record<string, unknown>)
          ) {
            const llm = output as Record<string, unknown>;
            result.llmMeta = {
              model: String(llm.model ?? ''),
              costUSD: Number(llm.costUSD ?? 0),
              latencyMs: Number(llm.latencyMs ?? 0),
              routing: (llm.routing as 'local' | 'hybrid' | 'cloud') ?? 'cloud',
              sensitivity:
                (llm.sensitivity as
                  | 'public'
                  | 'internal'
                  | 'private'
                  | 'critical') ?? 'public',
            };
          }

          nodeResults.push(result);
          this.emit('node:done', { executionId, nodeId: node.id, result });
        } catch (err) {
          hasError = true;
          const errorMsg = err instanceof Error ? err.message : String(err);
          const result: NodeExecutionResult = {
            nodeId: node.id,
            status: 'error',
            output: {},
            error: errorMsg,
            startedAt: nodeStart,
            finishedAt: new Date().toISOString(),
          };
          nodeResults.push(result);
          skippedNodes.add(node.id); // treat errored as skipped for downstream

          // Store error output for error handle connections
          nodeOutputs.set(`${node.id}:error`, { error: errorMsg });

          this.emit('node:error', {
            executionId,
            nodeId: node.id,
            error: errorMsg,
          });
        }
      });

      await Promise.all(promises);
    }

    const totalCostUSD = nodeResults.reduce(
      (sum, r) => sum + (r.llmMeta?.costUSD ?? 0),
      0
    );
    const finishedAt = new Date().toISOString();
    const totalLatencyMs =
      new Date(finishedAt).getTime() - new Date(startedAt).getTime();

    const summary: ExecutionSummary = {
      id: executionId,
      workflowId: workflow.id,
      status: hasError ? 'error' : 'success',
      totalCostUSD,
      totalLatencyMs,
      nodeResults,
      startedAt,
      finishedAt,
    };

    this.emit('execution:done', { executionId, summary });
    return summary;
  }

  private resolveExecutionOrder(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowNode[][] {
    // Kahn's algorithm for topological sort
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      const targets = adjacency.get(edge.sourceNodeId);
      if (targets) targets.push(edge.targetNodeId);
      inDegree.set(
        edge.targetNodeId,
        (inDegree.get(edge.targetNodeId) ?? 0) + 1
      );
    }

    const tiers: WorkflowNode[][] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const remaining = new Set(nodes.map(n => n.id));

    while (remaining.size > 0) {
      const tier: WorkflowNode[] = [];
      for (const id of remaining) {
        if ((inDegree.get(id) ?? 0) === 0) {
          const node = nodeMap.get(id);
          if (node) tier.push(node);
        }
      }

      if (tier.length === 0) {
        // Cycle detected — add remaining nodes as a single tier to avoid infinite loop
        for (const id of remaining) {
          const node = nodeMap.get(id);
          if (node) tier.push(node);
        }
        tiers.push(tier);
        break;
      }

      tiers.push(tier);

      for (const node of tier) {
        remaining.delete(node.id);
        const targets = adjacency.get(node.id) ?? [];
        for (const target of targets) {
          inDegree.set(target, (inDegree.get(target) ?? 0) - 1);
        }
      }
    }

    return tiers;
  }

  private gatherInput(
    node: WorkflowNode,
    edges: WorkflowEdge[],
    nodeOutputs: Map<string, unknown>,
    trigger: TriggerPayload,
    skippedNodes: Set<string>
  ): { input: unknown; skip: boolean; skipReason?: string } {
    // Trigger nodes always run
    if (node.type.startsWith('trigger.')) {
      return { input: trigger.data, skip: false };
    }

    const incoming = edges.filter(e => e.targetNodeId === node.id);

    // No incoming edges — run with empty input (e.g. folder.connect is a source node)
    if (incoming.length === 0) return { input: {}, skip: false };

    // Check if ALL upstream nodes that feed this node either errored or were skipped
    // If so, skip this node too (cascade skip, not cascade error)
    const availableEdges: WorkflowEdge[] = [];
    const missingEdges: WorkflowEdge[] = [];

    for (const edge of incoming) {
      const key = `${edge.sourceNodeId}:${edge.sourceHandle}`;
      if (nodeOutputs.has(key)) {
        availableEdges.push(edge);
      } else {
        missingEdges.push(edge);
      }
    }

    // If upstream node errored/skipped, propagate skip
    if (availableEdges.length === 0) {
      const reasons = missingEdges.map(e => {
        const upstreamSkipped = skippedNodes.has(e.sourceNodeId);
        return upstreamSkipped
          ? `upstream node skipped`
          : `upstream node failed or produced a different output handle (${e.sourceHandle})`;
      });
      return { input: {}, skip: true, skipReason: reasons[0] };
    }

    // Single available input
    if (availableEdges.length === 1) {
      return {
        input:
          nodeOutputs.get(
            `${availableEdges[0].sourceNodeId}:${availableEdges[0].sourceHandle}`
          ) ?? {},
        skip: false,
      };
    }

    // Merge multiple available inputs
    const merged: Record<string, unknown> = {};
    for (const edge of availableEdges) {
      const output = nodeOutputs.get(
        `${edge.sourceNodeId}:${edge.sourceHandle}`
      );
      if (output && typeof output === 'object') Object.assign(merged, output);
    }
    return { input: merged, skip: false };
  }

  private storeOutputs(
    nodeId: string,
    result: NodeHandlerOutput & Record<string, unknown>,
    edges: WorkflowEdge[],
    nodeOutputs: Map<string, unknown>
  ): void {
    // Store each handle output
    for (const [handle, value] of Object.entries(result)) {
      if (value !== undefined) {
        nodeOutputs.set(`${nodeId}:${handle}`, value);
      }
    }
    // Also store as 'main' if not already set
    if (!result.main && Object.keys(result).length > 0) {
      const firstValue = Object.values(result).find(v => v !== undefined);
      if (firstValue) {
        nodeOutputs.set(`${nodeId}:main`, firstValue);
      }
    }
  }

  private getNodeHandler(type: NodeType): NodeHandler {
    const handler = HANDLER_MAP[type];
    if (!handler) {
      throw new Error(`No handler registered for node type: ${type}`);
    }
    return handler;
  }
}

import type { WorkflowNode, WorkflowEdge } from '@baniya/types';
import { AppDataSource } from './data-source';
import { WorkflowEntity } from './entities/Workflow';

export async function seedDemoWorkflow(userId: string): Promise<void> {
  const workflowRepo = AppDataSource.getRepository(WorkflowEntity);

  // Check if any workflows exist
  const count = await workflowRepo.count();
  if (count > 0) return;

  const nodes: WorkflowNode[] = [
    {
      id: 'node-1',
      type: 'trigger.manual',
      label: 'Manual Trigger',
      position: { x: 100, y: 250 },
      config: {},
      disabled: false,
    },
    {
      id: 'node-2',
      type: 'ai.classify',
      label: 'Baniya Classify',
      position: { x: 350, y: 250 },
      config: {},
      disabled: false,
    },
    {
      id: 'node-3',
      type: 'ai.llm',
      label: 'Local LLM',
      position: { x: 600, y: 150 },
      config: {
        prompt: 'Summarise the following privately:\n\n{{ input.data }}',
        forceRoute: 'local',
        maxTokens: 500,
        temperature: 0.7,
      },
      disabled: false,
    },
    {
      id: 'node-4',
      type: 'ai.llm',
      label: 'Cloud LLM',
      position: { x: 600, y: 350 },
      config: {
        prompt: 'Summarise the following concisely:\n\n{{ input.data }}',
        forceRoute: 'cloud',
        maxTokens: 500,
        temperature: 0.7,
      },
      disabled: false,
    },
    {
      id: 'node-5',
      type: 'logic.merge',
      label: 'Merge',
      position: { x: 850, y: 250 },
      config: {},
      disabled: false,
    },
    {
      id: 'node-6',
      type: 'data.set',
      label: 'Add Metadata',
      position: { x: 1100, y: 250 },
      config: {
        values: JSON.stringify({
          routing_used: '{{ input.routing }}',
          cost_usd: '{{ input.costUSD }}',
        }),
      },
      disabled: false,
    },
    {
      id: 'node-7',
      type: 'output.response',
      label: 'Response',
      position: { x: 1350, y: 250 },
      config: { statusCode: 200 },
      disabled: false,
    },
  ];

  const edges: WorkflowEdge[] = [
    { id: 'edge-1', sourceNodeId: 'node-1', sourceHandle: 'main', targetNodeId: 'node-2', targetHandle: 'in' },
    { id: 'edge-2', sourceNodeId: 'node-2', sourceHandle: 'private', targetNodeId: 'node-3', targetHandle: 'in' },
    { id: 'edge-3', sourceNodeId: 'node-2', sourceHandle: 'public', targetNodeId: 'node-4', targetHandle: 'in' },
    { id: 'edge-4', sourceNodeId: 'node-3', sourceHandle: 'main', targetNodeId: 'node-5', targetHandle: 'in' },
    { id: 'edge-5', sourceNodeId: 'node-4', sourceHandle: 'main', targetNodeId: 'node-5', targetHandle: 'in' },
    { id: 'edge-6', sourceNodeId: 'node-5', sourceHandle: 'main', targetNodeId: 'node-6', targetHandle: 'in' },
    { id: 'edge-7', sourceNodeId: 'node-6', sourceHandle: 'main', targetNodeId: 'node-7', targetHandle: 'in' },
  ];

  const workflow = workflowRepo.create({
    name: 'Baniya Demo — Classify & Route',
    description: 'Classifies data sensitivity, routes to local or cloud LLM, merges results, and responds. Shows the full Baniya value proposition.',
    userId,
    active: true,
    definition: { nodes, edges },
  });

  await workflowRepo.save(workflow);
  console.log('📋 Demo workflow seeded successfully');
}

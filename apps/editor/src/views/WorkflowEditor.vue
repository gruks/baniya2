<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="editor-layout">
      <!-- Toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <button class="btn btn-sm btn-secondary" @click="$router.push('/workflows')">← Back</button>
          <input v-model="workflowName" class="toolbar-name" @blur="autoSave" />
          <span :class="['badge', workflow?.active ? 'badge-success' : 'badge-muted']">{{ workflow?.active ? 'Active' : 'Inactive' }}</span>
        </div>
        <div class="toolbar-right">
          <span v-if="saving" class="toolbar-status">Saving...</span>
          <span v-else class="toolbar-status" style="color: var(--color-success);">✓ Saved</span>
          <button class="btn btn-sm btn-secondary" @click="saveWorkflow">Save</button>
          <button class="btn btn-sm btn-primary" @click="runWorkflow">▶ Run</button>
        </div>
      </div>

      <div class="editor-panels">
        <!-- Node Picker (Left) -->
        <div class="node-picker">
          <input v-model="nodeSearch" type="text" placeholder="Search nodes..." class="picker-search" />
          <div v-for="cat in categories" :key="cat.name" class="picker-category">
            <h4 class="cat-label">{{ cat.name }}</h4>
            <div v-for="node in cat.nodes" :key="node.type"
              class="picker-node"
              :style="{ '--cat-color': node.color }"
              draggable="true"
              @dragstart="(e) => onDragStart(e, node)">
              <div class="picker-color-bar"></div>
              <span class="picker-node-label">{{ node.label }}</span>
            </div>
          </div>
        </div>

        <!-- Canvas (Center) -->
        <div class="canvas-container" @drop="onDrop" @dragover.prevent>
          <VueFlow
            v-model:nodes="nodes"
            v-model:edges="edges"
            :node-types="nodeTypes"
            :default-viewport="{ x: 50, y: 50, zoom: 0.85 }"
            :snap-to-grid="true"
            :snap-grid="[15, 15]"
            @connect="onConnect"
            @node-click="onNodeClick"
            fit-view-on-init
          >
            <Background pattern-color="rgba(0,0,0,0.05)" :gap="15" />
            <Controls />
            <MiniMap />
          </VueFlow>
        </div>

        <!-- Config Panel (Right) -->
        <div v-if="selectedNode" class="config-panel">
          <div class="config-header">
            <h3>{{ selectedNode.data.label }}</h3>
            <button class="config-close" @click="selectedNode = null">✕</button>
          </div>
          <div class="config-body">
            <div class="form-group">
              <label class="form-label">Label</label>
              <input v-model="selectedNode.data.label" @change="autoSave" />
            </div>
            <div v-for="field in getConfigFields(selectedNode.data.type)" :key="field.key" class="form-group">
              <label class="form-label">{{ field.label }}</label>
              <select v-if="field.type === 'select'" v-model="selectedNode.data.config[field.key]" @change="autoSave">
                <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
              <textarea v-else-if="field.type === 'textarea' || field.type === 'code'" v-model="selectedNode.data.config[field.key]" rows="4" :placeholder="field.placeholder" @change="autoSave"></textarea>
              <input v-else-if="field.type === 'number'" type="number" v-model.number="selectedNode.data.config[field.key]" :min="field.min" :max="field.max" @change="autoSave" />
              <input v-else v-model="selectedNode.data.config[field.key]" :placeholder="field.placeholder" @change="autoSave" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, markRaw, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import AppSidebar from '../components/shared/AppSidebar.vue';
import BaniyaNode from '../components/canvas/BaniyaNode.vue';
import { useWorkflowsStore } from '../stores/workflows';
import { useWebSocket } from '../composables/useWebSocket';

type NodeMeta = { type: string; label: string; color: string; category: string; configSchema: any[] };

const NODE_REGISTRY: NodeMeta[] = [
  { type: 'trigger.manual', label: 'Manual Trigger', color: '#6366F1', category: 'trigger', configSchema: [] },
  { type: 'trigger.webhook', label: 'Webhook Trigger', color: '#6366F1', category: 'trigger', configSchema: [{ key: 'method', label: 'Method', type: 'select', options: [{ label: 'POST', value: 'POST' }, { label: 'GET', value: 'GET' }] }] },
  { type: 'trigger.schedule', label: 'Schedule Trigger', color: '#6366F1', category: 'trigger', configSchema: [{ key: 'cron', label: 'Cron', type: 'text', placeholder: '0 9 * * 1-5' }] },
  { type: 'ai.llm', label: 'AI LLM', color: '#0D9E75', category: 'ai', configSchema: [
    { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Your prompt here' },
    { key: 'systemPrompt', label: 'System Prompt', type: 'textarea' },
    { key: 'forceRoute', label: 'Route', type: 'select', options: [{ label: 'Auto', value: 'auto' }, { label: 'Local', value: 'local' }, { label: 'Hybrid', value: 'hybrid' }, { label: 'Cloud', value: 'cloud' }] },
    { key: 'maxTokens', label: 'Max Tokens', type: 'number', min: 1, max: 8000 },
    { key: 'temperature', label: 'Temperature', type: 'number', min: 0, max: 1 },
  ]},
  { type: 'ai.classify', label: 'Baniya Classify', color: '#0D9E75', category: 'ai', configSchema: [] },
  { type: 'ai.summarise', label: 'AI Summarise', color: '#0D9E75', category: 'ai', configSchema: [{ key: 'forceRoute', label: 'Route', type: 'select', options: [{ label: 'Auto', value: 'auto' }, { label: 'Local', value: 'local' }, { label: 'Cloud', value: 'cloud' }] }] },
  { type: 'ai.extract', label: 'AI Extract', color: '#0D9E75', category: 'ai', configSchema: [{ key: 'fields', label: 'Fields', type: 'textarea', placeholder: 'name, email' }] },
  { type: 'ai.rewrite', label: 'AI Rewrite', color: '#0D9E75', category: 'ai', configSchema: [{ key: 'tone', label: 'Tone', type: 'select', options: [{ label: 'Professional', value: 'professional' }, { label: 'Casual', value: 'casual' }] }] },
  { type: 'ai.translate', label: 'AI Translate', color: '#0D9E75', category: 'ai', configSchema: [{ key: 'language', label: 'Language', type: 'text', placeholder: 'Hindi' }] },
  { type: 'ai.embed', label: 'AI Embed', color: '#0D9E75', category: 'ai', configSchema: [] },
  { type: 'ai.moderate', label: 'AI Moderate', color: '#0D9E75', category: 'ai', configSchema: [] },
  { type: 'logic.if', label: 'IF', color: '#F59E0B', category: 'logic', configSchema: [{ key: 'expression', label: 'Condition', type: 'code', placeholder: "input.x > 5" }] },
  { type: 'logic.switch', label: 'Switch', color: '#F59E0B', category: 'logic', configSchema: [{ key: 'expression', label: 'Expression', type: 'code' }, { key: 'cases', label: 'Cases', type: 'textarea' }] },
  { type: 'logic.merge', label: 'Merge', color: '#F59E0B', category: 'logic', configSchema: [] },
  { type: 'logic.loop', label: 'Loop', color: '#F59E0B', category: 'logic', configSchema: [{ key: 'arrayField', label: 'Array Field', type: 'text' }] },
  { type: 'logic.wait', label: 'Wait', color: '#F59E0B', category: 'logic', configSchema: [{ key: 'seconds', label: 'Seconds', type: 'number', min: 0, max: 300 }] },
  { type: 'data.set', label: 'Set Data', color: '#8B5CF6', category: 'data', configSchema: [{ key: 'values', label: 'Values (JSON)', type: 'code', placeholder: '{ "key": "value" }' }] },
  { type: 'data.transform', label: 'Transform', color: '#8B5CF6', category: 'data', configSchema: [{ key: 'expression', label: 'Expression', type: 'code', placeholder: 'return { ...input }' }] },
  { type: 'data.filter', label: 'Filter', color: '#8B5CF6', category: 'data', configSchema: [{ key: 'expression', label: 'Filter', type: 'code', placeholder: 'item.age > 18' }] },
  { type: 'data.aggregate', label: 'Aggregate', color: '#8B5CF6', category: 'data', configSchema: [{ key: 'operation', label: 'Operation', type: 'select', options: [{ label: 'Count', value: 'count' }, { label: 'Sum', value: 'sum' }] }, { key: 'field', label: 'Field', type: 'text' }] },
  { type: 'output.response', label: 'Response', color: '#64748B', category: 'output', configSchema: [{ key: 'statusCode', label: 'Status Code', type: 'number' }] },
  { type: 'output.log', label: 'Log', color: '#64748B', category: 'output', configSchema: [{ key: 'label', label: 'Label', type: 'text' }] },
];

const route = useRoute();
const router = useRouter();
const store = useWorkflowsStore();
const { nodeStatuses, connect: wsConnect, resetNodeStatuses } = useWebSocket();

const nodes = ref<any[]>([]);
const edges = ref<any[]>([]);
const selectedNode = ref<any>(null);
const workflowName = ref('');
const workflow = ref<any>(null);
const saving = ref(false);
const nodeSearch = ref('');

const nodeTypes = { custom: markRaw(BaniyaNode) } as any;

const categories = computed(() => {
  const cats = [
    { name: 'Triggers', nodes: NODE_REGISTRY.filter(n => n.category === 'trigger') },
    { name: 'AI', nodes: NODE_REGISTRY.filter(n => n.category === 'ai') },
    { name: 'Logic', nodes: NODE_REGISTRY.filter(n => n.category === 'logic') },
    { name: 'Data', nodes: NODE_REGISTRY.filter(n => n.category === 'data') },
    { name: 'Output', nodes: NODE_REGISTRY.filter(n => n.category === 'output') },
  ];
  if (!nodeSearch.value) return cats;
  const q = nodeSearch.value.toLowerCase();
  return cats.map(c => ({
    ...c,
    nodes: c.nodes.filter(n => n.label.toLowerCase().includes(q)),
  })).filter(c => c.nodes.length > 0);
});

onMounted(async () => {
  const wf = await store.fetchOne(route.params.id as string);
  workflow.value = wf;
  workflowName.value = wf.name;

  nodes.value = (wf.nodes || []).map((n: any) => ({
    id: n.id,
    type: 'custom',
    position: n.position,
    data: { ...n, config: { ...n.config } },
  }));

  edges.value = (wf.edges || []).map((e: any) => ({
    id: e.id,
    source: e.sourceNodeId,
    sourceHandle: e.sourceHandle,
    target: e.targetNodeId,
    targetHandle: e.targetHandle,
    animated: true,
  }));

  wsConnect();
});

function onDragStart(event: DragEvent, node: NodeMeta) {
  event.dataTransfer?.setData('application/baniya-node', JSON.stringify(node));
}

function onDrop(event: DragEvent) {
  const data = event.dataTransfer?.getData('application/baniya-node');
  if (!data) return;
  const nodeMeta = JSON.parse(data);
  const id = `node-${Date.now()}`;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  nodes.value.push({
    id,
    type: 'custom',
    position: { x: event.clientX - rect.left - 90, y: event.clientY - rect.top - 20 },
    data: {
      id,
      type: nodeMeta.type,
      label: nodeMeta.label,
      config: {},
      disabled: false,
    },
  });
}

function onConnect(connection: any) {
  edges.value.push({
    id: `edge-${Date.now()}`,
    source: connection.source,
    sourceHandle: connection.sourceHandle || 'main',
    target: connection.target,
    targetHandle: connection.targetHandle || 'in',
    animated: true,
  });
}

function onNodeClick(event: any) {
  selectedNode.value = event.node;
}

function getConfigFields(type: string) {
  return NODE_REGISTRY.find(n => n.type === type)?.configSchema || [];
}

async function saveWorkflow() {
  saving.value = true;
  const wfNodes = nodes.value.map(n => ({
    id: n.id,
    type: n.data.type,
    label: n.data.label,
    position: n.position,
    config: n.data.config || {},
    disabled: n.data.disabled || false,
  }));
  const wfEdges = edges.value.map(e => ({
    id: e.id,
    sourceNodeId: e.source,
    sourceHandle: e.sourceHandle || 'main',
    targetNodeId: e.target,
    targetHandle: e.targetHandle || 'in',
  }));
  await store.save(route.params.id as string, {
    name: workflowName.value,
    nodes: wfNodes,
    edges: wfEdges,
  });
  saving.value = false;
}

function autoSave() {
  saveWorkflow();
}

async function runWorkflow() {
  await saveWorkflow();
  resetNodeStatuses();
  try {
    await store.execute(route.params.id as string);
  } catch (e: any) {
    alert(e.response?.data?.error || 'Execution failed');
  }
}
</script>

<style scoped>
.editor-layout { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.editor-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-bg-primary); min-height: 44px; }
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 8px; }
.toolbar-name { border: none; font-size: 15px; font-weight: 500; background: transparent; padding: 4px 8px; border-radius: var(--radius-sm); width: 220px; }
.toolbar-name:focus { background: var(--color-bg-secondary); outline: 1px solid var(--color-brand); }
.toolbar-status { font-size: 12px; color: var(--color-text-muted); }
.editor-panels { flex: 1; display: flex; overflow: hidden; }

/* Node Picker */
.node-picker { width: 240px; border-right: 1px solid var(--color-border); overflow-y: auto; padding: 12px; background: var(--color-bg-primary); }
.picker-search { width: 100%; margin-bottom: 12px; font-size: 12px; }
.cat-label { font-size: 11px; font-weight: 500; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; margin-top: 12px; }
.picker-node { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-sm); cursor: grab; transition: background 0.1s; font-size: 12px; margin-bottom: 2px; }
.picker-node:hover { background: var(--color-bg-secondary); }
.picker-color-bar { width: 3px; height: 18px; border-radius: 2px; background: var(--cat-color); flex-shrink: 0; }

/* Canvas */
.canvas-container { flex: 1; position: relative; }

/* Config Panel */
.config-panel { width: 300px; border-left: 1px solid var(--color-border); overflow-y: auto; padding: 16px; background: var(--color-bg-primary); }
.config-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.config-header h3 { font-size: 15px; font-weight: 500; }
.config-close { font-size: 18px; padding: 4px; border-radius: var(--radius-sm); }
.config-close:hover { background: var(--color-bg-tertiary); }
.config-body input, .config-body textarea, .config-body select { width: 100%; font-size: 12px; }
.config-body textarea { font-family: 'JetBrains Mono', 'Fira Code', monospace; resize: vertical; }
</style>

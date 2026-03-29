<template>
  <div class="baniya-node" :style="{ '--node-color': nodeColor }">
    <div class="node-header">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="nodeIcon" /></svg>
      <span class="node-label">{{ data.label }}</span>
    </div>
    <div class="node-body">
      <div v-for="preview in configPreviews" :key="preview.key" class="node-preview">
        <span class="preview-key">{{ preview.key }}:</span>
        <span class="preview-val">{{ preview.value }}</span>
      </div>
    </div>
    <div v-if="costBadge !== null" class="cost-badge">{{ costBadge }}</div>
    <Handle v-for="h in inputHandles" :key="h.id" type="target" :id="h.id" :position="Position.Left" :style="{ top: '50%' }" />
    <Handle v-for="(h, i) in outputHandles" :key="h.id" type="source" :id="h.id" :position="Position.Right" :style="{ top: getHandleTop(i, outputHandles.length) }" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';

const props = defineProps<{ data: any }>();

const NODE_COLORS: Record<string, string> = {
  trigger: '#6366F1', ai: '#0D9E75', logic: '#F59E0B', data: '#8B5CF6', output: '#64748B',
};

const ICONS: Record<string, string> = {
  'trigger.manual': 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
  'trigger.webhook': 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
  'trigger.schedule': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
  'ai.llm': 'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1.27a7 7 0 0 1-13.46 0H5a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2z',
  'ai.classify': 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  'logic.if': 'M12 2l10 10-10 10L2 12 12 2z',
  'logic.merge': 'M8 6l4 6 4-6 M8 18l4-6 4 6',
  'logic.wait': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l3 3',
  'data.set': 'M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  'output.response': 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z',
  'output.log': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
};

const HANDLE_DEFS: Record<string, { inputs: { id: string }[]; outputs: { id: string; label: string }[] }> = {
  'ai.classify': { inputs: [{ id: 'in' }], outputs: [{ id: 'private', label: 'Private' }, { id: 'public', label: 'Public' }] },
  'logic.if': { inputs: [{ id: 'in' }], outputs: [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }] },
};

const category = computed(() => {
  const type = props.data.type as string;
  if (type.startsWith('trigger')) return 'trigger';
  if (type.startsWith('ai')) return 'ai';
  if (type.startsWith('logic')) return 'logic';
  if (type.startsWith('data')) return 'data';
  return 'output';
});

const nodeColor = computed(() => NODE_COLORS[category.value] || '#64748B');
const nodeIcon = computed(() => ICONS[props.data.type] || ICONS['ai.llm'] || '');

const inputHandles = computed(() => {
  const custom = HANDLE_DEFS[props.data.type];
  if (custom) return custom.inputs;
  return props.data.type.startsWith('trigger') ? [] : [{ id: 'in' }];
});

const outputHandles = computed(() => {
  const custom = HANDLE_DEFS[props.data.type];
  if (custom) return custom.outputs;
  if (props.data.type === 'output.response' || props.data.type === 'output.log') return [];
  return [{ id: 'main', label: 'Output' }];
});

const configPreviews = computed(() => {
  const config = props.data.config || {};
  const entries = Object.entries(config).slice(0, 2);
  return entries.map(([key, val]) => ({
    key,
    value: String(val).slice(0, 40) + (String(val).length > 40 ? '...' : ''),
  }));
});

const costBadge = computed(() => {
  const status = props.data.executionStatus;
  if (!status || status === 'idle') return null;
  const cost = props.data.executionCost ?? 0;
  return cost === 0 ? 'free' : `$${cost.toFixed(4)}`;
});

function getHandleTop(index: number, total: number) {
  if (total === 1) return '50%';
  const step = 100 / (total + 1);
  return `${step * (index + 1)}%`;
}
</script>

<style scoped>
.baniya-node {
  background: var(--color-bg-primary);
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  min-width: 180px;
  max-width: 240px;
  font-size: 12px;
  overflow: hidden;
  position: relative;
  transition: border-color 0.2s;
}
.baniya-node:hover { border-color: var(--node-color); }
.node-header {
  background: var(--node-color);
  color: #fff;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  font-size: 12px;
}
.node-body {
  padding: 8px 10px;
}
.node-preview {
  margin-bottom: 2px;
  color: var(--color-text-secondary);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-key { color: var(--color-text-muted); }
.preview-val { margin-left: 4px; }
.cost-badge {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 10px;
  background: var(--color-bg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  color: var(--color-brand);
  font-weight: 500;
}
</style>

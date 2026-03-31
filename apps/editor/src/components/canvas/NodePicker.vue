<template>
  <div class="node-picker">
    <input
      v-model="search"
      type="text"
      placeholder="Search nodes..."
      class="picker-search"
    />
    <div
      v-for="cat in filteredCategories"
      :key="cat.name"
      class="picker-category"
    >
      <h4 class="cat-label" :style="{ color: cat.color }">{{ cat.name }}</h4>
      <div
        v-for="node in cat.nodes"
        :key="node.type"
        class="picker-node"
        :style="{ '--cat-color': node.color }"
        draggable="true"
        @dragstart="onDragStart($event, node)"
      >
        <div class="picker-color-bar"></div>
        <div class="picker-node-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path :d="node.icon" />
          </svg>
        </div>
        <div class="picker-node-content">
          <span class="picker-node-label">{{ node.label }}</span>
          <span class="picker-node-desc">{{ node.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { NODE_REGISTRY } from '@baniya/nodes';

interface NodeMeta {
  type: string;
  label: string;
  description: string;
  color: string;
  category: string;
  icon: string;
  configSchema: unknown[];
}

const search = ref('');

const categoryInfo: Record<string, { name: string; color: string }> = {
  trigger: { name: 'Triggers', color: '#6366F1' },
  ai: { name: 'AI', color: '#0D9E75' },
  logic: { name: 'Logic', color: '#F59E0B' },
  data: { name: 'Data', color: '#8B5CF6' },
  storage: { name: 'Storage', color: '#0EA5E9' },
  output: { name: 'Output', color: '#64748B' },
  agent: { name: 'Agent', color: '#8B5CF6' },
  folder: { name: 'Folder', color: '#EA580C' },
};

const filteredCategories = computed(() => {
  const nodes = NODE_REGISTRY as NodeMeta[];

  // Group by category
  const grouped: Record<string, NodeMeta[]> = {};
  for (const node of nodes) {
    const cat = node.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(node);
  }

  // Filter by search
  const q = search.value.toLowerCase();
  const result = Object.entries(grouped)
    .map(([cat, nodes]) => {
      const filtered = q
        ? nodes.filter(n => n.label.toLowerCase().includes(q))
        : nodes;
      return {
        name: categoryInfo[cat]?.name || cat,
        color: categoryInfo[cat]?.color || '#888',
        nodes: filtered,
      };
    })
    .filter(c => c.nodes.length > 0);

  return result;
});

function onDragStart(event: DragEvent, node: NodeMeta) {
  event.dataTransfer?.setData(
    'application/baniya-node',
    JSON.stringify({
      type: node.type,
      label: node.label,
      color: node.color,
      category: node.category,
      configSchema: node.configSchema,
    })
  );
}
</script>

<style scoped>
.node-picker {
  width: 280px;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 12px;
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.picker-search {
  width: 100%;
  margin-bottom: 12px;
  font-size: 13px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.picker-search:focus {
  outline: none;
  border-color: var(--color-brand);
}

.picker-category {
  margin-bottom: 8px;
}

.cat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  margin-top: 16px;
  padding-left: 4px;
}

.picker-node {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: background 0.15s;
  font-size: 12px;
  margin-bottom: 4px;
}

.picker-node:hover {
  background: var(--color-bg-secondary);
}

.picker-node:active {
  cursor: grabbing;
}

.picker-color-bar {
  width: 3px;
  height: 32px;
  border-radius: 2px;
  background: var(--cat-color);
  flex-shrink: 0;
  margin-top: 2px;
}

.picker-node-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.picker-node-content {
  flex: 1;
  min-width: 0;
}

.picker-node-label {
  display: block;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.picker-node-desc {
  display: block;
  font-size: 10px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

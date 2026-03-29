<template>
  <div class="audit-table-wrap">
    <div class="audit-filters">
      <select v-model="filterSensitivity" class="filter-select">
        <option value="">All Sensitivity</option>
        <option value="critical">Critical</option>
        <option value="private">Private</option>
        <option value="internal">Internal</option>
        <option value="public">Public</option>
      </select>
      <select v-model="sortCol" class="filter-select">
        <option value="createdAt">Sort: Time</option>
        <option value="costUSD">Sort: Cost</option>
        <option value="latencyMs">Sort: Latency</option>
      </select>
      <button class="sort-btn" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">
        {{ sortDir === 'asc' ? '↑' : '↓' }}
      </button>
    </div>

    <table class="audit-table">
      <thead>
        <tr>
          <th>Time</th><th>Workflow</th><th>Node</th>
          <th>Sensitivity</th><th>Route</th><th>Model</th>
          <th>Cost</th><th>Latency</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in sorted" :key="row.id">
          <td>{{ fmt(row.createdAt) }}</td>
          <td>{{ row.workflowId?.slice(0, 8) }}…</td>
          <td>{{ row.nodeId }}</td>
          <td><span :class="['badge', sensitivityBadge(row.sensitivityLevel)]">{{ row.sensitivityLevel }}</span></td>
          <td><span :class="['badge', routeBadge(row.routingDecision)]">{{ row.routingDecision }}</span></td>
          <td>{{ row.modelUsed }}</td>
          <td>${{ row.costUSD.toFixed(5) }}</td>
          <td>{{ row.latencyMs }}ms</td>
        </tr>
        <tr v-if="sorted.length === 0">
          <td colspan="8" class="empty-row">No audit entries yet</td>
        </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button class="btn btn-sm btn-secondary" :disabled="page <= 1" @click="$emit('page', page - 1)">‹ Prev</button>
      <span class="page-info">Page {{ page }} · {{ total }} total</span>
      <button class="btn btn-sm btn-secondary" :disabled="page * limit >= total" @click="$emit('page', page + 1)">Next ›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  rows: any[];
  total: number;
  page: number;
  limit: number;
}>();

defineEmits<{ (e: 'page', p: number): void }>();

const filterSensitivity = ref('');
const sortCol = ref('createdAt');
const sortDir = ref<'asc' | 'desc'>('desc');

const sorted = computed(() => {
  let r = props.rows;
  if (filterSensitivity.value) r = r.filter(x => x.sensitivityLevel === filterSensitivity.value);
  return [...r].sort((a, b) => {
    const av = a[sortCol.value], bv = b[sortCol.value];
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir.value === 'asc' ? cmp : -cmp;
  });
});

function fmt(d: string) { return new Date(d).toLocaleString(); }
function sensitivityBadge(l: string) {
  return { critical: 'badge-error', private: 'badge-warning', internal: 'badge-info', public: 'badge-success' }[l] ?? 'badge-muted';
}
function routeBadge(r: string) {
  return { local: 'badge-success', hybrid: 'badge-warning', cloud: 'badge-info' }[r] ?? 'badge-muted';
}
</script>

<style scoped>
.audit-filters { display: flex; gap: 8px; margin-bottom: 12px; align-items: center; }
.filter-select { background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-text-primary); padding: 4px 8px; font-size: 12px; }
.sort-btn { background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 4px 10px; cursor: pointer; font-size: 13px; }
.audit-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.audit-table th { text-align: left; padding: 8px; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); font-weight: 500; }
.audit-table td { padding: 8px; border-bottom: 1px solid var(--color-border); }
.empty-row { text-align: center; color: var(--color-text-muted); padding: 24px; }
.pagination { display: flex; align-items: center; gap: 12px; margin-top: 12px; font-size: 12px; }
.page-info { color: var(--color-text-muted); }
</style>

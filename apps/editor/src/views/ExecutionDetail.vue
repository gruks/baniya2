<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="app-content">
      <header class="topbar">
        <button class="btn btn-sm btn-secondary" @click="$router.push('/workflows')">← Back</button>
        <h1 class="topbar-title">Execution Detail</h1>
      </header>
      <div class="page-container">
        <div v-if="loading" class="loading-state"><div class="spinner"></div></div>
        <template v-else-if="execution">
          <div class="exec-summary">
            <div class="card summary-card">
              <div class="card-label">Status</div>
              <span :class="['badge', execution.status === 'success' ? 'badge-success' : 'badge-error']">{{ execution.status }}</span>
            </div>
            <div class="card summary-card">
              <div class="card-label">Total Cost</div>
              <div class="card-value">${{ execution.totalCostUSD?.toFixed(5) || '0' }}</div>
            </div>
            <div class="card summary-card">
              <div class="card-label">Duration</div>
              <div class="card-value">{{ execution.totalLatencyMs }}ms</div>
            </div>
            <div class="card summary-card">
              <div class="card-label">Started</div>
              <div class="card-value" style="font-size:13px;">{{ formatDate(execution.startedAt) }}</div>
            </div>
          </div>

          <h3 style="margin: 20px 0 12px; font-weight: 500;">Node Results</h3>
          <div class="timeline">
            <div v-for="result in execution.nodeResults" :key="result.nodeId" class="timeline-item card">
              <div class="timeline-header">
                <span :class="['badge', result.status === 'success' ? 'badge-success' : result.status === 'error' ? 'badge-error' : 'badge-muted']">{{ result.status }}</span>
                <span class="timeline-node-id">{{ result.nodeId }}</span>
                <span v-if="result.llmMeta" class="badge badge-info">{{ result.llmMeta.routing }}</span>
              </div>
              <div v-if="result.error" class="timeline-error">{{ result.error }}</div>
              <div v-if="result.llmMeta" class="timeline-meta">
                <span>Model: {{ result.llmMeta.model }}</span>
                <span>Cost: ${{ result.llmMeta.costUSD?.toFixed(5) }}</span>
                <span>{{ result.llmMeta.latencyMs }}ms</span>
              </div>
              <pre v-if="Object.keys(result.output || {}).length" class="timeline-output">{{ JSON.stringify(result.output, null, 2).slice(0, 500) }}</pre>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppSidebar from '../components/shared/AppSidebar.vue';
import { executionsApi } from '../api/executions';

const route = useRoute();
const execution = ref<any>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await executionsApi.get(route.params.id as string);
    execution.value = res.data;
  } finally {
    loading.value = false;
  }
});

function formatDate(d: string) { return new Date(d).toLocaleString(); }
</script>

<style scoped>
.topbar { display: flex; align-items: center; gap: 12px; padding: 10px 24px; border-bottom: 1px solid var(--color-border); }
.topbar-title { font-size: 18px; font-weight: 500; }
.loading-state { display: flex; justify-content: center; padding: 60px; }
.exec-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.summary-card .card-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.summary-card .card-value { font-size: 18px; font-weight: 500; }
.timeline { display: flex; flex-direction: column; gap: 8px; }
.timeline-item { padding: 12px; }
.timeline-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.timeline-node-id { font-weight: 500; font-size: 13px; }
.timeline-error { color: var(--color-error); font-size: 12px; margin-bottom: 6px; }
.timeline-meta { display: flex; gap: 16px; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 6px; }
.timeline-output { font-size: 11px; background: var(--color-bg-secondary); padding: 8px; border-radius: var(--radius-sm); overflow-x: auto; max-height: 200px; }
</style>

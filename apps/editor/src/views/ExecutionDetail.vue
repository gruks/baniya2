<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="app-content">
      <header class="topbar">
        <button
          class="btn btn-sm btn-secondary"
          @click="$router.push('/workflows')"
        >
          ← Back
        </button>
        <h1 class="topbar-title">Execution Detail</h1>
      </header>
      <div class="page-container">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>
        <template v-else-if="execution">
          <!-- Overall Execution Summary -->
          <div class="exec-summary">
            <div class="card summary-card">
              <div class="card-label">Status</div>
              <span
                :class="[
                  'badge',
                  execution.status === 'success'
                    ? 'badge-success'
                    : 'badge-error',
                ]"
                >{{ execution.status }}</span
              >
            </div>
            <div class="card summary-card">
              <div class="card-label">Total Cost</div>
              <div class="card-value">
                ${{ execution.totalCostUSD?.toFixed(5) || '0.00000' }}
              </div>
            </div>
            <div class="card summary-card">
              <div class="card-label">Duration</div>
              <div class="card-value">
                {{ formatDuration(execution.totalLatencyMs) }}
              </div>
            </div>
            <div class="card summary-card">
              <div class="card-label">Started</div>
              <div class="card-value" style="font-size: 13px">
                {{ formatDate(execution.startedAt) }}
              </div>
            </div>
          </div>

          <!-- Node Result Timeline -->
          <h3 class="timeline-heading">
            Node Results ({{ execution.nodeResults?.length || 0 }})
          </h3>
          <div class="timeline">
            <div
              v-for="(result, index) in sortedResults"
              :key="result.nodeId"
              :class="['timeline-item', `timeline-${result.status}`]"
            >
              <div class="timeline-index">{{ index + 1 }}</div>
              <div class="timeline-body card">
                <div class="timeline-header">
                  <span :class="['status-icon', `status-${result.status}`]">
                    {{ statusIcon(result.status) }}
                  </span>
                  <span class="timeline-node-name">{{
                    getNodeLabel(result.nodeId)
                  }}</span>
                  <span class="timeline-node-type">{{
                    getNodeType(result.nodeId)
                  }}</span>
                  <span class="timeline-duration">{{
                    formatDuration(nodeDuration(result))
                  }}</span>
                  <span v-if="result.llmMeta" class="timeline-cost"
                    >${{ result.llmMeta.costUSD?.toFixed(5) }}</span
                  >
                  <button
                    v-if="result.error"
                    class="btn-expand"
                    @click="toggleExpand(result.nodeId)"
                  >
                    {{ expandedNodes.has(result.nodeId) ? '▲' : '▼' }}
                  </button>
                </div>

                <!-- Routing & Sensitivity Badges for AI Nodes -->
                <div v-if="result.llmMeta" class="timeline-badges">
                  <span class="badge badge-info">{{
                    result.llmMeta.routing
                  }}</span>
                  <span
                    :class="[
                      'badge',
                      sensitivityBadge(result.llmMeta.sensitivity),
                    ]"
                  >
                    {{ result.llmMeta.sensitivity }}
                  </span>
                  <span class="timeline-model"
                    >Model: {{ result.llmMeta.model }}</span
                  >
                </div>

                <!-- Error Message (always visible for errors) -->
                <div
                  v-if="result.error && !expandedNodes.has(result.nodeId)"
                  class="timeline-error-brief"
                >
                  {{ result.error }}
                </div>

                <!-- Expandable Error Detail -->
                <div
                  v-if="result.error && expandedNodes.has(result.nodeId)"
                  class="timeline-error-detail"
                >
                  <div class="error-label">Error Details</div>
                  <pre class="error-pre">{{ result.error }}</pre>
                </div>

                <!-- Node Output -->
                <div
                  v-if="
                    !result.error &&
                    result.output &&
                    Object.keys(result.output).length
                  "
                  class="timeline-output"
                >
                  <pre>{{ formatOutput(result.output) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </template>
        <EmptyState
          v-else
          title="Execution not found"
          description="This execution may have been deleted or never existed"
          action="Back to Workflows"
          @action="$router.push('/workflows')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppSidebar from '../components/shared/AppSidebar.vue';
import EmptyState from '../components/shared/EmptyState.vue';
import { executionsApi } from '../api/executions';

const route = useRoute();
const execution = ref<any>(null);
const loading = ref(true);
const expandedNodes = ref(new Set<string>());

// Sort results chronologically by startedAt
const sortedResults = computed(() => {
  const results = execution.value?.nodeResults || [];
  return [...results].sort((a, b) => {
    const ta = new Date(a.startedAt || 0).getTime();
    const tb = new Date(b.startedAt || 0).getTime();
    return ta - tb;
  });
});

onMounted(async () => {
  try {
    const res = await executionsApi.get(route.params.id as string);
    execution.value = res.data;
  } finally {
    loading.value = false;
  }
});

function formatDate(d: string) {
  return new Date(d).toLocaleString();
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function nodeDuration(result: any): number {
  if (result.llmMeta?.latencyMs) return result.llmMeta.latencyMs;
  if (result.startedAt && result.finishedAt) {
    return (
      new Date(result.finishedAt).getTime() -
      new Date(result.startedAt).getTime()
    );
  }
  return 0;
}

function statusIcon(status: string): string {
  switch (status) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'running':
      return '…';
    case 'skipped':
      return '—';
    default:
      return '·';
  }
}

function sensitivityBadge(level: string): string {
  switch (level) {
    case 'critical':
      return 'badge-error';
    case 'private':
      return 'badge-warning';
    case 'internal':
      return 'badge-info';
    case 'public':
      return 'badge-success';
    default:
      return 'badge-muted';
  }
}

function getNodeLabel(nodeId: string): string {
  // Try to find node label from workflow definition
  const nodes = execution.value?.workflow?.nodes || [];
  const node = nodes.find((n: any) => n.id === nodeId);
  return node?.label || nodeId;
}

function getNodeType(nodeId: string): string {
  const nodes = execution.value?.workflow?.nodes || [];
  const node = nodes.find((n: any) => n.id === nodeId);
  return node?.type || '';
}

function toggleExpand(nodeId: string) {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
  }
  expandedNodes.value = new Set(expandedNodes.value);
}

function formatOutput(output: Record<string, unknown>): string {
  try {
    const str = JSON.stringify(output, null, 2);
    return str.length > 1000 ? str.slice(0, 1000) + '\n… (truncated)' : str;
  } catch {
    return String(output);
  }
}
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--color-border);
}
.topbar-title {
  font-size: 18px;
  font-weight: 500;
}
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px;
}

/* Summary Cards */
.exec-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.summary-card .card-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.summary-card .card-value {
  font-size: 18px;
  font-weight: 500;
}

/* Timeline Heading */
.timeline-heading {
  margin: 24px 0 12px;
  font-weight: 500;
  font-size: 15px;
}

/* Timeline Layout */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.timeline-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.timeline-index {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
}
.timeline-body {
  flex: 1;
  padding: 12px;
}

/* Status-specific borders */
.timeline-success {
}
.timeline-success .timeline-body {
  border-left: 3px solid var(--color-success);
}
.timeline-error .timeline-body {
  border-left: 3px solid var(--color-error);
}
.timeline-skipped .timeline-body {
  border-left: 3px solid var(--color-text-muted);
  opacity: 0.7;
}

/* Timeline Header Row */
.timeline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.status-icon {
  font-size: 12px;
  font-weight: 700;
  width: 18px;
  text-align: center;
}
.status-success {
  color: var(--color-success);
}
.status-error {
  color: var(--color-error);
}
.status-running {
  color: var(--color-warning);
}
.status-skipped {
  color: var(--color-text-muted);
}
.timeline-node-name {
  font-weight: 500;
  font-size: 13px;
}
.timeline-node-type {
  font-size: 11px;
  color: var(--color-text-muted);
  font-family: monospace;
}
.timeline-duration {
  font-size: 11px;
  color: var(--color-text-secondary);
}
.timeline-cost {
  font-size: 11px;
  color: var(--color-brand);
  font-weight: 500;
}
.btn-expand {
  font-size: 10px;
  color: var(--color-text-muted);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
}
.btn-expand:hover {
  background: var(--color-bg-tertiary);
}

/* Badges Row */
.timeline-badges {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.timeline-model {
  font-size: 11px;
  color: var(--color-text-secondary);
}

/* Error Display */
.timeline-error-brief {
  color: var(--color-error);
  font-size: 12px;
}
.timeline-error-detail {
  background: rgba(239, 68, 68, 0.06);
  border-radius: var(--radius-sm);
  padding: 8px;
  margin-top: 6px;
}
.error-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-error);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.error-pre {
  font-size: 11px;
  color: var(--color-error);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

/* Output Display */
.timeline-output {
  font-size: 11px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  padding: 8px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}
.timeline-output pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="app-content">
      <header class="topbar">
        <h1 class="topbar-title">Baniya Dashboard</h1>
      </header>
      <div class="page-container">
        <!-- Provider Status Bar -->
        <div class="provider-bar">
          <div v-for="(active, name) in providers.status" :key="name" class="provider-item">
            <span :class="['provider-dot', active ? 'dot-active' : 'dot-inactive']"></span>
            <span class="provider-name">{{ name }}</span>
            <span class="provider-label">{{ getProviderLabel(name as string, active as boolean) }}</span>
          </div>
        </div>

        <!-- Cost Summary Cards -->
        <div class="summary-cards">
          <div class="card summary-card">
            <div class="card-label">Total Spend (30d)</div>
            <div class="card-value">₹ {{ (cost.totalCostINR || 0).toFixed(2) }}</div>
            <div class="card-sub">${{ (cost.totalCostUSD || 0).toFixed(4) }}</div>
          </div>
          <div class="card summary-card">
            <div class="card-label">If All Cloud</div>
            <div class="card-value">₹ {{ ((cost.totalCostINR || 0) + (cost.savingsVsAllCloudUSD || 0) * 83).toFixed(2) }}</div>
            <div class="card-sub">${{ ((cost.totalCostUSD || 0) + (cost.savingsVsAllCloudUSD || 0)).toFixed(4) }}</div>
          </div>
          <div class="card summary-card highlight">
            <div class="card-label">Baniya Saved</div>
            <div class="card-value">₹ {{ ((cost.savingsVsAllCloudUSD || 0) * 83).toFixed(2) }}</div>
            <div class="card-sub">{{ (cost.savingsPercent || 0).toFixed(1) }}% savings</div>
          </div>
          <div class="card summary-card">
            <div class="card-label">Executions</div>
            <div class="card-value">{{ cost.executionCount || 0 }}</div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-row">
          <div class="card chart-card">
            <h3>Routing Distribution</h3>
            <canvas ref="donutCanvas" width="300" height="300"></canvas>
          </div>
          <div class="card chart-card">
            <h3>Recent Cost Breakdown</h3>
            <div class="chart-placeholder">
              <div v-for="(val, key) in cost.byRoute" :key="key" class="route-bar">
                <span class="route-label">{{ key }}</span>
                <div class="route-fill" :style="{ width: getRouteWidth(val), background: getRouteColor(String(key)) }"></div>
                <span class="route-val">${{ (val as number).toFixed(4) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Audit Table -->
        <div class="card" style="margin-top: 20px;">
          <h3 style="margin-bottom: 12px;">Audit Log</h3>
          <table class="audit-table">
            <thead>
              <tr>
                <th>Time</th><th>Workflow</th><th>Node</th><th>Sensitivity</th><th>Route</th><th>Model</th><th>Cost</th><th>Latency</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in auditRows" :key="row.id">
                <td>{{ formatDate(row.createdAt) }}</td>
                <td>{{ row.workflowId?.slice(0, 8) }}...</td>
                <td>{{ row.nodeId }}</td>
                <td><span :class="['badge', sensitivityBadge(row.sensitivityLevel)]">{{ row.sensitivityLevel }}</span></td>
                <td><span :class="['badge', routeBadge(row.routingDecision)]">{{ row.routingDecision }}</span></td>
                <td>{{ row.modelUsed }}</td>
                <td>${{ row.costUSD.toFixed(4) }}</td>
                <td>{{ row.latencyMs }}ms</td>
              </tr>
              <tr v-if="auditRows.length === 0"><td colspan="8" style="text-align:center; color: var(--color-text-muted);">No audit entries yet</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AppSidebar from '../components/shared/AppSidebar.vue';
import { baniyaApi } from '../api/baniya';
import { useProvidersStore } from '../stores/providers';

const providers = useProvidersStore();
const cost = ref<any>({});
const auditRows = ref<any[]>([]);
const donutCanvas = ref<HTMLCanvasElement | null>(null);

onMounted(async () => {
  providers.startPolling();
  try {
    const [costRes, auditRes] = await Promise.all([
      baniyaApi.costSummary(),
      baniyaApi.audit({ page: 1, limit: 20 }),
    ]);
    cost.value = costRes.data;
    auditRows.value = auditRes.data.rows || [];
    drawDonut();
  } catch { /* ok */ }
});

onUnmounted(() => providers.stopPolling());

function getProviderLabel(name: string, active: boolean) {
  if (name === 'ollama' || name === 'lmstudio') return active ? 'running' : 'offline';
  return active ? 'configured' : 'missing key';
}

function formatDate(d: string) { return new Date(d).toLocaleString(); }

function sensitivityBadge(level: string) {
  switch (level) { case 'critical': return 'badge-error'; case 'private': return 'badge-warning'; case 'internal': return 'badge-info'; default: return 'badge-success'; }
}

function routeBadge(route: string) {
  switch (route) { case 'local': return 'badge-success'; case 'hybrid': return 'badge-warning'; default: return 'badge-info'; }
}

function getRouteWidth(val: unknown) {
  const max = Math.max(...Object.values(cost.value.byRoute || { x: 1 }).map(Number));
  return max > 0 ? `${(Number(val) / max) * 100}%` : '0%';
}

function getRouteColor(route: string) {
  switch (route) { case 'local': return 'var(--color-success)'; case 'hybrid': return 'var(--color-warning)'; default: return 'var(--color-info)'; }
}

function drawDonut() {
  if (!donutCanvas.value) return;
  const ctx = donutCanvas.value.getContext('2d');
  if (!ctx) return;
  const byRoute = cost.value.byRoute || {};
  const total = Object.values(byRoute).reduce((s: number, v) => s + Number(v), 0) as number;
  if (total === 0) {
    ctx.font = '14px system-ui';
    ctx.fillStyle = '#9CA3AF';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet', 150, 150);
    return;
  }
  const colors = { local: '#10B981', hybrid: '#F59E0B', cloud: '#3B82F6' } as Record<string, string>;
  let start = -Math.PI / 2;
  const cx = 150, cy = 150, r = 100, ir = 60;
  for (const [key, val] of Object.entries(byRoute)) {
    const angle = (Number(val) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.arc(cx, cy, ir, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = colors[key] || '#64748B';
    ctx.fill();
    start += angle;
  }
}
</script>

<style scoped>
.topbar { display: flex; align-items: center; padding: 10px 24px; border-bottom: 1px solid var(--color-border); background: var(--color-bg-primary); }
.topbar-title { font-size: 18px; font-weight: 500; }
.provider-bar { display: flex; gap: 24px; padding: 12px 0; margin-bottom: 16px; }
.provider-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.provider-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-active { background: var(--color-success); }
.dot-inactive { background: var(--color-text-muted); }
.provider-name { font-weight: 500; text-transform: capitalize; }
.provider-label { color: var(--color-text-muted); }
.summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.summary-card .card-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.summary-card .card-value { font-size: 22px; font-weight: 500; }
.summary-card .card-sub { font-size: 12px; color: var(--color-text-muted); }
.summary-card.highlight { border-left: 3px solid var(--color-brand); }
.summary-card.highlight .card-value { color: var(--color-brand); }
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-card h3 { font-size: 14px; font-weight: 500; margin-bottom: 12px; }
.route-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; }
.route-label { width: 50px; }
.route-fill { height: 20px; border-radius: var(--radius-sm); min-width: 4px; }
.route-val { color: var(--color-text-muted); }
.audit-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.audit-table th { text-align: left; padding: 8px; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); font-weight: 500; }
.audit-table td { padding: 8px; border-bottom: 1px solid var(--color-border); }
</style>

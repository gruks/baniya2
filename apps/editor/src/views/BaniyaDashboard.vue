<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="app-content">
      <header class="topbar">
        <h1 class="topbar-title">Baniya Dashboard</h1>
      </header>
      <div class="page-container">
        <!-- Provider Status -->
        <div class="card" style="margin-bottom: 16px; padding: 12px 16px">
          <ProviderStatus
            :status="providers.status as Record<string, boolean>"
          />
        </div>

        <!-- Cost Summary Cards -->
        <div class="summary-cards">
          <CostCard
            label="Total Spend (30d)"
            :usd="cost.totalCostUSD || 0"
            :inr="cost.totalCostINR || 0"
          />
          <CostCard
            label="If All Cloud"
            :usd="(cost.totalCostUSD || 0) + (cost.savingsVsAllCloudUSD || 0)"
            :inr="
              ((cost.totalCostUSD || 0) + (cost.savingsVsAllCloudUSD || 0)) * 83
            "
          />
          <SavingsCard
            :usd="cost.savingsVsAllCloudUSD || 0"
            :inr="(cost.savingsVsAllCloudUSD || 0) * 83"
            :percent="cost.savingsPercent || 0"
          />
          <div class="card summary-card">
            <div class="card-label">Executions</div>
            <div class="card-value">{{ cost.executionCount || 0 }}</div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-row">
          <div class="card chart-card">
            <h3>Routing Distribution</h3>
            <RoutingPie :by-route="cost.byRoute || {}" />
          </div>
          <div class="card chart-card">
            <h3>Cost by Route</h3>
            <div class="chart-placeholder">
              <div
                v-for="(val, key) in cost.byRoute"
                :key="key"
                class="route-bar"
              >
                <span class="route-label">{{ key }}</span>
                <div
                  class="route-fill"
                  :style="{
                    width: getRouteWidth(val),
                    background: getRouteColor(String(key)),
                  }"
                ></div>
                <span class="route-val">${{ (val as number).toFixed(4) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cost Estimator Card -->
        <div class="card" style="margin-top: 20px">
          <div class="estimator-header">
            <h3>Project Cost Estimator</h3>
            <div class="estimator-controls">
              <select v-model="estimatorSensitivity" class="est-select">
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="private">Private</option>
                <option value="critical">Critical</option>
              </select>
              <input
                v-model.number="estimatorExecPerDay"
                type="number"
                min="1"
                class="est-input"
                placeholder="Exec/day"
              />
              <button
                class="est-btn"
                @click="runEstimate"
                :disabled="estimating"
              >
                {{ estimating ? 'Estimating…' : 'Estimate' }}
              </button>
            </div>
          </div>

          <div v-if="costEstimate" class="estimator-body">
            <div class="est-tokens">
              <span
                >~{{ costEstimate.estimatedTokensIn.toLocaleString() }} tokens
                in</span
              >
              <span
                >~{{ costEstimate.estimatedTokensOut.toLocaleString() }} tokens
                out</span
              >
              <span class="est-rec"
                >Recommended:
                <strong>{{ costEstimate.recommendedModel }}</strong> via
                <strong>{{ costEstimate.recommendedRoute }}</strong></span
              >
            </div>

            <div class="est-section-title">
              Per-model cost (single execution)
            </div>
            <div class="est-model-grid">
              <div
                v-for="m in costEstimate.byModel"
                :key="m.model"
                :class="[
                  'est-model-card',
                  m.model === costEstimate.recommendedModel
                    ? 'est-model-rec'
                    : '',
                ]"
              >
                <div class="est-model-name">{{ m.model }}</div>
                <div class="est-model-provider">{{ m.provider }}</div>
                <div class="est-model-cost">${{ m.costUSD.toFixed(6) }}</div>
                <div class="est-model-inr">₹{{ m.costINR.toFixed(4) }}</div>
              </div>
            </div>

            <div class="est-section-title">Routing scenarios</div>
            <div class="est-scenarios">
              <div
                v-for="s in costEstimate.scenarios"
                :key="s.name"
                class="est-scenario-row"
              >
                <span class="est-scenario-name">{{ s.name }}</span>
                <Badge :text="s.route" :color="routeBadgeColor(s.route)" />
                <span class="est-scenario-cost"
                  >${{ s.costUSD.toFixed(6) }}</span
                >
                <span class="est-scenario-savings" v-if="s.savingsPercent > 0"
                  >saves {{ s.savingsPercent.toFixed(1) }}%</span
                >
              </div>
            </div>

            <div class="est-monthly">
              <span class="est-section-title" style="margin: 0"
                >Monthly projection</span
              >
              <span
                >{{ costEstimate.monthlyProjection.executionsPerDay }} exec/day
                →</span
              >
              <span class="est-monthly-cost"
                >${{ costEstimate.monthlyProjection.costUSD.toFixed(4) }}</span
              >
              <span
                >/ ₹{{
                  costEstimate.monthlyProjection.costINR.toFixed(2)
                }}</span
              >
            </div>
          </div>
          <div v-else class="est-empty">
            Select sensitivity level and click Estimate to see a cost breakdown.
          </div>
        </div>

        <!-- Audit Table -->
        <div class="card" style="margin-top: 20px">
          <h3 style="margin-bottom: 12px">Audit Log</h3>
          <AuditTable
            :rows="auditRows"
            :total="auditTotal"
            :page="auditPage"
            :limit="20"
            @page="onAuditPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AppSidebar from '../components/shared/AppSidebar.vue';
import Badge from '../components/shared/Badge.vue';
import CostCard from '../components/dashboard/CostCard.vue';
import SavingsCard from '../components/dashboard/SavingsCard.vue';
import RoutingPie from '../components/dashboard/RoutingPie.vue';
import AuditTable from '../components/dashboard/AuditTable.vue';
import ProviderStatus from '../components/dashboard/ProviderStatus.vue';
import { baniyaApi } from '../api/baniya';
import { useProvidersStore } from '../stores/providers';

const providers = useProvidersStore();
const cost = ref<any>({});
const auditRows = ref<any[]>([]);
const auditTotal = ref(0);
const auditPage = ref(1);

// Cost estimator
const estimatorSensitivity = ref('public');
const estimatorExecPerDay = ref(100);
const estimating = ref(false);
const costEstimate = ref<any>(null);

onMounted(async () => {
  providers.startPolling();
  await loadData();
});

onUnmounted(() => providers.stopPolling());

async function loadData() {
  try {
    const [costRes, auditRes] = await Promise.all([
      baniyaApi.costSummary(),
      baniyaApi.audit({ page: auditPage.value, limit: 20 }),
    ]);
    cost.value = costRes.data;
    auditRows.value = auditRes.data.rows || [];
    auditTotal.value = auditRes.data.total || 0;
  } catch {
    /* ok */
  }
}

async function onAuditPage(p: number) {
  auditPage.value = p;
  try {
    const res = await baniyaApi.audit({ page: p, limit: 20 });
    auditRows.value = res.data.rows || [];
    auditTotal.value = res.data.total || 0;
  } catch {
    /* ok */
  }
}

async function runEstimate() {
  estimating.value = true;
  try {
    const res = await baniyaApi.estimateCost(
      {},
      estimatorSensitivity.value,
      undefined,
      estimatorExecPerDay.value
    );
    costEstimate.value = res.data;
  } catch {
    /* ok */
  } finally {
    estimating.value = false;
  }
}

function routeBadgeColor(
  route: string
): 'success' | 'warning' | 'info' | 'muted' {
  return (
    { local: 'success', hybrid: 'warning', cloud: 'info' }[route] ?? 'muted'
  );
}

function getRouteWidth(val: unknown) {
  const max = Math.max(
    ...Object.values(cost.value.byRoute || { x: 1 }).map(Number)
  );
  return max > 0 ? `${(Number(val) / max) * 100}%` : '0%';
}

function getRouteColor(route: string) {
  return (
    {
      local: 'var(--color-success)',
      hybrid: 'var(--color-warning)',
      cloud: 'var(--color-info)',
    }[route] ?? '#64748B'
  );
}
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  padding: 10px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-primary);
}
.topbar-title {
  font-size: 18px;
  font-weight: 500;
}
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.summary-card .card-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.summary-card .card-value {
  font-size: 22px;
  font-weight: 500;
}
.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.chart-card h3 {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
}
.route-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}
.route-label {
  width: 50px;
}
.route-fill {
  height: 20px;
  border-radius: var(--radius-sm);
  min-width: 4px;
}
.route-val {
  color: var(--color-text-muted);
}

/* Cost Estimator */
.estimator-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.estimator-header h3 {
  font-size: 14px;
  font-weight: 500;
}
.estimator-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}
.est-select,
.est-input {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  padding: 4px 8px;
  font-size: 12px;
}
.est-input {
  width: 90px;
}
.est-btn {
  background: var(--color-brand);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 5px 14px;
  font-size: 12px;
  cursor: pointer;
}
.est-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.est-tokens {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.est-rec {
  color: var(--color-text-primary);
}
.est-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: 8px;
  display: block;
}
.est-model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}
.est-model-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 10px;
}
.est-model-rec {
  border-color: var(--color-brand);
}
.est-model-name {
  font-size: 12px;
  font-weight: 500;
}
.est-model-provider {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}
.est-model-cost {
  font-size: 13px;
  font-weight: 500;
}
.est-model-inr {
  font-size: 11px;
  color: var(--color-text-muted);
}
.est-scenarios {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}
.est-scenario-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.est-scenario-name {
  flex: 1;
}
.est-scenario-cost {
  font-weight: 500;
}
.est-scenario-savings {
  color: var(--color-success);
  font-size: 11px;
}
.est-monthly {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  padding: 10px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
}
.est-monthly-cost {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-brand);
}
.est-empty {
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 20px 0;
  text-align: center;
}
</style>

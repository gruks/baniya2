<template>
  <div class="card summary-card highlight">
    <div class="card-label">Baniya Saved</div>
    <div class="card-value">₹ {{ inr.toFixed(2) }}</div>
    <div class="card-sub">${{ usd.toFixed(4) }} · {{ percent.toFixed(1) }}% savings</div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  usd: number;
  inr: number;
  percent: number;
}>(), { usd: 0, inr: 0, percent: 0 });
</script>

<style scoped>
.summary-card .card-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.summary-card .card-value { font-size: 22px; font-weight: 500; }
.summary-card .card-sub { font-size: 12px; color: var(--color-text-muted); }
.summary-card.highlight { border-left: 3px solid var(--color-brand); }
.summary-card.highlight .card-value { color: var(--color-brand); }
</style>

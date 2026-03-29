<template>
  <div class="card summary-card">
    <div class="card-label">{{ label }}</div>
    <div class="card-value">₹ {{ inr.toFixed(2) }}</div>
    <div class="card-sub">${{ usd.toFixed(4) }}</div>
    <div v-if="sub" class="card-sub">{{ sub }}</div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string;
  usd: number;
  inr: number;
  sub?: string;
}>(), { usd: 0, inr: 0 });
</script>

<style scoped>
.summary-card .card-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.summary-card .card-value { font-size: 22px; font-weight: 500; }
.summary-card .card-sub { font-size: 12px; color: var(--color-text-muted); }
</style>

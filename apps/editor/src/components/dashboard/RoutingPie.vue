<template>
  <div class="routing-pie">
    <canvas ref="canvas" width="220" height="220"></canvas>
    <div class="legend">
      <div v-for="(val, key) in byRoute" :key="key" class="legend-item">
        <span class="legend-dot" :style="{ background: COLORS[String(key)] || '#64748B' }"></span>
        <span class="legend-label">{{ key }}</span>
        <span class="legend-val">${{ (val as number).toFixed(4) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{ byRoute: Record<string, number> }>();

const COLORS: Record<string, string> = {
  local: '#10B981',
  hybrid: '#F59E0B',
  cloud: '#3B82F6',
};

const canvas = ref<HTMLCanvasElement | null>(null);

function draw() {
  if (!canvas.value) return;
  const ctx = canvas.value.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, 220, 220);
  const total = Object.values(props.byRoute).reduce((s, v) => s + Number(v), 0);
  if (total === 0) {
    ctx.font = '13px system-ui';
    ctx.fillStyle = '#9CA3AF';
    ctx.textAlign = 'center';
    ctx.fillText('No data yet', 110, 115);
    return;
  }
  let start = -Math.PI / 2;
  const cx = 110, cy = 110, r = 85, ir = 50;
  for (const [key, val] of Object.entries(props.byRoute)) {
    const angle = (Number(val) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.arc(cx, cy, ir, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = COLORS[key] || '#64748B';
    ctx.fill();
    start += angle;
  }
}

onMounted(draw);
watch(() => props.byRoute, draw, { deep: true });
</script>

<style scoped>
.routing-pie { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.legend { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-label { flex: 1; text-transform: capitalize; }
.legend-val { color: var(--color-text-muted); }
</style>

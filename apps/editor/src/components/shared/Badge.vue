<template>
  <span :class="['badge', variantClass]">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  text: string;
  color?: 'success' | 'warning' | 'error' | 'info' | 'muted';
  variant?: 'solid' | 'outline';
}>(), { color: 'muted', variant: 'solid' });

const variantClass = computed(() => `badge-${props.color}`);
</script>

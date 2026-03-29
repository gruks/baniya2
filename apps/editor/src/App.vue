<template>
  <div :class="{ dark: isDark }">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const isDark = computed(() => localStorage.getItem('baniya-dark') === 'true');
</script>

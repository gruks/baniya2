<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

// Apply dark mode on startup from persisted preference
onMounted(() => {
  if (localStorage.getItem('baniya-dark-mode') === 'true') {
    document.documentElement.classList.add('dark');
  }
});
</script>

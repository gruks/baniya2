<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';

// Apply dark mode on startup from persisted preference
onMounted(async () => {
  if (localStorage.getItem('baniya-dark-mode') === 'true') {
    document.documentElement.classList.add('dark');
  }

  // Restore auth session if token exists in localStorage
  const auth = useAuthStore();
  await auth.initAuth();
});
</script>

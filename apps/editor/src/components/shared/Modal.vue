<template>
  <teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close" @keydown.esc="close">
      <div class="modal-box" role="dialog" :aria-label="title">
        <div class="modal-header">
          <span class="modal-title">{{ title }}</span>
          <button class="modal-close" @click="close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; title?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();
function close() { emit('update:modelValue', false); }
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-box {
  background: var(--color-bg-primary); border: 1px solid var(--color-border);
  border-radius: var(--radius-lg); width: 480px; max-width: 90vw;
  box-shadow: var(--shadow-lg);
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid var(--color-border);
}
.modal-title { font-size: 15px; font-weight: 500; }
.modal-close { font-size: 16px; padding: 4px 8px; border-radius: var(--radius-sm); cursor: pointer; }
.modal-close:hover { background: var(--color-bg-secondary); }
.modal-body { padding: 20px; }
</style>

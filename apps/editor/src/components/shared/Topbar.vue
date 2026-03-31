<template>
  <div class="topbar">
    <div class="topbar-left">
      <button class="btn btn-sm btn-secondary" @click="$emit('back')">
        ← Back
      </button>
      <input
        v-model="localName"
        class="topbar-name"
        :placeholder="placeholder"
        @blur="onNameBlur"
        @keydown.enter="onNameBlur"
      />
      <span :class="['badge', active ? 'badge-success' : 'badge-muted']">
        {{ active ? 'Active' : 'Inactive' }}
      </span>
    </div>

    <div class="topbar-right">
      <!-- Status indicator -->
      <span v-if="saving" class="status status-saving">Saving...</span>
      <span v-else-if="status === 'running'" class="status status-running">
        <span class="status-spinner"></span> Running...
      </span>
      <span v-else-if="status === 'success'" class="status status-success">
        ✓ Completed
      </span>
      <span v-else-if="status === 'error'" class="status status-error">
        ✕ Failed
      </span>
      <span v-else class="status status-saved">✓ Saved</span>

      <!-- Action buttons -->
      <button
        class="btn btn-sm btn-secondary"
        :disabled="saving || running"
        @click="$emit('save')"
      >
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
      <button
        class="btn btn-sm btn-primary"
        :disabled="saving || running"
        @click="$emit('run')"
      >
        <span v-if="running" class="btn-spinner"></span>
        <span v-else>▶</span>
        {{ running ? 'Running...' : 'Run' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string;
    active?: boolean;
    saving?: boolean;
    running?: boolean;
    status?: 'idle' | 'running' | 'success' | 'error';
    placeholder?: string;
  }>(),
  {
    active: false,
    saving: false,
    running: false,
    status: 'idle',
    placeholder: 'Untitled workflow',
  }
);

const emit = defineEmits<{
  (e: 'update:name', value: string): void;
  (e: 'save'): void;
  (e: 'run'): void;
  (e: 'back'): void;
}>();

const localName = ref(props.name);

watch(
  () => props.name,
  newName => {
    localName.value = newName;
  }
);

function onNameBlur() {
  if (localName.value !== props.name) {
    emit('update:name', localName.value);
  }
}
</script>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  min-height: 44px;
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-name {
  border: none;
  font-size: 15px;
  font-weight: 500;
  background: transparent;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  width: 220px;
  color: var(--color-text-primary);
}

.topbar-name:focus {
  background: var(--color-bg-secondary);
  outline: 1px solid var(--color-brand);
}

.topbar-name::placeholder {
  color: var(--color-text-muted);
}

.status {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-saving {
  color: var(--color-text-muted);
}
.status-running {
  color: var(--color-warning);
}
.status-success {
  color: var(--color-success);
}
.status-error {
  color: var(--color-error);
}
.status-saved {
  color: var(--color-success);
}

.status-spinner,
.btn-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

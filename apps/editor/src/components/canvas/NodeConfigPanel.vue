<template>
  <div v-if="node" class="node-config-panel">
    <div class="config-header">
      <div class="config-title">
        <div class="config-color" :style="{ background: nodeColor }"></div>
        <h3>{{ nodeLabel }}</h3>
      </div>
      <button class="config-close" @click="$emit('close')" title="Close">
        ✕
      </button>
    </div>

    <div class="config-body">
      <!-- Node type badge -->
      <div class="config-type">{{ nodeType }}</div>

      <!-- Label field -->
      <div class="form-group">
        <label class="form-label">Label</label>
        <input
          v-model="localLabel"
          type="text"
          class="form-input"
          @blur="updateLabel"
          @keydown.enter="updateLabel"
        />
      </div>

      <!-- Dynamic config fields -->
      <div v-for="field in configFields" :key="field.key" class="form-group">
        <label class="form-label">
          {{ field.label }}
          <span v-if="field.required" class="required">*</span>
        </label>

        <!-- Text input -->
        <input
          v-if="field.type === 'text'"
          :value="String(config[field.key] ?? '')"
          type="text"
          class="form-input"
          :placeholder="field.placeholder"
          @input="
            config[field.key] = ($event.target as HTMLInputElement).value;
            emitChange();
          "
        />

        <!-- Textarea -->
        <textarea
          v-else-if="field.type === 'textarea'"
          :value="String(config[field.key] ?? '')"
          class="form-textarea"
          :placeholder="field.placeholder"
          rows="4"
          @input="
            config[field.key] = ($event.target as HTMLTextAreaElement).value;
            emitChange();
          "
          @blur="emitChange"
        ></textarea>

        <!-- Number input -->
        <input
          v-else-if="field.type === 'number'"
          :value="Number(config[field.key] ?? 0)"
          type="number"
          class="form-input"
          :min="field.min"
          :max="field.max"
          @input="
            config[field.key] = Number(
              ($event.target as HTMLInputElement).value
            );
            emitChange();
          "
        />

        <!-- Boolean / Toggle -->
        <label v-else-if="field.type === 'boolean'" class="toggle-label">
          <input
            v-model="config[field.key]"
            type="checkbox"
            class="toggle-input"
            @change="emitChange"
          />
          <span class="toggle-switch"></span>
          <span class="toggle-desc">{{ field.description || '' }}</span>
        </label>

        <!-- Select dropdown -->
        <select
          v-else-if="field.type === 'select'"
          v-model="config[field.key]"
          class="form-select"
          @change="emitChange"
        >
          <option
            v-for="opt in field.options"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>

        <!-- Code / Expression (Monaco placeholder or textarea) -->
        <div
          v-else-if="field.type === 'code' || field.type === 'expression'"
          class="code-field"
        >
          <textarea
            :value="String(config[field.key] ?? '')"
            class="form-code"
            :placeholder="field.placeholder"
            rows="5"
            @input="
              config[field.key] = ($event.target as HTMLTextAreaElement).value;
              emitChange();
            "
            @blur="emitChange"
          ></textarea>
          <div v-if="field.type === 'expression'" class="field-hint">
            Use {{ '{' }}{{ '{' }} input.field {{ '}' }}{{ '}' }} to reference
            upstream data
          </div>
        </div>

        <!-- Password -->
        <input
          v-else-if="field.type === 'password'"
          v-model="config[field.key]"
          type="password"
          class="form-input"
          :placeholder="field.placeholder"
          autocomplete="off"
          @blur="emitChange"
        />

        <!-- Fallback -->
        <input
          v-else
          v-model="config[field.key]"
          type="text"
          class="form-input"
          :placeholder="field.placeholder"
          @blur="emitChange"
        />

        <!-- Field description -->
        <div v-if="field.description" class="field-desc">
          {{ field.description }}
        </div>
      </div>

      <!-- No config fields message -->
      <div v-if="configFields.length === 0" class="no-config">
        <span>No configuration options for this node type.</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { getNodeMeta } from '@baniya/nodes';

const props = defineProps<{
  node: {
    id: string;
    type: string;
    data: {
      label: string;
      type: string;
      config: Record<string, unknown>;
    };
  } | null;
}>();

const emit = defineEmits<{
  (e: 'update', config: Record<string, unknown>): void;
  (e: 'updateLabel', label: string): void;
  (e: 'close'): void;
}>();

const localLabel = ref('');
const config = ref<Record<string, unknown>>({});

const nodeType = computed(() => props.node?.data?.type || '');
const nodeLabel = computed(() => props.node?.data?.label || 'Node');
const nodeColor = computed(() => {
  const meta = getNodeMeta(nodeType.value);
  return meta?.color || '#888';
});

const configFields = computed(() => {
  const meta = getNodeMeta(nodeType.value);
  return meta?.configSchema || [];
});

// Initialize local state when node changes
watch(
  () => props.node,
  newNode => {
    if (newNode) {
      localLabel.value = newNode.data.label || '';
      config.value = { ...(newNode.data.config || {}) };
    }
  },
  { immediate: true, deep: true }
);

function updateLabel() {
  if (props.node && localLabel.value !== props.node.data.label) {
    emit('updateLabel', localLabel.value);
  }
}

function emitChange() {
  emit('update', config.value);
}
</script>

<style scoped>
.node-config-panel {
  width: 320px;
  border-left: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.config-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.config-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.config-title h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}

.config-close {
  font-size: 16px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
}

.config-close:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
}

.config-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.config-type {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  font-family: 'JetBrains Mono', monospace;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.required {
  color: var(--color-error);
  margin-left: 2px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  font-size: 13px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-family: inherit;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-brand);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.form-select {
  cursor: pointer;
}

.code-field {
  width: 100%;
}

.form-code {
  width: 100%;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  resize: vertical;
  min-height: 100px;
}

.form-code:focus {
  outline: none;
  border-color: var(--color-brand);
}

.field-hint {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-top: 6px;
  font-family: 'JetBrains Mono', monospace;
}

.field-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
  line-height: 1.4;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-input {
  display: none;
}

.toggle-switch {
  width: 36px;
  height: 20px;
  background: var(--color-bg-tertiary);
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: var(--color-text-muted);
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-switch {
  background: var(--color-brand);
}

.toggle-input:checked + .toggle-switch::after {
  transform: translateX(16px);
  background: var(--color-bg-primary);
}

.toggle-desc {
  font-size: 11px;
  color: var(--color-text-muted);
}

.no-config {
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>

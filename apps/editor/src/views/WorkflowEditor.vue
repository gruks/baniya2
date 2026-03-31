<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="editor-layout">
      <!-- Topbar -->
      <Topbar
        :name="workflowName"
        :active="workflow?.active"
        :saving="saving"
        :running="running"
        :status="runStatus"
        @update:name="
          workflowName = $event;
          autoSave();
        "
        @save="saveWorkflow"
        @run="runWorkflow"
        @back="$router.push('/workflows')"
      />

      <div class="editor-panels">
        <!-- Node Picker (Left) -->
        <NodePicker />

        <!-- Canvas (Center) -->
        <div class="canvas-container" @drop="onDrop" @dragover.prevent>
          <VueFlow
            v-model:nodes="nodes"
            v-model:edges="edges"
            :node-types="nodeTypes"
            :default-viewport="{ x: 50, y: 50, zoom: 0.85 }"
            :snap-to-grid="true"
            :snap-grid="[15, 15]"
            @connect="onConnect"
            @node-click="onNodeClick"
            fit-view-on-init
          >
            <Background pattern-color="rgba(0,0,0,0.05)" :gap="15" />
            <Controls />
            <MiniMap />
            <template #edge-default="edgeProps">
              <BaseEdge :id="edgeProps.id" :path="edgeProps.path" />
              <EdgeLabel :label="edgeProps.sourceHandle || ''" />
            </template>
          </VueFlow>
        </div>

        <!-- Config / Result Panel (Right) -->
        <div v-if="selectedNode || lastExecution" class="config-panel">
          <!-- Execution result tab -->
          <div v-if="lastExecution && !selectedNode" class="exec-result-panel">
            <div class="config-header">
              <h3>Last Run</h3>
              <div style="display: flex; gap: 6px; align-items: center">
                <span
                  :class="[
                    'badge',
                    lastExecution.status === 'success'
                      ? 'badge-success'
                      : 'badge-error',
                  ]"
                >
                  {{ lastExecution.status }}
                </span>
                <button class="config-close" @click="lastExecution = null">
                  ✕
                </button>
              </div>
            </div>

            <!-- Summary bar -->
            <div class="exec-summary-bar">
              <div class="exec-stat">
                <span class="exec-stat-label">Duration</span>
                <span class="exec-stat-val"
                  >{{ lastExecution.totalLatencyMs }}ms</span
                >
              </div>
              <div class="exec-stat">
                <span class="exec-stat-label">Cost</span>
                <span class="exec-stat-val"
                  >${{ lastExecution.totalCostUSD?.toFixed(5) }}</span
                >
              </div>
              <div class="exec-stat">
                <span class="exec-stat-label">Nodes</span>
                <span class="exec-stat-val">
                  {{
                    lastExecution.nodeResults?.filter(
                      (r: any) => r.status === 'success'
                    ).length
                  }}✓
                  <span
                    v-if="
                      lastExecution.nodeResults?.filter(
                        (r: any) => r.status === 'error'
                      ).length
                    "
                    class="err-count"
                  >
                    {{
                      lastExecution.nodeResults?.filter(
                        (r: any) => r.status === 'error'
                      ).length
                    }}✕
                  </span>
                </span>
              </div>
            </div>

            <!-- Per-node results -->
            <div class="exec-nodes">
              <div
                v-for="r in lastExecution.nodeResults"
                :key="r.nodeId"
                :class="['exec-node-card', `exec-node-${r.status}`]"
                @click="toggleNodeDetail(r.nodeId)"
              >
                <!-- Node header row -->
                <div class="exec-node-header">
                  <span :class="['exec-status-icon', `icon-${r.status}`]">
                    {{
                      r.status === 'success'
                        ? '✓'
                        : r.status === 'error'
                          ? '✕'
                          : r.status === 'running'
                            ? '…'
                            : r.status === 'skipped'
                              ? '—'
                              : '·'
                    }}
                  </span>
                  <span class="exec-node-label">{{ nodeLabel(r.nodeId) }}</span>
                  <span class="exec-node-type">{{ nodeType(r.nodeId) }}</span>
                  <span v-if="r.llmMeta" class="exec-node-cost"
                    >${{ r.llmMeta.costUSD?.toFixed(5) }}</span
                  >
                  <span class="exec-node-time">{{ nodeMs(r) }}ms</span>
                  <span class="exec-expand-icon">{{
                    expandedNodes.has(r.nodeId) ? '▲' : '▼'
                  }}</span>
                </div>

                <!-- Error message — always visible when error -->
                <div v-if="r.status === 'error'" class="exec-node-error">
                  <span class="exec-error-label">Error</span>
                  <span class="exec-error-text">{{ r.error }}</span>
                </div>

                <!-- Skipped reason — shown when skipped due to upstream branch -->
                <div
                  v-if="r.status === 'skipped' && r.error"
                  class="exec-node-skipped-reason"
                >
                  <span class="exec-skip-label">Skipped</span>
                  <span class="exec-skip-text">{{ r.error }}</span>
                </div>

                <!-- Expanded detail -->
                <div
                  v-if="expandedNodes.has(r.nodeId)"
                  class="exec-node-detail"
                >
                  <div v-if="r.llmMeta" class="exec-llm-meta">
                    <span>Model: {{ r.llmMeta.model }}</span>
                    <span>Route: {{ r.llmMeta.routing }}</span>
                    <span>Sensitivity: {{ r.llmMeta.sensitivity }}</span>
                  </div>
                  <div
                    v-if="r.output && Object.keys(r.output).length"
                    class="exec-output-block"
                  >
                    <div class="exec-output-label">Output</div>
                    <pre class="exec-output-pre">{{
                      formatOutput(r.output)
                    }}</pre>
                  </div>
                  <div class="exec-timing">
                    Started {{ formatTime(r.startedAt) }} · Finished
                    {{ formatTime(r.finishedAt) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Node config panel -->
          <NodeConfigPanel
            v-if="selectedNode"
            :node="selectedNode"
            @update="onNodeConfigUpdate"
            @update-label="onNodeLabelUpdate"
            @close="selectedNode = null"
          />
        </div>
      </div>

      <!-- Run error toast -->
      <div
        v-if="runError"
        class="run-toast run-toast-error"
        @click="runError = ''"
      >
        ✕ {{ runError }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, markRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VueFlow, useVueFlow, BaseEdge } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import AppSidebar from '../components/shared/AppSidebar.vue';
import BaniyaNode from '../components/canvas/BaniyaNode.vue';
import EdgeLabel from '../components/canvas/EdgeLabel.vue';
import NodePicker from '../components/canvas/NodePicker.vue';
import NodeConfigPanel from '../components/canvas/NodeConfigPanel.vue';
import Topbar from '../components/shared/Topbar.vue';
import { useWorkflowsStore } from '../stores/workflows';
import { useWebSocket } from '../composables/useWebSocket';
import fsApi from '../api/filesystem';

type NodeMeta = {
  type: string;
  label: string;
  color: string;
  category: string;
  configSchema: any[];
};

const NODE_REGISTRY: NodeMeta[] = [
  {
    type: 'trigger.manual',
    label: 'Manual Trigger',
    color: '#6366F1',
    category: 'trigger',
    configSchema: [],
  },
  {
    type: 'trigger.webhook',
    label: 'Webhook Trigger',
    color: '#6366F1',
    category: 'trigger',
    configSchema: [
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        options: [
          { label: 'POST', value: 'POST' },
          { label: 'GET', value: 'GET' },
        ],
      },
    ],
  },
  {
    type: 'trigger.schedule',
    label: 'Schedule Trigger',
    color: '#6366F1',
    category: 'trigger',
    configSchema: [
      { key: 'cron', label: 'Cron', type: 'text', placeholder: '0 9 * * 1-5' },
    ],
  },
  {
    type: 'ai.llm',
    label: 'AI LLM',
    color: '#0D9E75',
    category: 'ai',
    configSchema: [
      {
        key: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'Your prompt here. Use {{ input.field }} for data',
      },
      { key: 'systemPrompt', label: 'System Prompt', type: 'textarea' },
      {
        key: 'apiProvider',
        label: 'API Provider',
        type: 'select',
        options: [
          { label: 'Auto (env keys)', value: 'auto' },
          { label: 'OpenAI', value: 'openai' },
          { label: 'Anthropic', value: 'anthropic' },
          { label: 'Google Gemini', value: 'gemini' },
        ],
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-... (overrides env variable)',
      },
      {
        key: 'forceRoute',
        label: 'Route',
        type: 'select',
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Local', value: 'local' },
          { label: 'Hybrid', value: 'hybrid' },
          { label: 'Cloud', value: 'cloud' },
        ],
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        min: 1,
        max: 8000,
      },
    ],
  },
  {
    type: 'ai.classify',
    label: 'Baniya Classify',
    color: '#0D9E75',
    category: 'ai',
    configSchema: [],
  },
  {
    type: 'ai.summarise',
    label: 'AI Summarise',
    color: '#0D9E75',
    category: 'ai',
    configSchema: [
      {
        key: 'forceRoute',
        label: 'Route',
        type: 'select',
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Local', value: 'local' },
          { label: 'Cloud', value: 'cloud' },
        ],
      },
    ],
  },
  {
    type: 'ai.extract',
    label: 'AI Extract',
    color: '#0D9E75',
    category: 'ai',
    configSchema: [
      {
        key: 'fields',
        label: 'Fields',
        type: 'textarea',
        placeholder: 'name, email',
      },
    ],
  },
  {
    type: 'ai.rewrite',
    label: 'AI Rewrite',
    color: '#0D9E75',
    category: 'ai',
    configSchema: [
      {
        key: 'tone',
        label: 'Tone',
        type: 'select',
        options: [
          { label: 'Professional', value: 'professional' },
          { label: 'Casual', value: 'casual' },
        ],
      },
    ],
  },
  {
    type: 'ai.translate',
    label: 'AI Translate',
    color: '#0D9E75',
    category: 'ai',
    configSchema: [
      {
        key: 'language',
        label: 'Language',
        type: 'text',
        placeholder: 'Hindi',
      },
    ],
  },
  {
    type: 'ai.embed',
    label: 'AI Embed',
    color: '#0D9E75',
    category: 'ai',
    configSchema: [],
  },
  {
    type: 'ai.moderate',
    label: 'AI Moderate',
    color: '#0D9E75',
    category: 'ai',
    configSchema: [],
  },
  {
    type: 'ai.agent',
    label: 'AI Agent',
    color: '#059669',
    category: 'ai',
    configSchema: [
      {
        key: 'task',
        label: 'Task',
        type: 'textarea',
        placeholder:
          'Create a hello world Python script in the folder. Use {{ input.folderPath }} as the working directory.',
      },
      {
        key: 'folderPath',
        label: 'Folder Path (override)',
        type: 'text',
        placeholder: 'Leave blank to use upstream folderPath',
      },
      {
        key: 'model',
        label: 'Model',
        type: 'text',
        placeholder: 'qwen3-vl:4b',
      },
      {
        key: 'ollamaUrl',
        label: 'Ollama URL',
        type: 'text',
        placeholder: 'http://localhost:11434',
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        min: 256,
        max: 4096,
      },
      {
        key: 'timeout',
        label: 'Timeout (seconds)',
        type: 'number',
        min: 10,
        max: 300,
      },
    ],
  },
  {
    type: 'ai.ollama',
    label: 'Ollama',
    color: '#0D9E75',
    category: 'ai',
    configSchema: [
      {
        key: 'prompt',
        label: 'Prompt',
        type: 'textarea',
        placeholder: 'e.g. Summarise this file:\n\n{{ input.content }}',
      },
      {
        key: 'model',
        label: 'Model',
        type: 'text',
        placeholder: 'qwen3-vl:4b',
      },
      { key: 'systemPrompt', label: 'System Prompt', type: 'textarea' },
      {
        key: 'ollamaUrl',
        label: 'Ollama URL',
        type: 'text',
        placeholder: 'http://localhost:11434',
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'number',
        min: 1,
        max: 32000,
      },
      {
        key: 'timeout',
        label: 'Timeout (seconds)',
        type: 'number',
        min: 10,
        max: 600,
      },
    ],
  },
  {
    type: 'logic.if',
    label: 'IF',
    color: '#F59E0B',
    category: 'logic',
    configSchema: [
      {
        key: 'expression',
        label: 'Condition',
        type: 'code',
        placeholder: 'input.x > 5',
      },
    ],
  },
  {
    type: 'logic.switch',
    label: 'Switch',
    color: '#F59E0B',
    category: 'logic',
    configSchema: [
      { key: 'expression', label: 'Expression', type: 'code' },
      { key: 'cases', label: 'Cases', type: 'textarea' },
    ],
  },
  {
    type: 'logic.merge',
    label: 'Merge',
    color: '#F59E0B',
    category: 'logic',
    configSchema: [],
  },
  {
    type: 'logic.loop',
    label: 'Loop',
    color: '#F59E0B',
    category: 'logic',
    configSchema: [{ key: 'arrayField', label: 'Array Field', type: 'text' }],
  },
  {
    type: 'logic.wait',
    label: 'Wait',
    color: '#F59E0B',
    category: 'logic',
    configSchema: [
      { key: 'seconds', label: 'Seconds', type: 'number', min: 0, max: 300 },
    ],
  },
  {
    type: 'data.set',
    label: 'Set Data',
    color: '#8B5CF6',
    category: 'data',
    configSchema: [
      {
        key: 'values',
        label: 'Values (JSON)',
        type: 'code',
        placeholder: '{ "key": "value" }',
      },
    ],
  },
  {
    type: 'data.transform',
    label: 'Transform',
    color: '#8B5CF6',
    category: 'data',
    configSchema: [
      {
        key: 'expression',
        label: 'Expression',
        type: 'code',
        placeholder: 'return { ...input }',
      },
    ],
  },
  {
    type: 'data.filter',
    label: 'Filter',
    color: '#8B5CF6',
    category: 'data',
    configSchema: [
      {
        key: 'expression',
        label: 'Filter',
        type: 'code',
        placeholder: 'item.age > 18',
      },
    ],
  },
  {
    type: 'data.aggregate',
    label: 'Aggregate',
    color: '#8B5CF6',
    category: 'data',
    configSchema: [
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        options: [
          { label: 'Count', value: 'count' },
          { label: 'Sum', value: 'sum' },
        ],
      },
      { key: 'field', label: 'Field', type: 'text' },
    ],
  },
  {
    type: 'output.response',
    label: 'Response',
    color: '#64748B',
    category: 'output',
    configSchema: [{ key: 'statusCode', label: 'Status Code', type: 'number' }],
  },
  {
    type: 'output.log',
    label: 'Log',
    color: '#64748B',
    category: 'output',
    configSchema: [{ key: 'label', label: 'Label', type: 'text' }],
  },
  {
    type: 'storage.read',
    label: 'Read File',
    color: '#0EA5E9',
    category: 'storage',
    configSchema: [
      {
        key: 'path',
        label: 'File Path',
        type: 'text',
        placeholder: 'data/output.txt',
      },
      {
        key: 'encoding',
        label: 'Encoding',
        type: 'select',
        options: [
          { label: 'UTF-8 (text)', value: 'utf8' },
          { label: 'Base64 (binary)', value: 'base64' },
        ],
      },
    ],
  },
  {
    type: 'storage.write',
    label: 'Write File',
    color: '#0EA5E9',
    category: 'storage',
    configSchema: [
      {
        key: 'path',
        label: 'File Path',
        type: 'text',
        placeholder: 'data/output.txt',
      },
      {
        key: 'content',
        label: 'Content',
        type: 'textarea',
        placeholder: '{{ input.text }}',
      },
      {
        key: 'append',
        label: 'Mode',
        type: 'select',
        options: [
          { label: 'Overwrite', value: 'overwrite' },
          { label: 'Append', value: 'append' },
        ],
      },
      {
        key: 'createDirs',
        label: 'Create Directories',
        type: 'select',
        options: [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' },
        ],
      },
    ],
  },
  {
    type: 'storage.list',
    label: 'List Directory',
    color: '#0EA5E9',
    category: 'storage',
    configSchema: [
      {
        key: 'path',
        label: 'Directory Path',
        type: 'text',
        placeholder: 'data/',
      },
      {
        key: 'recursive',
        label: 'Recursive',
        type: 'select',
        options: [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ],
      },
      {
        key: 'filter',
        label: 'Filter (glob)',
        type: 'text',
        placeholder: '*.txt',
      },
    ],
  },
  {
    type: 'storage.delete',
    label: 'Delete File',
    color: '#0EA5E9',
    category: 'storage',
    configSchema: [
      {
        key: 'path',
        label: 'File Path',
        type: 'text',
        placeholder: 'data/old.txt',
      },
    ],
  },
  {
    type: 'storage.mkdir',
    label: 'Make Directory',
    color: '#0EA5E9',
    category: 'storage',
    configSchema: [
      {
        key: 'path',
        label: 'Directory Path',
        type: 'text',
        placeholder: 'data/reports/2024',
      },
    ],
  },
  // ─── Folder Nodes ──────────────────────────────────────
  {
    type: 'folder.connect',
    label: 'Folder',
    color: '#EA580C',
    category: 'folder',
    configSchema: [
      {
        key: 'folderPath',
        label: 'Folder Path',
        type: 'text',
        placeholder: 'C:\\Projects\\myapp  or  /home/user/project',
      },
      {
        key: 'recursive',
        label: 'Recursive',
        type: 'select',
        options: [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ],
      },
      {
        key: 'filter',
        label: 'Filter (glob)',
        type: 'text',
        placeholder: '*.ts',
      },
    ],
  },
  {
    type: 'folder.list',
    label: 'Folder List',
    color: '#EA580C',
    category: 'folder',
    configSchema: [
      {
        key: 'folderPath',
        label: 'Folder Path (override)',
        type: 'text',
        placeholder: 'Leave blank to use upstream',
      },
      {
        key: 'subPath',
        label: 'Sub-path',
        type: 'text',
        placeholder: 'src/components',
      },
      {
        key: 'recursive',
        label: 'Recursive',
        type: 'select',
        options: [
          { label: 'No', value: 'false' },
          { label: 'Yes', value: 'true' },
        ],
      },
    ],
  },
  {
    type: 'folder.read',
    label: 'Folder Read',
    color: '#EA580C',
    category: 'folder',
    configSchema: [
      {
        key: 'folderPath',
        label: 'Folder Path (override)',
        type: 'text',
        placeholder: 'Leave blank to use upstream',
      },
      {
        key: 'filePath',
        label: 'File Path',
        type: 'text',
        placeholder: 'src/index.ts  or  {{ input.path }}',
      },
    ],
  },
  {
    type: 'folder.write',
    label: 'Folder Write',
    color: '#EA580C',
    category: 'folder',
    configSchema: [
      {
        key: 'folderPath',
        label: 'Folder Path (override)',
        type: 'text',
        placeholder: 'Leave blank to use upstream',
      },
      {
        key: 'filePath',
        label: 'File Path',
        type: 'text',
        placeholder: 'output/result.md  or  {{ input.filePath }}',
      },
      {
        key: 'content',
        label: 'Content',
        type: 'textarea',
        placeholder: '{{ input.text }}',
      },
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { label: 'Overwrite', value: 'overwrite' },
          { label: 'Append', value: 'append' },
        ],
      },
    ],
  },
  {
    type: 'folder.patch',
    label: 'Folder Patch',
    color: '#EA580C',
    category: 'folder',
    configSchema: [
      {
        key: 'folderPath',
        label: 'Folder Path (override)',
        type: 'text',
        placeholder: 'Leave blank to use upstream',
      },
      {
        key: 'filePath',
        label: 'File Path',
        type: 'text',
        placeholder: 'src/index.ts',
      },
      {
        key: 'oldStr',
        label: 'Old String',
        type: 'textarea',
        placeholder: 'Exact text to replace',
      },
      {
        key: 'newStr',
        label: 'New String',
        type: 'textarea',
        placeholder: 'Replacement text',
      },
    ],
  },
];

const route = useRoute();
const router = useRouter();
const store = useWorkflowsStore();
const {
  nodeStatuses,
  connect: wsConnect,
  resetNodeStatuses,
  lastEvent,
} = useWebSocket();

const nodes = ref<any[]>([]);
const edges = ref<any[]>([]);
const selectedNode = ref<any>(null);
const workflowName = ref('');
const workflow = ref<any>(null);
const saving = ref(false);
const nodeSearch = ref('');
const running = ref(false);
const runStatus = ref<'idle' | 'running' | 'success' | 'error'>('idle');
const runError = ref('');
const lastExecution = ref<any>(null);
const browsingFolder = ref(false);
const expandedNodes = ref(new Set<string>());

function toggleNodeDetail(nodeId: string) {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
  }
  // trigger reactivity
  expandedNodes.value = new Set(expandedNodes.value);
}

function nodeLabel(nodeId: string): string {
  const n = nodes.value.find(n => n.id === nodeId);
  return n?.data?.label || nodeId;
}

function nodeType(nodeId: string): string {
  const n = nodes.value.find(n => n.id === nodeId);
  return n?.data?.type || '';
}

function nodeMs(r: any): number {
  if (!r.startedAt || !r.finishedAt) return 0;
  return new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime();
}

function formatTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatOutput(output: Record<string, unknown>): string {
  try {
    const str = JSON.stringify(output, null, 2);
    return str.length > 800 ? str.slice(0, 800) + '\n… (truncated)' : str;
  } catch {
    return String(output);
  }
}

async function browseFolder(configKey: string) {
  if (!selectedNode.value) return;
  browsingFolder.value = true;
  try {
    const result = await fsApi.pickFolder();
    if (result.path) {
      selectedNode.value.data.config[configKey] = result.path;
      autoSave();
    }
  } catch (e: any) {
    runError.value =
      'Folder picker failed: ' + (e.response?.data?.error || e.message);
    setTimeout(() => (runError.value = ''), 5000);
  } finally {
    browsingFolder.value = false;
  }
}

const nodeTypes = { custom: markRaw(BaniyaNode) } as any;

// ── Wire WebSocket node statuses into canvas nodes ──────────────
watch(
  nodeStatuses,
  statuses => {
    nodes.value = nodes.value.map(n => {
      const s = statuses[n.id];
      if (!s) return n;
      return {
        ...n,
        data: {
          ...n.data,
          executionStatus: s.status,
          executionCost: s.result?.llmMeta?.costUSD ?? s.result?.costUSD ?? 0,
        },
      };
    });
  },
  { deep: true }
);

// ── Auto-dismiss run status after 4s ────────────────────────────
watch(runStatus, val => {
  if (val === 'success' || val === 'error') {
    setTimeout(() => {
      if (runStatus.value !== 'running') runStatus.value = 'idle';
    }, 4000);
  }
});

const categories = computed(() => {
  const cats = [
    {
      name: 'Triggers',
      nodes: NODE_REGISTRY.filter(n => n.category === 'trigger'),
    },
    { name: 'AI', nodes: NODE_REGISTRY.filter(n => n.category === 'ai') },
    { name: 'Logic', nodes: NODE_REGISTRY.filter(n => n.category === 'logic') },
    { name: 'Data', nodes: NODE_REGISTRY.filter(n => n.category === 'data') },
    {
      name: 'Storage',
      nodes: NODE_REGISTRY.filter(n => n.category === 'storage'),
    },
    {
      name: 'Folder',
      nodes: NODE_REGISTRY.filter(n => n.category === 'folder'),
    },
    {
      name: 'Output',
      nodes: NODE_REGISTRY.filter(n => n.category === 'output'),
    },
  ];
  if (!nodeSearch.value) return cats;
  const q = nodeSearch.value.toLowerCase();
  return cats
    .map(c => ({
      ...c,
      nodes: c.nodes.filter(n => n.label.toLowerCase().includes(q)),
    }))
    .filter(c => c.nodes.length > 0);
});

onMounted(async () => {
  const wf = await store.fetchOne(route.params.id as string);
  workflow.value = wf;
  workflowName.value = wf.name;

  nodes.value = (wf.nodes || []).map((n: any) => ({
    id: n.id,
    type: 'custom',
    position: n.position,
    data: { ...n, config: { ...n.config }, executionStatus: 'idle' },
  }));

  edges.value = (wf.edges || []).map((e: any) => ({
    id: e.id,
    source: e.sourceNodeId,
    sourceHandle: e.sourceHandle,
    target: e.targetNodeId,
    targetHandle: e.targetHandle,
    animated: true,
  }));

  wsConnect();
});

function onDragStart(event: DragEvent, node: NodeMeta) {
  event.dataTransfer?.setData('application/baniya-node', JSON.stringify(node));
}

function onDrop(event: DragEvent) {
  const data = event.dataTransfer?.getData('application/baniya-node');
  if (!data) return;
  const nodeMeta = JSON.parse(data);
  const id = `node-${Date.now()}`;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  nodes.value.push({
    id,
    type: 'custom',
    position: {
      x: event.clientX - rect.left - 90,
      y: event.clientY - rect.top - 20,
    },
    data: {
      id,
      type: nodeMeta.type,
      label: nodeMeta.label,
      config: {},
      disabled: false,
      executionStatus: 'idle',
    },
  });
}

function onConnect(connection: any) {
  edges.value.push({
    id: `edge-${Date.now()}`,
    source: connection.source,
    sourceHandle: connection.sourceHandle || 'main',
    target: connection.target,
    targetHandle: connection.targetHandle || 'in',
    animated: true,
  });
}

function onNodeClick(event: any) {
  selectedNode.value = event.node;
  lastExecution.value = null; // close result panel when clicking a node
}

function getConfigFields(type: string) {
  return NODE_REGISTRY.find(n => n.type === type)?.configSchema || [];
}

async function saveWorkflow() {
  saving.value = true;
  const wfNodes = nodes.value.map(n => ({
    id: n.id,
    type: n.data.type,
    label: n.data.label,
    position: n.position,
    config: n.data.config || {},
    disabled: n.data.disabled || false,
  }));
  const wfEdges = edges.value.map(e => ({
    id: e.id,
    sourceNodeId: e.source,
    sourceHandle: e.sourceHandle || 'main',
    targetNodeId: e.target,
    targetHandle: e.targetHandle || 'in',
  }));
  try {
    await store.save(route.params.id as string, {
      name: workflowName.value,
      nodes: wfNodes,
      edges: wfEdges,
    });
  } catch (err: any) {
    runError.value = 'Save failed: ' + (err.message || 'unknown error');
    setTimeout(() => (runError.value = ''), 4000);
  } finally {
    saving.value = false;
  }
}

function autoSave() {
  saveWorkflow();
}

function onNodeConfigUpdate(config: Record<string, unknown>) {
  if (!selectedNode.value) return;
  selectedNode.value.data.config = config;
  autoSave();
}

function onNodeLabelUpdate(label: string) {
  if (!selectedNode.value) return;
  selectedNode.value.data.label = label;
  autoSave();
}

async function runWorkflow() {
  if (running.value) return;

  // Reset node statuses on canvas
  resetNodeStatuses();
  nodes.value = nodes.value.map(n => ({
    ...n,
    data: { ...n.data, executionStatus: 'idle', executionCost: undefined },
  }));

  running.value = true;
  runStatus.value = 'running';
  runError.value = '';
  lastExecution.value = null;
  selectedNode.value = null;
  expandedNodes.value = new Set();

  try {
    await saveWorkflow();
    const result = await store.execute(route.params.id as string);
    lastExecution.value = result;
    runStatus.value = result.status === 'error' ? 'error' : 'success';

    // Patch final node statuses from execution result (fallback if WS missed events)
    if (result.nodeResults) {
      const patch: Record<string, any> = {};
      for (const r of result.nodeResults) {
        patch[r.nodeId] = { status: r.status, result: r };
      }
      nodes.value = nodes.value.map(n => {
        const p = patch[n.id];
        if (!p) return n;
        return {
          ...n,
          data: {
            ...n.data,
            executionStatus: p.status,
            executionCost: p.result?.llmMeta?.costUSD ?? 0,
          },
        };
      });
    }
  } catch (err: any) {
    runStatus.value = 'error';
    const msg = err.response?.data?.error || err.message || 'Execution failed';
    runError.value = msg;
    setTimeout(() => (runError.value = ''), 6000);
  } finally {
    running.value = false;
  }
}
</script>

<style scoped>
.editor-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  min-height: 44px;
}
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-name {
  border: none;
  font-size: 15px;
  font-weight: 500;
  background: transparent;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  width: 220px;
}
.toolbar-name:focus {
  background: var(--color-bg-secondary);
  outline: 1px solid var(--color-brand);
}
.toolbar-status {
  font-size: 12px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.run-status-running {
  color: var(--color-warning);
}
.run-status-ok {
  color: var(--color-success);
}
.run-status-err {
  color: var(--color-error);
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
.editor-panels {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Node Picker */
.node-picker {
  width: 240px;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 12px;
  background: var(--color-bg-primary);
}
.picker-search {
  width: 100%;
  margin-bottom: 12px;
  font-size: 12px;
}
.cat-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  margin-top: 12px;
}
.picker-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: background 0.1s;
  font-size: 12px;
  margin-bottom: 2px;
}
.picker-node:hover {
  background: var(--color-bg-secondary);
}
.picker-color-bar {
  width: 3px;
  height: 18px;
  border-radius: 2px;
  background: var(--cat-color);
  flex-shrink: 0;
}

/* Canvas */
.canvas-container {
  flex: 1;
  position: relative;
}

/* Config / Result Panel */
.config-panel {
  width: 300px;
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  background: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
}
.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}
.config-header h3 {
  font-size: 14px;
  font-weight: 500;
}
.config-close {
  font-size: 16px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.config-close:hover {
  background: var(--color-bg-tertiary);
}
.config-body {
  padding: 16px;
}
.config-body input,
.config-body textarea,
.config-body select {
  width: 100%;
  font-size: 12px;
}
.config-body textarea {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  resize: vertical;
}

/* Folder path browse row */
.folder-path-row {
  display: flex;
  gap: 4px;
  align-items: center;
}
.folder-path-input {
  flex: 1;
  font-size: 12px;
  min-width: 0;
}
.folder-browse-btn {
  flex-shrink: 0;
  padding: 4px 8px;
  font-size: 14px;
  line-height: 1;
}
.folder-browse-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.browse-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Execution result panel */
.exec-result-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.exec-summary-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.exec-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-right: 1px solid var(--color-border);
}
.exec-stat:last-child {
  border-right: none;
}
.exec-stat-label {
  font-size: 10px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.exec-stat-val {
  font-size: 13px;
  font-weight: 500;
  margin-top: 2px;
}
.err-count {
  color: var(--color-error);
  margin-left: 6px;
}

.exec-nodes {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.exec-node-card {
  margin: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  cursor: pointer;
  transition: border-color 0.15s;
  overflow: hidden;
}
.exec-node-card:hover {
  border-color: var(--color-border-strong);
}
.exec-node-success {
  border-left: 3px solid var(--color-success);
}
.exec-node-error {
  border-left: 3px solid var(--color-error);
}
.exec-node-skipped {
  border-left: 3px solid var(--color-text-muted);
  opacity: 0.6;
}
.exec-node-running {
  border-left: 3px solid var(--color-warning);
}

.exec-node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 12px;
}
.exec-status-icon {
  font-size: 11px;
  font-weight: 700;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}
.icon-success {
  color: var(--color-success);
}
.icon-error {
  color: var(--color-error);
}
.icon-skipped {
  color: var(--color-text-muted);
}
.icon-running {
  color: var(--color-warning);
}
.exec-node-label {
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exec-node-type {
  font-size: 10px;
  color: var(--color-text-muted);
  font-family: monospace;
  flex-shrink: 0;
}
.exec-node-cost {
  font-size: 10px;
  color: var(--color-brand);
  flex-shrink: 0;
}
.exec-node-time {
  font-size: 10px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.exec-expand-icon {
  font-size: 9px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.exec-node-error {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px 8px;
  background: rgba(239, 68, 68, 0.06);
  border-top: 1px solid rgba(239, 68, 68, 0.2);
}
.exec-error-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-error);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.exec-error-text {
  font-size: 11px;
  color: var(--color-error);
  word-break: break-word;
  line-height: 1.5;
}

.exec-node-detail {
  padding: 8px 10px;
  border-top: 1px solid var(--color-border);
  font-size: 11px;
}
.exec-llm-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}
.exec-output-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.exec-output-pre {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  overflow-x: auto;
  max-height: 180px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.exec-timing {
  margin-top: 6px;
  color: var(--color-text-muted);
  font-size: 10px;
}
.exec-node-skipped-reason {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px 10px 7px;
  background: rgba(100, 116, 139, 0.06);
  border-top: 1px solid rgba(100, 116, 139, 0.2);
}
.exec-skip-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.exec-skip-text {
  font-size: 11px;
  color: var(--color-text-secondary);
  word-break: break-word;
  line-height: 1.5;
}

/* Toast */
.run-toast {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  z-index: 100;
  box-shadow: var(--shadow-lg);
}
.run-toast-error {
  background: var(--color-error);
  color: #fff;
}
</style>

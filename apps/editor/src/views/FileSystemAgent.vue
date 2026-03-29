<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="fsa-layout">

      <!-- Top bar -->
      <div class="fsa-topbar">
        <div class="fsa-topbar-left">
          <span class="fsa-title">File Agent</span>
          <div class="root-input-wrap">
            <input
              v-model="rootInput"
              class="root-input"
              placeholder="Root path, e.g. C:\Projects\myapp or /home/user/project"
              @keydown.enter="setRoot"
            />
            <button class="btn btn-sm btn-primary" :disabled="picking" @click="openFolderPicker">
              <span v-if="picking" class="pick-spinner"></span>
              {{ picking ? '…' : 'Open' }}
            </button>
            <button v-if="rootInput" class="btn btn-sm btn-secondary" @click="setRoot" title="Use typed path">→</button>
          </div>
          <span v-if="root" class="root-badge" :title="root">{{ root }}</span>
        </div>
        <div class="fsa-topbar-right">
          <input v-model="searchQuery" class="search-input" placeholder="Search in files..." @keydown.enter="runSearch" />
          <button class="btn btn-sm btn-secondary" @click="runSearch">Search</button>
        </div>
      </div>

      <div class="fsa-body">

        <!-- File tree (left) -->
        <div class="fsa-tree">
          <div class="tree-toolbar">
            <span class="tree-root-label">{{ currentDir || '/' }}</span>
            <div class="tree-actions">
              <button title="New File" @click="promptNewFile">+F</button>
              <button title="New Folder" @click="promptNewDir">+D</button>
              <button title="Refresh" @click="loadDir(currentDir)">↺</button>
            </div>
          </div>

          <!-- Breadcrumb -->
          <div v-if="breadcrumbs.length > 1" class="breadcrumb">
            <span v-for="(crumb, i) in breadcrumbs" :key="i">
              <button class="crumb-btn" @click="loadDir(crumb.path)">{{ crumb.label }}</button>
              <span v-if="i < breadcrumbs.length - 1" class="crumb-sep">/</span>
            </span>
          </div>

          <div v-if="treeLoading" class="tree-loading">Loading...</div>
          <div v-else-if="!root" class="tree-empty">Enter a root path above to start</div>
          <div v-else class="tree-entries">
            <div
              v-for="entry in treeEntries"
              :key="entry.path"
              class="tree-entry"
              :class="{ selected: activeFile?.path === entry.path, directory: entry.type === 'directory' }"
              @click="onEntryClick(entry)"
              @contextmenu.prevent="openContextMenu($event, entry)"
            >
              <span class="entry-icon">{{ entry.type === 'directory' ? '📁' : fileIcon(entry.ext) }}</span>
              <span class="entry-name">{{ entry.name }}</span>
              <span v-if="entry.type === 'file'" class="entry-size">{{ formatSize(entry.size) }}</span>
            </div>
          </div>
        </div>

        <!-- Editor + terminal (center) -->
        <div class="fsa-editor-area">

          <!-- Tabs -->
          <div class="editor-tabs" v-if="openTabs.length">
            <div
              v-for="tab in openTabs"
              :key="tab.path"
              class="editor-tab"
              :class="{ active: activeTab?.path === tab.path, dirty: tab.dirty }"
              @click="activeTab = tab"
            >
              <span>{{ tab.name }}</span>
              <span v-if="tab.dirty" class="tab-dot">●</span>
              <button class="tab-close" @click.stop="closeTab(tab)">✕</button>
            </div>
          </div>

          <!-- Code editor -->
          <div v-if="activeTab" class="editor-pane">
            <div class="editor-file-info">
              <span class="editor-path">{{ activeTab.path }}</span>
              <div class="editor-actions">
                <button class="btn btn-xs btn-secondary" @click="saveFile">Save</button>
                <button class="btn btn-xs btn-secondary" @click="copyContent">Copy</button>
                <button class="btn btn-xs btn-danger" @click="deleteFile(activeTab)">Delete</button>
              </div>
            </div>
            <textarea
              ref="editorRef"
              v-model="activeTab.content"
              class="code-editor"
              spellcheck="false"
              @input="activeTab.dirty = true"
              @keydown.ctrl.s.prevent="saveFile"
              @keydown.meta.s.prevent="saveFile"
            ></textarea>
          </div>

          <!-- Search results -->
          <div v-else-if="searchResults" class="search-results-pane">
            <div class="search-results-header">
              Search: "{{ searchResults.query }}" — {{ searchResults.results.length }} matches
              <button class="btn btn-xs btn-secondary" @click="searchResults = null">✕</button>
            </div>
            <div
              v-for="(r, i) in searchResults.results"
              :key="i"
              class="search-result-row"
              @click="openSearchResult(r)"
            >
              <span class="sr-path">{{ r.path }}</span>
              <span class="sr-line">:{{ r.line }}</span>
              <span class="sr-text">{{ r.text }}</span>
            </div>
          </div>

          <div v-else class="editor-empty">
            <div class="editor-empty-inner">
              <div class="editor-empty-icon">🗂️</div>
              <p>Select a file to edit, or use the AI Agent panel →</p>
            </div>
          </div>

          <!-- Terminal panel -->
          <div class="terminal-panel" :class="{ collapsed: terminalCollapsed }">
            <div class="terminal-header" @click="terminalCollapsed = !terminalCollapsed">
              <span>Terminal</span>
              <span class="terminal-toggle">{{ terminalCollapsed ? '▲' : '▼' }}</span>
            </div>
            <div v-if="!terminalCollapsed" class="terminal-body">
              <div class="terminal-output" ref="terminalOutputRef">
                <div v-for="(line, i) in terminalLines" :key="i" :class="['terminal-line', line.type]">
                  <span class="terminal-line-text">{{ line.text }}</span>
                </div>
              </div>
              <div class="terminal-input-row">
                <span class="terminal-prompt">{{ root || '~' }} $</span>
                <input
                  v-model="terminalCmd"
                  class="terminal-input"
                  placeholder="Enter command..."
                  @keydown.enter="runCommand"
                />
                <button class="btn btn-xs btn-primary" @click="runCommand">Run</button>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Agent panel (right) -->
        <div class="fsa-agent-panel">
          <div class="agent-header">
            <span>AI Agent</span>
            <select v-model="agentModel" class="agent-model-select">
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-sonnet-4-6">Claude Sonnet</option>
              <option value="claude-haiku-4-5">Claude Haiku</option>
              <option value="gemini-1.5-flash">Gemini Flash</option>
            </select>
          </div>

          <div class="agent-api-key">
            <input v-model="agentApiKey" type="password" placeholder="API Key (optional)" class="agent-key-input" />
          </div>

          <div class="agent-context">
            <label class="agent-label">Context (current file)</label>
            <div class="agent-context-file">
              {{ activeTab ? activeTab.path : 'No file open' }}
            </div>
          </div>

          <div class="agent-messages" ref="agentMessagesRef">
            <div v-for="(msg, i) in agentMessages" :key="i" :class="['agent-msg', msg.role]">
              <div class="agent-msg-role">{{ msg.role === 'user' ? 'You' : 'Agent' }}</div>
              <div class="agent-msg-content" v-html="renderAgentMsg(msg.content)"></div>
              <!-- Apply patch buttons -->
              <div v-if="msg.patches && msg.patches.length" class="agent-patches">
                <div v-for="(patch, pi) in msg.patches" :key="pi" class="agent-patch">
                  <span class="patch-file">{{ patch.file }}</span>
                  <button class="btn btn-xs btn-primary" @click="applyPatch(patch)">Apply</button>
                  <button class="btn btn-xs btn-secondary" @click="previewPatch(patch)">Preview</button>
                </div>
              </div>
            </div>
            <div v-if="agentThinking" class="agent-msg assistant agent-thinking">
              <div class="agent-msg-role">Agent</div>
              <div class="thinking-dots"><span></span><span></span><span></span></div>
            </div>
          </div>

          <div class="agent-input-area">
            <textarea
              v-model="agentInput"
              class="agent-textarea"
              placeholder="Ask the agent to read, write, modify files, run commands..."
              rows="3"
              @keydown.ctrl.enter="sendAgentMessage"
              @keydown.meta.enter="sendAgentMessage"
            ></textarea>
            <div class="agent-input-actions">
              <label class="agent-hint">Ctrl+Enter to send</label>
              <button class="btn btn-sm btn-primary" :disabled="agentThinking" @click="sendAgentMessage">Send</button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Context menu -->
    <div v-if="contextMenu.visible" class="context-menu" :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }" @mouseleave="contextMenu.visible = false">
      <button @click="ctxRename">Rename</button>
      <button @click="ctxDelete">Delete</button>
      <button v-if="contextMenu.entry?.type === 'directory'" @click="ctxNewFile">New File Here</button>
      <button @click="ctxCopyPath">Copy Path</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import AppSidebar from '../components/shared/AppSidebar.vue';
import fsApi, { type FsEntry, type FsSearchResult } from '../api/filesystem';
import client from '../api/client';

// ─── State ────────────────────────────────────────────────────────
const root = ref('');
const rootInput = ref('');
const currentDir = ref('.');
const treeEntries = ref<FsEntry[]>([]);
const treeLoading = ref(false);
const picking = ref(false);

interface Tab { path: string; name: string; content: string; dirty: boolean; }
const openTabs = ref<Tab[]>([]);
const activeTab = ref<Tab | null>(null);
const activeFile = ref<FsEntry | null>(null);

const searchQuery = ref('');
const searchResults = ref<FsSearchResult | null>(null);

const terminalCollapsed = ref(false);
const terminalCmd = ref('');
const terminalLines = ref<{ type: 'cmd' | 'out' | 'err'; text: string }[]>([]);
const terminalOutputRef = ref<HTMLElement | null>(null);

// Agent
const agentMessages = ref<{ role: 'user' | 'assistant'; content: string; patches?: AgentPatch[] }[]>([]);
const agentInput = ref('');
const agentThinking = ref(false);
const agentModel = ref('gpt-4o-mini');
const agentApiKey = ref('');
const agentMessagesRef = ref<HTMLElement | null>(null);

const editorRef = ref<HTMLTextAreaElement | null>(null);

interface AgentPatch { file: string; oldStr: string; newStr: string; }

const contextMenu = ref<{ visible: boolean; x: number; y: number; entry: FsEntry | null }>({
  visible: false, x: 0, y: 0, entry: null,
});

// ─── Breadcrumbs ──────────────────────────────────────────────────
const breadcrumbs = computed(() => {
  if (!currentDir.value || currentDir.value === '.') return [{ label: '/', path: '.' }];
  const parts = currentDir.value.replace(/\\/g, '/').split('/').filter(Boolean);
  const crumbs = [{ label: '/', path: '.' }];
  let acc = '';
  for (const p of parts) {
    acc = acc ? `${acc}/${p}` : p;
    crumbs.push({ label: p, path: acc });
  }
  return crumbs;
});

// ─── File tree ────────────────────────────────────────────────────
async function openFolderPicker() {
  picking.value = true;
  try {
    const result = await fsApi.pickFolder();
    if (result.path) {
      rootInput.value = result.path;
      await setRoot();
    }
    // if cancelled, do nothing
  } catch (e: any) {
    // Picker failed (non-Windows or no GUI) — let user type manually
    const msg = e.response?.data?.error || e.message || 'Folder picker unavailable';
    alert(`Native picker failed: ${msg}\n\nType the path manually and press →`);
  } finally {
    picking.value = false;
  }
}

async function setRoot() {
  const input = rootInput.value.trim() || '.';
  root.value = input;
  rootInput.value = input;
  currentDir.value = '.';
  await loadDir('.');
}

async function loadDir(dirPath: string) {
  if (!root.value) return;
  treeLoading.value = true;
  try {
    const result = await fsApi.list(root.value, dirPath);
    treeEntries.value = result.items;
    currentDir.value = dirPath;
  } catch (e: any) {
    alert('Error: ' + (e.response?.data?.error || e.message));
  } finally {
    treeLoading.value = false;
  }
}

function onEntryClick(entry: FsEntry) {
  activeFile.value = entry;
  if (entry.type === 'directory') {
    loadDir(entry.path);
  } else {
    openFile(entry);
  }
}

async function openFile(entry: FsEntry) {
  const existing = openTabs.value.find(t => t.path === entry.path);
  if (existing) { activeTab.value = existing; return; }
  try {
    const result = await fsApi.read(root.value, entry.path);
    const tab: Tab = { path: entry.path, name: entry.name, content: result.content, dirty: false };
    openTabs.value.push(tab);
    activeTab.value = tab;
    searchResults.value = null;
  } catch (e: any) {
    alert('Cannot read file: ' + (e.response?.data?.error || e.message));
  }
}

function closeTab(tab: Tab) {
  if (tab.dirty && !confirm(`${tab.name} has unsaved changes. Close anyway?`)) return;
  const idx = openTabs.value.indexOf(tab);
  openTabs.value.splice(idx, 1);
  if (activeTab.value === tab) {
    activeTab.value = openTabs.value[Math.max(0, idx - 1)] ?? null;
  }
}

async function saveFile() {
  if (!activeTab.value) return;
  try {
    await fsApi.write(root.value, activeTab.value.path, activeTab.value.content);
    activeTab.value.dirty = false;
  } catch (e: any) {
    alert('Save failed: ' + (e.response?.data?.error || e.message));
  }
}

async function deleteFile(tab: Tab) {
  if (!confirm(`Delete ${tab.path}?`)) return;
  await fsApi.delete(root.value, tab.path);
  closeTab(tab);
  await loadDir(currentDir.value);
}

function copyContent() {
  if (activeTab.value) navigator.clipboard.writeText(activeTab.value.content);
}

// ─── New file / dir ───────────────────────────────────────────────
async function promptNewFile() {
  const name = prompt('File name:');
  if (!name) return;
  const filePath = currentDir.value === '.' ? name : `${currentDir.value}/${name}`;
  await fsApi.write(root.value, filePath, '');
  await loadDir(currentDir.value);
  const entry: FsEntry = { name, path: filePath, absolutePath: '', type: 'file', size: 0, modifiedAt: '', ext: name.split('.').pop() ?? null };
  openFile(entry);
}

async function promptNewDir() {
  const name = prompt('Directory name:');
  if (!name) return;
  const dirPath = currentDir.value === '.' ? name : `${currentDir.value}/${name}`;
  await fsApi.mkdir(root.value, dirPath);
  await loadDir(currentDir.value);
}

// ─── Search ───────────────────────────────────────────────────────
async function runSearch() {
  if (!searchQuery.value || !root.value) return;
  const result = await fsApi.search(root.value, searchQuery.value, currentDir.value);
  searchResults.value = result;
  activeTab.value = null;
}

async function openSearchResult(r: { path: string; line: number; text: string }) {
  const entry: FsEntry = { name: r.path.split('/').pop()!, path: r.path, absolutePath: '', type: 'file', size: 0, modifiedAt: '', ext: null };
  await openFile(entry);
}

// ─── Terminal ─────────────────────────────────────────────────────
async function runCommand() {
  if (!terminalCmd.value.trim()) return;
  const cmd = terminalCmd.value.trim();
  terminalLines.value.push({ type: 'cmd', text: `$ ${cmd}` });
  terminalCmd.value = '';
  try {
    const result = await fsApi.exec(root.value || '.', cmd);
    if (result.stdout) result.stdout.split('\n').forEach(l => terminalLines.value.push({ type: 'out', text: l }));
    if (result.stderr) result.stderr.split('\n').forEach(l => terminalLines.value.push({ type: 'err', text: l }));
  } catch (e: any) {
    terminalLines.value.push({ type: 'err', text: e.message });
  }
  await nextTick();
  if (terminalOutputRef.value) terminalOutputRef.value.scrollTop = terminalOutputRef.value.scrollHeight;
}

// ─── Context menu ─────────────────────────────────────────────────
function openContextMenu(e: MouseEvent, entry: FsEntry) {
  contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, entry };
}
async function ctxRename() {
  const entry = contextMenu.value.entry!;
  contextMenu.value.visible = false;
  const newName = prompt('New name:', entry.name);
  if (!newName || newName === entry.name) return;
  const dir = entry.path.includes('/') ? entry.path.substring(0, entry.path.lastIndexOf('/')) : '.';
  const newPath = dir === '.' ? newName : `${dir}/${newName}`;
  await fsApi.rename(root.value, entry.path, newPath);
  await loadDir(currentDir.value);
}
async function ctxDelete() {
  const entry = contextMenu.value.entry!;
  contextMenu.value.visible = false;
  if (!confirm(`Delete ${entry.path}?`)) return;
  await fsApi.delete(root.value, entry.path);
  await loadDir(currentDir.value);
}
async function ctxNewFile() {
  contextMenu.value.visible = false;
  const name = prompt('File name:');
  if (!name) return;
  const filePath = `${contextMenu.value.entry!.path}/${name}`;
  await fsApi.write(root.value, filePath, '');
  await loadDir(currentDir.value);
}
function ctxCopyPath() {
  navigator.clipboard.writeText(contextMenu.value.entry!.path);
  contextMenu.value.visible = false;
}

// ─── AI Agent ─────────────────────────────────────────────────────
function renderAgentMsg(content: string): string {
  // Render code blocks with basic highlighting
  return content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="agent-code"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="agent-inline-code">$1</code>')
    .replace(/\n/g, '<br>');
}

async function sendAgentMessage() {
  const text = agentInput.value.trim();
  if (!text || agentThinking.value) return;
  agentInput.value = '';
  agentMessages.value.push({ role: 'user', content: text });
  agentThinking.value = true;
  await nextTick();
  scrollAgentMessages();

  try {
    // Build context: current file content + directory listing
    let contextBlock = `Root: ${root.value || '(not set)'}\nCurrent dir: ${currentDir.value}\n`;
    if (activeTab.value) {
      contextBlock += `\nOpen file: ${activeTab.value.path}\n\`\`\`\n${activeTab.value.content.slice(0, 8000)}\n\`\`\`\n`;
    }

    const systemPrompt = `You are a filesystem agent like VS Code or Claude Code. You can read, write, modify, create, and delete files on the user's local machine.

When you want to modify a file, output a JSON block in this exact format (one per change):
<patch>
{"file":"relative/path","oldStr":"exact string to replace","newStr":"replacement string"}
</patch>

When you want to create a new file, use oldStr="" and newStr=<full content>.
When you want to run a terminal command, output:
<exec>{"command":"the command"}</exec>

Always explain what you're doing. Be concise and precise.

${contextBlock}`;

    const response = await client.post('/api/baniya/chat', {
      prompt: text,
      systemPrompt,
      model: agentModel.value,
      apiKey: agentApiKey.value || undefined,
    });

    const reply: string = response.data?.text ?? response.data?.content ?? JSON.stringify(response.data);

    // Parse patches
    const patches: AgentPatch[] = [];
    const patchRegex = /<patch>\s*([\s\S]*?)\s*<\/patch>/g;
    let m;
    while ((m = patchRegex.exec(reply)) !== null) {
      try { patches.push(JSON.parse(m[1])); } catch { /* skip malformed */ }
    }

    // Auto-execute <exec> blocks
    const execRegex = /<exec>\s*([\s\S]*?)\s*<\/exec>/g;
    while ((m = execRegex.exec(reply)) !== null) {
      try {
        const { command } = JSON.parse(m[1]);
        terminalLines.value.push({ type: 'cmd', text: `$ ${command}` });
        const result = await fsApi.exec(root.value || '.', command);
        if (result.stdout) result.stdout.split('\n').forEach(l => terminalLines.value.push({ type: 'out', text: l }));
        if (result.stderr) result.stderr.split('\n').forEach(l => terminalLines.value.push({ type: 'err', text: l }));
      } catch { /* ignore */ }
    }

    agentMessages.value.push({ role: 'assistant', content: reply, patches: patches.length ? patches : undefined });
  } catch (e: any) {
    agentMessages.value.push({ role: 'assistant', content: `Error: ${e.response?.data?.error || e.message}` });
  } finally {
    agentThinking.value = false;
    await nextTick();
    scrollAgentMessages();
  }
}

async function applyPatch(patch: AgentPatch) {
  try {
    if (patch.oldStr === '') {
      // Create new file
      await fsApi.write(root.value, patch.file, patch.newStr);
      await loadDir(currentDir.value);
    } else {
      await fsApi.patch(root.value, patch.file, patch.oldStr, patch.newStr);
      // Refresh open tab if it's the patched file
      const tab = openTabs.value.find(t => t.path === patch.file);
      if (tab) {
        const result = await fsApi.read(root.value, patch.file);
        tab.content = result.content;
        tab.dirty = false;
      }
    }
    agentMessages.value.push({ role: 'assistant', content: `✅ Applied patch to \`${patch.file}\`` });
  } catch (e: any) {
    agentMessages.value.push({ role: 'assistant', content: `❌ Patch failed: ${e.response?.data?.error || e.message}` });
  }
}

function previewPatch(patch: AgentPatch) {
  const tab = openTabs.value.find(t => t.path === patch.file);
  if (tab) {
    activeTab.value = tab;
    // Highlight the oldStr in the editor (basic scroll)
    nextTick(() => {
      if (editorRef.value) {
        const idx = tab.content.indexOf(patch.oldStr);
        if (idx !== -1) editorRef.value.setSelectionRange(idx, idx + patch.oldStr.length);
        editorRef.value.focus();
      }
    });
  }
}

function scrollAgentMessages() {
  if (agentMessagesRef.value) agentMessagesRef.value.scrollTop = agentMessagesRef.value.scrollHeight;
}

// ─── Helpers ──────────────────────────────────────────────────────
function fileIcon(ext: string | null): string {
  const map: Record<string, string> = {
    ts: '🟦', tsx: '🟦', js: '🟨', jsx: '🟨', vue: '💚', py: '🐍',
    json: '📋', md: '📝', html: '🌐', css: '🎨', scss: '🎨',
    sh: '⚙️', env: '🔑', txt: '📄', png: '🖼️', jpg: '🖼️', svg: '🖼️',
    sql: '🗄️', yaml: '⚙️', yml: '⚙️', toml: '⚙️', lock: '🔒',
  };
  return map[ext ?? ''] ?? '📄';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
</script>

<style scoped>
/* ─── Layout ─────────────────────────────────────────────── */
.fsa-layout { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.fsa-body { flex: 1; display: flex; overflow: hidden; min-height: 0; }

/* ─── Top bar ────────────────────────────────────────────── */
.fsa-topbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-bottom: 1px solid var(--color-border); background: var(--color-bg-primary); gap: 12px; min-height: 44px; flex-shrink: 0; }
.fsa-topbar-left { display: flex; align-items: center; gap: 8px; flex: 1; }
.fsa-topbar-right { display: flex; align-items: center; gap: 6px; }
.fsa-title { font-weight: 600; font-size: 14px; white-space: nowrap; }
.root-input-wrap { display: flex; gap: 4px; flex: 1; max-width: 480px; }
.root-input { flex: 1; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
.root-badge { font-size: 11px; color: var(--color-text-muted); font-family: monospace; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: default; }
.search-input { font-size: 12px; width: 200px; }
.pick-spinner {
  display: inline-block; width: 10px; height: 10px;
  border: 1.5px solid #fff; border-top-color: transparent;
  border-radius: 50%; animation: pick-spin 0.6s linear infinite;
  vertical-align: middle;
}
@keyframes pick-spin { to { transform: rotate(360deg); } }
/* ─── File tree ──────────────────────────────────────────── */
.fsa-tree { width: 240px; border-right: 1px solid var(--color-border); display: flex; flex-direction: column; overflow: hidden; background: var(--color-bg-secondary); flex-shrink: 0; }
.tree-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-bottom: 1px solid var(--color-border); font-size: 11px; font-weight: 500; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.tree-actions { display: flex; gap: 4px; }
.tree-actions button { font-size: 11px; padding: 2px 5px; border-radius: 3px; background: var(--color-bg-tertiary); border: 1px solid var(--color-border); cursor: pointer; color: var(--color-text-secondary); }
.tree-actions button:hover { background: var(--color-brand-light); color: var(--color-brand); }
.tree-root-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
.breadcrumb { display: flex; align-items: center; flex-wrap: wrap; padding: 4px 8px; font-size: 11px; border-bottom: 1px solid var(--color-border); gap: 2px; }
.crumb-btn { background: none; border: none; cursor: pointer; color: var(--color-brand); font-size: 11px; padding: 0 2px; }
.crumb-btn:hover { text-decoration: underline; }
.crumb-sep { color: var(--color-text-muted); }
.tree-entries { flex: 1; overflow-y: auto; padding: 4px 0; }
.tree-loading, .tree-empty { padding: 16px; font-size: 12px; color: var(--color-text-muted); text-align: center; }
.tree-entry { display: flex; align-items: center; gap: 6px; padding: 4px 10px; cursor: pointer; font-size: 12px; border-radius: 0; transition: background 0.1s; }
.tree-entry:hover { background: var(--color-bg-tertiary); }
.tree-entry.selected { background: var(--color-brand-light); color: var(--color-brand); }
.tree-entry.directory { font-weight: 500; }
.entry-icon { font-size: 13px; flex-shrink: 0; }
.entry-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entry-size { font-size: 10px; color: var(--color-text-muted); flex-shrink: 0; }

/* ─── Editor area ────────────────────────────────────────── */
.fsa-editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
.editor-tabs { display: flex; overflow-x: auto; border-bottom: 1px solid var(--color-border); background: var(--color-bg-secondary); flex-shrink: 0; }
.editor-tab { display: flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 12px; cursor: pointer; border-right: 1px solid var(--color-border); white-space: nowrap; color: var(--color-text-secondary); }
.editor-tab:hover { background: var(--color-bg-tertiary); }
.editor-tab.active { background: var(--color-bg-primary); color: var(--color-text-primary); border-bottom: 2px solid var(--color-brand); }
.editor-tab.dirty { font-style: italic; }
.tab-dot { color: var(--color-brand); font-size: 10px; }
.tab-close { background: none; border: none; cursor: pointer; color: var(--color-text-muted); font-size: 12px; padding: 0 2px; line-height: 1; }
.tab-close:hover { color: var(--color-text-primary); }
.editor-pane { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.editor-file-info { display: flex; justify-content: space-between; align-items: center; padding: 4px 10px; border-bottom: 1px solid var(--color-border); background: var(--color-bg-secondary); flex-shrink: 0; }
.editor-path { font-size: 11px; color: var(--color-text-muted); font-family: monospace; }
.editor-actions { display: flex; gap: 4px; }
.code-editor { flex: 1; width: 100%; border: none; outline: none; resize: none; font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace; font-size: 13px; line-height: 1.6; padding: 12px 16px; background: var(--color-bg-primary); color: var(--color-text-primary); tab-size: 2; }
.editor-empty { flex: 1; display: flex; align-items: center; justify-content: center; }
.editor-empty-inner { text-align: center; color: var(--color-text-muted); }
.editor-empty-icon { font-size: 48px; margin-bottom: 12px; }

/* ─── Search results ─────────────────────────────────────── */
.search-results-pane { flex: 1; overflow-y: auto; padding: 8px; }
.search-results-header { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 500; margin-bottom: 8px; padding: 4px 0; border-bottom: 1px solid var(--color-border); }
.search-result-row { display: flex; gap: 8px; align-items: baseline; padding: 4px 6px; border-radius: 4px; cursor: pointer; font-size: 12px; font-family: monospace; }
.search-result-row:hover { background: var(--color-bg-secondary); }
.sr-path { color: var(--color-brand); font-weight: 500; flex-shrink: 0; }
.sr-line { color: var(--color-text-muted); flex-shrink: 0; }
.sr-text { color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ─── Terminal ───────────────────────────────────────────── */
.terminal-panel { border-top: 1px solid var(--color-border); background: #0d1117; flex-shrink: 0; display: flex; flex-direction: column; max-height: 240px; }
.terminal-panel.collapsed { max-height: 32px; }
.terminal-header { display: flex; justify-content: space-between; align-items: center; padding: 4px 12px; font-size: 11px; font-weight: 500; color: #8b949e; cursor: pointer; user-select: none; height: 28px; }
.terminal-toggle { font-size: 10px; }
.terminal-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.terminal-output { flex: 1; overflow-y: auto; padding: 6px 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.terminal-line { line-height: 1.5; }
.terminal-line.cmd { color: #79c0ff; }
.terminal-line.out { color: #e6edf3; }
.terminal-line.err { color: #f85149; }
.terminal-input-row { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-top: 1px solid #21262d; }
.terminal-prompt { font-family: monospace; font-size: 11px; color: #3fb950; white-space: nowrap; flex-shrink: 0; }
.terminal-input { flex: 1; background: transparent; border: none; outline: none; color: #e6edf3; font-family: 'JetBrains Mono', monospace; font-size: 12px; }

/* ─── AI Agent panel ─────────────────────────────────────── */
.fsa-agent-panel { width: 320px; border-left: 1px solid var(--color-border); display: flex; flex-direction: column; overflow: hidden; background: var(--color-bg-primary); flex-shrink: 0; }
.agent-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--color-border); font-size: 13px; font-weight: 600; }
.agent-model-select { font-size: 11px; padding: 2px 4px; border-radius: 4px; }
.agent-api-key { padding: 6px 12px; border-bottom: 1px solid var(--color-border); }
.agent-key-input { width: 100%; font-size: 11px; }
.agent-context { padding: 6px 12px; border-bottom: 1px solid var(--color-border); }
.agent-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
.agent-context-file { font-size: 11px; font-family: monospace; color: var(--color-brand); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-messages { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.agent-msg { border-radius: 6px; padding: 8px 10px; font-size: 12px; line-height: 1.5; }
.agent-msg.user { background: var(--color-bg-secondary); align-self: flex-end; max-width: 90%; }
.agent-msg.assistant { background: rgba(13, 158, 117, 0.08); border: 1px solid rgba(13, 158, 117, 0.2); }
.agent-msg-role { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); margin-bottom: 4px; }
.agent-msg-content :deep(pre.agent-code) { background: var(--color-bg-tertiary); border-radius: 4px; padding: 8px; overflow-x: auto; font-size: 11px; margin: 6px 0; }
.agent-msg-content :deep(code.agent-inline-code) { background: var(--color-bg-tertiary); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
.agent-patches { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.agent-patch { display: flex; align-items: center; gap: 6px; padding: 4px 6px; background: var(--color-bg-secondary); border-radius: 4px; font-size: 11px; }
.patch-file { flex: 1; font-family: monospace; color: var(--color-brand); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-thinking { opacity: 0.7; }
.thinking-dots { display: flex; gap: 4px; padding: 4px 0; }
.thinking-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--color-brand); animation: bounce 1.2s infinite; }
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }
.agent-input-area { padding: 8px; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 6px; }
.agent-textarea { width: 100%; font-size: 12px; resize: none; font-family: inherit; }
.agent-input-actions { display: flex; justify-content: space-between; align-items: center; }
.agent-hint { font-size: 10px; color: var(--color-text-muted); }

/* ─── Context menu ───────────────────────────────────────── */
.context-menu { position: fixed; z-index: 1000; background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.2); padding: 4px; display: flex; flex-direction: column; min-width: 140px; }
.context-menu button { text-align: left; padding: 6px 12px; font-size: 12px; border-radius: 4px; background: none; border: none; cursor: pointer; color: var(--color-text-primary); }
.context-menu button:hover { background: var(--color-bg-secondary); }

/* ─── Utility ────────────────────────────────────────────── */
.btn-xs { padding: 2px 7px; font-size: 11px; }
.btn-danger { background: rgba(248, 81, 73, 0.1); color: #f85149; border-color: rgba(248, 81, 73, 0.3); }
.btn-danger:hover { background: rgba(248, 81, 73, 0.2); }
</style>

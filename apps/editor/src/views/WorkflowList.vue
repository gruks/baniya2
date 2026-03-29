<template>
  <div class="app-layout">
    <AppSidebar />
    <div class="app-content">
      <header class="topbar">
        <h1 class="topbar-title">Workflows</h1>
        <div class="topbar-actions">
          <input v-model="search" type="text" placeholder="Search workflows..." class="search-input" />
          <button class="btn btn-primary" @click="showCreate = true">+ New Workflow</button>
        </div>
      </header>
      <div class="page-container">
        <div v-if="loading" class="loading-state"><div class="spinner"></div></div>
        <div v-else-if="filtered.length === 0" class="empty-state">
          <p>No workflows yet</p>
          <button class="btn btn-primary" @click="showCreate = true">Create your first workflow</button>
        </div>
        <div v-else class="workflow-grid">
          <div v-for="wf in filtered" :key="wf.id" class="workflow-card card" @click="openWorkflow(wf.id)">
            <div class="wf-card-header">
              <h3 class="wf-name">{{ wf.name }}</h3>
              <span :class="['badge', wf.active ? 'badge-success' : 'badge-muted']">{{ wf.active ? 'Active' : 'Inactive' }}</span>
            </div>
            <p class="wf-desc">{{ wf.description || 'No description' }}</p>
            <div class="wf-meta">
              <span>{{ wf.nodes?.length || 0 }} nodes</span>
              <span>{{ formatDate(wf.updatedAt) }}</span>
            </div>
            <div class="wf-actions" @click.stop>
              <button class="btn btn-sm btn-secondary" @click="runWorkflow(wf.id)">▶ Run</button>
              <button class="btn btn-sm btn-danger" @click="deleteWorkflow(wf.id)">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal-content card">
        <h2>New Workflow</h2>
        <form @submit.prevent="createWorkflow">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input v-model="newName" required placeholder="My Workflow" />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea v-model="newDesc" placeholder="What does this workflow do?" rows="3"></textarea>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" @click="showCreate = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWorkflowsStore } from '../stores/workflows';
import AppSidebar from '../components/shared/AppSidebar.vue';

const store = useWorkflowsStore();
const router = useRouter();

const search = ref('');
const showCreate = ref(false);
const newName = ref('');
const newDesc = ref('');
const loading = ref(true);

const filtered = computed(() =>
  store.workflows.filter(w =>
    w.name.toLowerCase().includes(search.value.toLowerCase())
  )
);

onMounted(async () => {
  await store.fetchAll();
  loading.value = false;
});

function openWorkflow(id: string) {
  router.push(`/workflows/${id}`);
}

async function createWorkflow() {
  const wf = await store.create({ name: newName.value, description: newDesc.value });
  showCreate.value = false;
  newName.value = '';
  newDesc.value = '';
  router.push(`/workflows/${wf.id}`);
}

async function runWorkflow(id: string) {
  try { await store.execute(id); } catch (e: any) { alert(e.response?.data?.error || 'Execution failed'); }
}

async function deleteWorkflow(id: string) {
  if (confirm('Delete this workflow?')) await store.remove(id);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString();
}
</script>

<style scoped>
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 24px; border-bottom: 1px solid var(--color-border); background: var(--color-bg-primary); }
.topbar-title { font-size: 18px; font-weight: 500; }
.topbar-actions { display: flex; gap: 8px; align-items: center; }
.search-input { width: 220px; }
.loading-state { display: flex; justify-content: center; padding: 60px; }
.empty-state { text-align: center; padding: 60px; color: var(--color-text-secondary); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.workflow-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.workflow-card { cursor: pointer; transition: box-shadow 0.15s; }
.workflow-card:hover { box-shadow: var(--shadow-md); }
.wf-card-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
.wf-name { font-size: 15px; font-weight: 500; }
.wf-desc { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 12px; }
.wf-meta { font-size: 12px; color: var(--color-text-muted); display: flex; gap: 16px; margin-bottom: 12px; }
.wf-actions { display: flex; gap: 6px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { width: 440px; padding: 24px; }
.modal-content h2 { margin-bottom: 16px; font-size: 18px; font-weight: 500; }
.modal-content input, .modal-content textarea { width: 100%; }
</style>

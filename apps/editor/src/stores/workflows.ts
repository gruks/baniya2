import { defineStore } from 'pinia';
import { ref } from 'vue';
import { workflowsApi } from '../api/workflows';

export const useWorkflowsStore = defineStore('workflows', () => {
  const workflows = ref<any[]>([]);
  const currentWorkflow = ref<any>(null);
  const loading = ref(false);

  async function fetchAll() {
    loading.value = true;
    try {
      const res = await workflowsApi.list();
      workflows.value = res.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchOne(id: string) {
    loading.value = true;
    try {
      const res = await workflowsApi.get(id);
      currentWorkflow.value = res.data;
      return res.data;
    } finally {
      loading.value = false;
    }
  }

  async function create(data: { name: string; description?: string }) {
    const res = await workflowsApi.create(data);
    workflows.value.unshift(res.data);
    return res.data;
  }

  async function save(id: string, data: any) {
    const res = await workflowsApi.update(id, data);
    currentWorkflow.value = res.data;
    return res.data;
  }

  async function execute(id: string, payload?: any) {
    const res = await workflowsApi.execute(id, payload);
    return res.data;
  }

  async function remove(id: string) {
    await workflowsApi.delete(id);
    workflows.value = workflows.value.filter(w => w.id !== id);
  }

  return { workflows, currentWorkflow, loading, fetchAll, fetchOne, create, save, execute, remove };
});

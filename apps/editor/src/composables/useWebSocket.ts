import { ref, onUnmounted } from 'vue';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export function useWebSocket() {
  const connected = ref(false);
  const lastEvent = ref<any>(null);
  const nodeStatuses = ref<Record<string, { status: string; result?: any }>>({});
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = 1000;

  function connect() {
    const token = localStorage.getItem('baniya-token');
    ws = new WebSocket(`${WS_URL}/ws?token=${token || ''}`);

    ws.onopen = () => {
      connected.value = true;
      reconnectDelay = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        lastEvent.value = data;

        if (data.type === 'node:running') {
          nodeStatuses.value[data.nodeId] = { status: 'running' };
        } else if (data.type === 'node:done') {
          nodeStatuses.value[data.nodeId] = { status: 'success', result: data.result };
        } else if (data.type === 'node:error') {
          nodeStatuses.value[data.nodeId] = { status: 'error', result: { error: data.error } };
        } else if (data.type === 'execution:started') {
          nodeStatuses.value = {};
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      connected.value = false;
      reconnect();
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function reconnect() {
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      connect();
    }, reconnectDelay);
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
    ws = null;
  }

  function resetNodeStatuses() {
    nodeStatuses.value = {};
  }

  onUnmounted(disconnect);

  return { connected, lastEvent, nodeStatuses, connect, disconnect, resetNodeStatuses };
}

import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/Login.vue'), meta: { public: true } },
    { path: '/register', component: () => import('../views/Register.vue'), meta: { public: true } },
    { path: '/', redirect: '/workflows' },
    { path: '/workflows', component: () => import('../views/WorkflowList.vue'), meta: { auth: true } },
    { path: '/workflows/:id', component: () => import('../views/WorkflowEditor.vue'), meta: { auth: true } },
    { path: '/executions/:id', component: () => import('../views/ExecutionDetail.vue'), meta: { auth: true } },
    { path: '/dashboard', component: () => import('../views/BaniyaDashboard.vue'), meta: { auth: true } },
    { path: '/settings', component: () => import('../views/Settings.vue'), meta: { auth: true } },
    { path: '/files', component: () => import('../views/FileSystemAgent.vue'), meta: { auth: true } },
  ],
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('baniya-token');
  if (to.meta.auth && !token) {
    next('/login');
  } else if (to.meta.public && token) {
    next('/workflows');
  } else {
    next();
  }
});

export default router;

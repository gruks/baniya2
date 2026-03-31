import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './index.css';

// Dark mode initialization — apply before mount to prevent flash
if (localStorage.getItem('baniya-dark') === 'true') {
  document.documentElement.classList.add('dark');
}

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

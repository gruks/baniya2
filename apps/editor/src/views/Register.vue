<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <span class="logo-icon">₹</span>
        <span class="logo-text">baniya</span>
      </div>
      <p class="auth-subtitle">Create your account</p>
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input v-model="name" type="text" required placeholder="Your name" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input v-model="email" type="email" required placeholder="you@company.com" />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input v-model="password" type="password" required minlength="6" placeholder="Min 6 characters" />
        </div>
        <p v-if="error" class="auth-error">{{ error }}</p>
        <button type="submit" class="btn btn-primary auth-btn" :disabled="loading">
          {{ loading ? 'Creating...' : 'Create Account' }}
        </button>
      </form>
      <p class="auth-footer">
        Already have an account? <router-link to="/login">Sign In</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleRegister() {
  error.value = '';
  loading.value = true;
  try {
    await auth.register(email.value, password.value, name.value);
    router.push('/workflows');
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Registration failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page { height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--color-bg-secondary); }
.auth-card { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 40px; width: 400px; box-shadow: var(--shadow-lg); }
.auth-logo { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.logo-icon { width: 36px; height: 36px; background: var(--color-brand); color: #fff; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 500; }
.logo-text { font-size: 24px; font-weight: 500; }
.auth-subtitle { color: var(--color-text-secondary); margin-bottom: 24px; font-size: 13px; }
.auth-form { display: flex; flex-direction: column; }
.auth-form input { width: 100%; }
.auth-btn { width: 100%; justify-content: center; padding: 10px; font-size: 14px; margin-top: 8px; }
.auth-error { color: var(--color-error); font-size: 13px; margin-bottom: 8px; }
.auth-footer { text-align: center; margin-top: 16px; font-size: 13px; color: var(--color-text-secondary); }
</style>

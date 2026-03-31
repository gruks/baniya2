<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">
        <span class="logo-icon">₹</span>
        <span class="logo-text">baniya</span>
      </div>
      <p class="auth-subtitle">Shrewd routing. Zero waste.</p>
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="you@company.com"
            :disabled="auth.loading"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
            :disabled="auth.loading"
          />
        </div>
        <p v-if="auth.error" class="auth-error">{{ auth.error }}</p>
        <button
          type="submit"
          class="btn btn-primary auth-btn"
          :disabled="auth.loading"
        >
          <span v-if="auth.loading" class="spinner"></span>
          {{ auth.loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
      <p class="auth-footer">
        Don't have an account?
        <router-link to="/register">Register</router-link>
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

const email = ref('');
const password = ref('');

async function handleLogin() {
  try {
    await auth.login(email.value, password.value);
    router.push('/workflows');
  } catch {
    // Error already set by store
  }
}
</script>

<style scoped>
.auth-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
}
.auth-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 40px;
  width: 400px;
  box-shadow: var(--shadow-lg);
}
.auth-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.logo-icon {
  width: 36px;
  height: 36px;
  background: var(--color-brand);
  color: #fff;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 500;
}
.logo-text {
  font-size: 24px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.auth-subtitle {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  font-size: 13px;
}
.auth-form {
  display: flex;
  flex-direction: column;
}
.auth-form input {
  width: 100%;
}
.auth-btn {
  width: 100%;
  justify-content: center;
  padding: 10px;
  font-size: 14px;
  margin-top: 8px;
}
.auth-error {
  color: var(--color-error);
  font-size: 13px;
  margin-bottom: 8px;
}
.auth-footer {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>

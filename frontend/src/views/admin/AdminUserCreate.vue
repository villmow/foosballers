<script setup lang="ts">
import { AuthService } from '@/service/AuthService';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();

const form = ref({
  username: '',
  email: '',
  password: '',
  role: 'user'
});
const loading = ref(false);
const error = ref('');

const roles = [
  { label: 'User', value: 'commentator' },
  { label: 'Admin', value: 'admin' }
];

const validate = () => {
  if (!form.value.username || !form.value.email || !form.value.password) {
    error.value = 'All fields are required.';
    return false;
  }
  // Add more validation as needed
  error.value = '';
  return true;
};

const submit = async () => {
  if (!validate()) return;
  loading.value = true;
  try {
    await AuthService.createUser(form.value);
    toast.add({ severity: 'success', summary: 'User Created', detail: 'The user was created successfully.', life: 3000 });
    router.push('/admin/users');
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to create user.';
    toast.add({ severity: 'error', summary: 'Error', detail: error.value, life: 3000 });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="grid grid-cols-12 gap-8">
    <div class="col-span-12 md:col-span-8 xl:col-span-6">
      <div class="card flex flex-col gap-4">
        <div class="font-semibold text-xl mb-2">Create New User</div>
        <form @submit.prevent="submit" class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label class="font-medium">Username</label>
            <input v-model="form.username" type="text" class="input w-full" required />
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-medium">Email</label>
            <input v-model="form.email" type="email" class="input w-full" required />
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-medium">Password</label>
            <input v-model="form.password" type="password" class="input w-full" required />
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-medium">Role</label>
            <select v-model="form.role" class="input w-full">
              <option v-for="role in roles" :key="role.value" :value="role.value">{{ role.label }}</option>
            </select>
          </div>
          <div v-if="error" class="text-red-500">{{ error }}</div>
          <button type="submit" class="btn btn-primary w-full" :disabled="loading">
            <span v-if="loading">Creating...</span>
            <span v-else>Create User</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input {
  @apply border rounded px-3 py-2;
}
.btn-primary {
  @apply bg-primary text-white font-bold py-2 px-4 rounded;
}
</style>

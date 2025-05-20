<script setup>
import { useAuth } from '@/composables/useAuth';
import { ref } from 'vue';

const { user, updateUserProfile } = useAuth();

const name = ref(user.value?.name || '');
const email = ref(user.value?.email || '');
const password = ref('');
const confirmPassword = ref('');
const notification = ref(null);
const loading = ref(false);

const handleSubmit = async () => {
  notification.value = null;
  if (password.value && password.value !== confirmPassword.value) {
    notification.value = { type: 'error', message: 'Passwords do not match.' };
    return;
  }
  loading.value = true;
  try {
    await updateUserProfile({
      name: name.value,
      email: email.value,
      password: password.value || undefined
    });
    notification.value = { type: 'success', message: 'Profile updated successfully.' };
    password.value = '';
    confirmPassword.value = '';
  } catch (e) {
    notification.value = { type: 'error', message: e.message || 'Update failed.' };
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-lg mx-auto mt-10">
    <div class="card flex flex-col gap-6 p-6">
      <div class="font-semibold text-2xl mb-2">Profile Settings</div>
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label for="profile-name">Name</label>
          <InputText id="profile-name" v-model="name" type="text" required />
        </div>
        <div class="flex flex-col gap-2">
          <label for="profile-email">Email</label>
          <InputText id="profile-email" v-model="email" type="email" required />
        </div>
        <div class="flex flex-col gap-2">
          <label for="profile-password">New Password</label>
          <InputText id="profile-password" v-model="password" type="password" placeholder="Leave blank to keep current password" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="profile-confirm-password">Confirm Password</label>
          <InputText id="profile-confirm-password" v-model="confirmPassword" type="password" placeholder="Repeat new password" />
        </div>
        <Button :label="loading ? 'Saving...' : 'Save Changes'" :disabled="loading" type="submit" />
        <div v-if="notification" :class="notification.type === 'error' ? 'text-red-500' : 'text-green-600'">
          {{ notification.message }}
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
</style>

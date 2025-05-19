<script setup>
import FloatingConfigurator from '@/components/FloatingConfigurator.vue';
import { AuthService } from '@/service/AuthService';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';

const email = ref('');
const loading = ref(false);
const toast = useToast();

const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const handleSubmit = async () => {
  if (!email.value) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Email is required', life: 3000 });
    return;
  }
  
  if (!validateEmail(email.value)) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Please enter a valid email address', life: 3000 });
    return;
  }
  
  try {
    loading.value = true;
    
    await AuthService.forgotPassword(email.value);
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Password reset instructions have been sent to your email',
      life: 5000,
    });
    
    email.value = ''; // Clear the form
    
  } catch (error) {
    let errorMessage = 'An error occurred while processing your request';
    
    // Check if the error is for rate limiting
    if (error.message?.includes('rate limit') || error.message?.includes('too many attempts')) {
      errorMessage = 'Too many password reset attempts. Please try again later.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 5000 });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Toast />
  <FloatingConfigurator />
  <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
    <div class="flex flex-col items-center justify-center">
      <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
        <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
          <div class="text-center mb-8">
            <svg viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="mb-8 w-16 shrink-0 mx-auto">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M17.1637 19.2467C17.1566 19.4033 17.1529 19.561 17.1529 19.7194C17.1529 25.3503 21.7203 29.915 27.3546 29.915C32.9887 29.915 37.5561 25.3503 37.5561 19.7194C37.5561 19.5572 37.5524 19.3959 37.5449 19.2355C38.5617 19.0801 39.5759 18.9013 40.5867 18.6994L40.6926 18.6782C40.7191 19.0218 40.7326 19.369 40.7326 19.7194C40.7326 27.1036 34.743 33.0896 27.3546 33.0896C19.966 33.0896 13.9765 27.1036 13.9765 19.7194C13.9765 19.374 13.9896 19.0316 14.0154 18.6927L14.0486 18.6994C15.0837 18.9062 16.1223 19.0886 17.1637 19.2467ZM33.3284 11.4538C31.6493 10.2396 29.5855 9.52381 27.3546 9.52381C25.1195 9.52381 23.0524 10.2421 21.3717 11.4603C20.0078 11.3232 18.6475 11.1387 17.2933 10.907C19.7453 8.11308 23.3438 6.34921 27.3546 6.34921C31.36 6.34921 34.9543 8.10844 37.4061 10.896C36.0521 11.1292 34.692 11.3152 33.3284 11.4538Z"
                fill="var(--primary-color)"
              />
            </svg>
            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Forgot Password</div>
            <span class="text-muted-color font-medium">Enter your email to receive password reset instructions</span>
          </div>

          <div class="mb-5 text-muted-color">
            <p>Enter the email address associated with your account, and we'll email you a link to reset your password.</p>
          </div>

          <form @submit.prevent="handleSubmit">
            <div class="flex flex-col gap-4">
              <div>
                <label for="email" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                <InputText 
                  id="email" 
                  v-model="email" 
                  type="text" 
                  placeholder="Enter your email address" 
                  class="w-full md:w-[30rem]"
                  :class="{ 'p-invalid': email === '' }"
                  aria-describedby="email-help" 
                />
              </div>

              <Button 
                type="submit" 
                label="Reset Password" 
                class="w-full mt-4" 
                :loading="loading"
                :disabled="loading"
              />

              <div class="text-center mt-4">
                <router-link to="/auth/login" class="font-medium no-underline text-primary">Back to Login</router-link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.p-button.p-button-loading {
  opacity: 0.8;
}
</style>

<script setup>
import MatchConfiguration from '@/components/match/MatchConfiguration.vue';
import PlayerConfiguration from '@/components/match/PlayerConfiguration.vue';
import { ref } from 'vue';

const playerSetup = ref('2v2');
</script>

<template>
  <div class="flex flex-row justify-center items-start gap-8 min-h-[60vh]">
    <MatchConfiguration :playerSetup="playerSetup" />
    <PlayerConfiguration v-model="playerSetup" />
  </div>
</template>

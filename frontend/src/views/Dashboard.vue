<script setup>
import MatchConfiguration from '@/components/match/MatchConfiguration.vue';
import PlayerConfiguration from '@/components/match/PlayerConfiguration.vue';
import { ref } from 'vue';

const playerSetup = ref('2v2');
const matchConfigRef = ref(null);

function getMatchConfiguration() {
  return matchConfigRef.value?.getConfiguration();
}
</script>

<template>
  <div class="flex flex-col gap-8 min-h-[60vh]">
    <!-- Configuration Section -->
    <div class="flex flex-row justify-center items-start gap-8">
      <PlayerConfiguration 
        :playerSetup="playerSetup" 
        :get-match-configuration="getMatchConfiguration"
      />
      <MatchConfiguration 
        ref="matchConfigRef"
        v-model="playerSetup" 
      />
    </div>
  </div>
</template>

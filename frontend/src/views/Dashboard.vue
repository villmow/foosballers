<script setup>
import MatchConfiguration from '@/components/match/MatchConfiguration.vue';
import MatchLoggingWidget from '@/components/match/MatchLoggingWidget.vue';
import PlayerConfiguration from '@/components/match/PlayerConfiguration.vue';
import { ref } from 'vue';

const playerSetup = ref('2v2');
const activeMatchId = ref(null);
const activeMatchTeamColors = ref(null); // Store team colors for the active match
const matchConfigRef = ref(null);

function onMatchCreated(matchId, teamColors) {
  console.log('Match created with ID:', matchId, 'and team colors:', teamColors);
  activeMatchId.value = matchId;
  activeMatchTeamColors.value = teamColors;
}

function onMatchEnded() {
  activeMatchId.value = null;
  activeMatchTeamColors.value = null;
}

function onTeamColorsSwapped(newColors) {
  console.log('Team colors swapped:', newColors);
  activeMatchTeamColors.value = newColors;
}

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
        @match-created="onMatchCreated"
      />
      <MatchConfiguration 
        ref="matchConfigRef"
        v-model="playerSetup" 
      />
    </div>
    
    <!-- Active Match Section -->
    <div v-if="activeMatchId" class="flex justify-center">
      <MatchLoggingWidget 
        :match-id="activeMatchId"
        :initial-team-colors="activeMatchTeamColors"
        @match-ended="onMatchEnded"
        @team-colors-swapped="onTeamColorsSwapped"
      />
    </div>
  </div>
</template>

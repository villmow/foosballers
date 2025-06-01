<script setup>
import MatchLoggingWidget from '@/components/match/MatchLoggingWidget.vue';
import { MatchService } from '@/service/MatchService';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

// Use computed to make it reactive to route changes
const matchId = computed(() => route.params.matchId);

// State for team colors
const teamColors = ref(['#65bc7b', '#000000']); // Default colors
const isLoading = ref(true);

// Handle match ended event to navigate back to dashboard
function onMatchEnded() {
  router.push('/');
}

// Handle team colors swapped (if needed for future features)
function onTeamColorsSwapped(newColors) {
  console.log('Team colors swapped:', newColors);
}

// Fetch team colors from the match's current or most recent set
async function fetchTeamColors() {
  if (!matchId.value) return;
  
  try {
    // First try to get the current set
    const currentSetResponse = await MatchService.getCurrentSet(matchId.value);

    if (currentSetResponse.success && currentSetResponse.data) {
      const currentSet = currentSetResponse.data;
      if (currentSet.teamColors && currentSet.teamColors.length === 2) {
        teamColors.value = currentSet.teamColors;
        console.log('Team colors loaded from current set:', teamColors.value);
        return;
      }
    }

    // If no current set, try to get the most recent set from the match
    const matchResponse = await MatchService.getMatch(matchId.value);

    if (matchResponse.success && matchResponse.data) {
      const match = matchResponse.data;
      
      // If match has sets, try to get the most recent one
      if (match.sets && match.sets.length > 0) {
        // Get all sets and find the most recent one with team colors
        const setsResponse = await MatchService.getSets(matchId.value);
        
        if (setsResponse.success && setsResponse.data && setsResponse.data.length > 0) {
          // Find the most recent set with team colors
          const setWithColors = setsResponse.data
            .reverse() // Start from most recent
            .find(set => set.teamColors && set.teamColors.length === 2);
          
          if (setWithColors) {
            teamColors.value = setWithColors.teamColors;
            console.log('Team colors loaded from recent set:', teamColors.value);
            return;
          }
        }
      }
    }

    console.log('Using default team colors:', teamColors.value);
  } catch (error) {
    console.error('Error fetching team colors:', error);
    console.log('Using default team colors:', teamColors.value);
  }
}

// Validate matchId exists and fetch team colors
onMounted(async () => {
  console.log('MatchView mounted with matchId:', matchId.value);
  if (!matchId.value) {
    console.warn('No match ID provided, redirecting to dashboard');
    router.push('/');
    return;
  }
  
  await fetchTeamColors();
  isLoading.value = false;
});
</script>

<template>
  <div class="flex justify-center min-h-[80vh] p-4">
    <div v-if="isLoading" class="flex items-center justify-center">
      <p class="text-lg text-gray-600">Loading match...</p>
    </div>
    <MatchLoggingWidget 
      v-else-if="matchId"
      :match-id="String(matchId)"
      :initial-team-colors="teamColors"
      @match-ended="onMatchEnded"
      @team-colors-swapped="onTeamColorsSwapped"
    />
    <div v-else class="flex items-center justify-center">
      <p class="text-lg text-gray-600">No match ID provided</p>
    </div>
  </div>
</template>

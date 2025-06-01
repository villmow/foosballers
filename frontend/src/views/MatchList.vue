<script setup>
import MatchConfiguration from '@/components/match/MatchConfiguration.vue';
import PlayerConfiguration from '@/components/match/PlayerConfiguration.vue';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();
const dt = ref();
const matches = ref([]);
const matchDialog = ref(false);
const deleteMatchDialog = ref(false);
const deleteMatchesDialog = ref(false);
const match = ref({});
const selectedMatches = ref();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const showPlayerConfig = ref(false);
const matchConfiguration = ref({});

const statuses = ref([
    { label: 'WAITING_FOR_PLAYERS', value: 'waiting_for_players' },
    { label: 'IN_PROGRESS', value: 'in_progress' },
    { label: 'COMPLETED', value: 'completed' },
    { label: 'CANCELLED', value: 'cancelled' }
]);

// Load matches on component mount
onMounted(async () => {
    await loadMatches();
});

async function loadMatches() {
    try {
        // TODO: Replace with actual API call
        // For now, using mock data
        matches.value = [
            {
                id: '1',
                teams: ['Team Alpha', 'Team Beta'],
                scores: [3, 5],
                status: 'completed',
                createdAt: new Date('2024-01-15'),
                updatedAt: new Date('2024-01-15'),
                matchConfiguration: {
                    playerSetup: '2v2',
                    numGoalsToWin: 5,
                    numSetsToWin: 2
                }
            },
            {
                id: '2',
                teams: ['Foosball Masters', 'The Spinners'],
                scores: [2, 1],
                status: 'in_progress',
                createdAt: new Date('2024-01-16'),
                updatedAt: new Date('2024-01-16'),
                matchConfiguration: {
                    playerSetup: '2v2',
                    numGoalsToWin: 7,
                    numSetsToWin: 1
                }
            }
        ];
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load matches', life: 3000 });
    }
}

function openNew() {
    match.value = {};
    matchConfiguration.value = {};
    submitted.value = false;
    showPlayerConfig.value = false;
    matchDialog.value = true;
}

function hideDialog() {
    matchDialog.value = false;
    showPlayerConfig.value = false;
    submitted.value = false;
}

function proceedToPlayerConfig() {
    if (validateMatchConfiguration()) {
        showPlayerConfig.value = true;
    }
}

function validateMatchConfiguration() {
    // Basic validation for match configuration
    return true; // Will be implemented based on MatchConfiguration component requirements
}

function getMatchConfiguration() {
    return matchConfiguration.value;
}

async function saveMatch() {
    submitted.value = true;
    
    try {
        // TODO: Replace with actual API call to create match
        const newMatch = {
            id: createId(),
            teams: ['New Team A', 'New Team B'],
            scores: [0, 0],
            status: 'waiting_for_players',
            createdAt: new Date(),
            updatedAt: new Date(),
            matchConfiguration: matchConfiguration.value
        };
        
        matches.value.push(newMatch);
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Match Created', life: 3000 });
        hideDialog();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create match', life: 3000 });
    }
}

function editMatch(matchData) {
    match.value = { ...matchData };
    matchDialog.value = true;
}

function viewMatch(matchData) {
    router.push({ name: 'match', params: { matchId: matchData.id } });
}

function confirmDeleteMatch(matchData) {
    match.value = matchData;
    deleteMatchDialog.value = true;
}

async function deleteMatch() {
    try {
        matches.value = matches.value.filter((val) => val.id !== match.value.id);
        deleteMatchDialog.value = false;
        match.value = {};
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Match Deleted', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete match', life: 3000 });
    }
}

function createId() {
    let id = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function exportCSV() {
    dt.value.exportCSV();
}

function confirmDeleteSelected() {
    deleteMatchesDialog.value = true;
}

async function deleteSelectedMatches() {
    try {
        matches.value = matches.value.filter((val) => !selectedMatches.value.includes(val));
        deleteMatchesDialog.value = false;
        selectedMatches.value = null;
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Matches Deleted', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete matches', life: 3000 });
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'completed':
            return 'success';
        case 'in_progress':
            return 'info';
        case 'waiting_for_players':
            return 'warn';
        case 'cancelled':
            return 'danger';
        default:
            return null;
    }
}

function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function formatTeams(teams) {
    return teams.join(' vs ');
}

function formatScore(scores) {
    return scores.join(' - ');
}

function onMatchCreated(matchData) {
    // Handle match creation from PlayerConfiguration component
    matches.value.push(matchData);
    hideDialog();
    toast.add({ severity: 'success', summary: 'Success', detail: 'Match created successfully!', life: 3000 });
}
</script>

<template>
    <div>
        <div class="card">
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="Create New Match" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedMatches || !selectedMatches.length" />
                </template>

                <template #end>
                    <Button label="Export" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
                </template>
            </Toolbar>

            <DataTable
                ref="dt"
                v-model:selection="selectedMatches"
                :value="matches"
                dataKey="id"
                :paginator="true"
                :rows="10"
                :filters="filters"
                :globalFilterFields="['teams']"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} matches"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">All Matches</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Search matches..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="id" header="Match ID" sortable style="min-width: 8rem"></Column>
                <Column header="Teams" sortable style="min-width: 16rem">
                    <template #body="slotProps">
                        {{ formatTeams(slotProps.data.teams) }}
                    </template>
                </Column>
                <Column header="Score" style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ formatScore(slotProps.data.scores) }}
                    </template>
                </Column>
                <Column field="status" header="Status" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.status.toUpperCase()" :severity="getStatusLabel(slotProps.data.status)" />
                    </template>
                </Column>
                <Column field="createdAt" header="Date" sortable style="min-width: 10rem">
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.createdAt) }}
                    </template>
                </Column>
                <Column header="Setup" style="min-width: 8rem">
                    <template #body="slotProps">
                        {{ slotProps.data.matchConfiguration?.playerSetup || 'N/A' }}
                    </template>
                </Column>
                <Column :exportable="false" style="min-width: 16rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-eye" outlined rounded class="mr-2" @click="viewMatch(slotProps.data)" v-tooltip.top="'View Match'" />
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editMatch(slotProps.data)" v-tooltip.top="'Edit Match'" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteMatch(slotProps.data)" v-tooltip.top="'Delete Match'" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Create/Edit Match Dialog -->
        <Dialog v-model:visible="matchDialog" :style="{ width: '600px' }" header="Match Configuration" :modal="true">
            <div v-if="!showPlayerConfig">
                <MatchConfiguration 
                    v-model="matchConfiguration"
                    @update:modelValue="matchConfiguration = $event"
                />
                
                <div class="flex justify-end gap-2 mt-6">
                    <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                    <Button label="Next: Configure Players" icon="pi pi-arrow-right" @click="proceedToPlayerConfig" />
                </div>
            </div>
            
            <div v-else>
                <PlayerConfiguration 
                    :playerSetup="matchConfiguration.playerSetup || '2v2'"
                    :getMatchConfiguration="getMatchConfiguration"
                    @match-created="onMatchCreated"
                />
                
                <div class="flex justify-end gap-2 mt-6">
                    <Button label="Back" icon="pi pi-arrow-left" text @click="showPlayerConfig = false" />
                    <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                </div>
            </div>
        </Dialog>

        <!-- Delete Match Dialog -->
        <Dialog v-model:visible="deleteMatchDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="match">
                    Are you sure you want to delete match <b>{{ match.id }}</b>?
                </span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteMatchDialog = false" />
                <Button label="Yes" icon="pi pi-check" @click="deleteMatch" />
            </template>
        </Dialog>

        <!-- Delete Selected Matches Dialog -->
        <Dialog v-model:visible="deleteMatchesDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span>Are you sure you want to delete the selected matches?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteMatchesDialog = false" />
                <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedMatches" />
            </template>
        </Dialog>
    </div>
</template>

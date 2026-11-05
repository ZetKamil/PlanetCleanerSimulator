import { defineStore } from 'pinia';
import { ACHIEVEMENT_CATALOG } from '../engine/achievements/AchievementCatalog';
import type { Achievement, AchievementCategory } from '../engine/achievements/AchievementTypes';
import { usePlayerStore } from './usePlayerStore';
import { useGameStore } from './useGameStore';

const STORAGE_KEY = 'wenuscleaner_achievements_v1';
const SESSION_KEY = 'wenuscleaner_session_id';

function getOrCreateSessionId(): string {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
        sid = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
}

export const useAchievementStore = defineStore('achievement', {
    state: () => ({
        achievements: JSON.parse(JSON.stringify(ACHIEVEMENT_CATALOG)) as Achievement[],
        recentToast: null as Achievement | null,
        toastQueue: [] as Achievement[],
        isToastActive: false,
        isModalOpen: false,
        activeFilter: 'all' as 'all' | AchievementCategory,
        sessionId: getOrCreateSessionId(),
        roomCode: null as string | null,
        isSyncing: false,
    }),

    getters: {
        totalCount: (state) => state.achievements.length,
        unlockedCount: (state) => state.achievements.filter(a => a.isUnlocked).length,
        completionPct: (state): number => {
            if (state.achievements.length === 0) return 0;
            const unlocked = state.achievements.filter(a => a.isUnlocked).length;
            return Math.round((unlocked / state.achievements.length) * 100);
        },
        unclaimedCount: (state) => state.achievements.filter(a => a.isUnlocked && !a.rewardClaimed).length,
        unclaimedRewardsTotal: (state) =>
            state.achievements
                .filter(a => a.isUnlocked && !a.rewardClaimed)
                .reduce((sum, a) => sum + a.rewardCredits, 0),
        filteredAchievements: (state) => {
            if (state.activeFilter === 'all') return state.achievements;
            return state.achievements.filter(a => a.category === state.activeFilter);
        },
    },

    actions: {
        initialize() {
            this.loadFromLocalStorage();
            this.fetchFromBackend();
        },

        setRoomCode(code: string | null) {
            this.roomCode = code;
            if (code) {
                this.fetchFromBackend();
            }
        },

        openModal(category?: AchievementCategory) {
            if (category) {
                this.activeFilter = category;
            }
            this.isModalOpen = true;
            useGameStore().openCommandHub('achievements');
        },

        closeModal() {
            this.isModalOpen = false;
            useGameStore().closeCommandHub();
        },

        toggleModal() {
            const gameStore = useGameStore();
            if (gameStore.isCommandHubOpen && gameStore.commandHubTab === 'achievements') {
                this.isModalOpen = false;
                gameStore.closeCommandHub();
            } else {
                this.isModalOpen = true;
                gameStore.openCommandHub('achievements');
            }
        },

        setFilter(filter: 'all' | AchievementCategory) {
            this.activeFilter = filter;
        },

        /**
         * Ustawia postęp konkretnego osiągnięcia na daną wartość (np. 150 kW)
         */
        trackProgress(id: string, value: number): boolean {
            const ach = this.achievements.find(a => a.id === id);
            if (!ach) return false;
            if (ach.isUnlocked) return false;

            const newProgress = Math.min(ach.maxProgress, Math.max(ach.currentProgress, Math.floor(value)));
            if (newProgress !== ach.currentProgress) {
                ach.currentProgress = newProgress;
                this.saveToLocalStorage();

                if (ach.currentProgress >= ach.maxProgress) {
                    this.unlock(ach);
                    return true;
                }
            }
            return false;
        },

        /**
         * Zwiększa postęp osiągnięcia o delta (np. +1 relikt, +1 sektor)
         */
        incrementProgress(id: string, delta: number = 1): boolean {
            const ach = this.achievements.find(a => a.id === id);
            if (!ach) return false;
            if (ach.isUnlocked) return false;

            ach.currentProgress = Math.min(ach.maxProgress, ach.currentProgress + delta);
            this.saveToLocalStorage();

            if (ach.currentProgress >= ach.maxProgress) {
                this.unlock(ach);
                return true;
            }
            return false;
        },

        unlock(achievement: Achievement) {
            if (achievement.isUnlocked) return;

            achievement.isUnlocked = true;
            achievement.currentProgress = achievement.maxProgress;
            achievement.unlockedAt = new Date().toISOString();

            // Enqueue Toast Notification
            this.toastQueue.push(achievement);
            this.processToastQueue();

            this.saveToLocalStorage();
            this.syncWithBackend([achievement]);
        },

        processToastQueue() {
            if (this.isToastActive || this.toastQueue.length === 0) return;

            this.isToastActive = true;
            this.recentToast = this.toastQueue.shift() || null;

            setTimeout(() => {
                this.recentToast = null;
                this.isToastActive = false;
                if (this.toastQueue.length > 0) {
                    setTimeout(() => this.processToastQueue(), 250);
                }
            }, 4500);
        },

        claimReward(id: string): number {
            const ach = this.achievements.find(a => a.id === id);
            if (!ach || !ach.isUnlocked || ach.rewardClaimed) return 0;

            ach.rewardClaimed = true;
            const playerStore = usePlayerStore();
            playerStore.credits += ach.rewardCredits;

            this.saveToLocalStorage();
            this.syncWithBackend([ach]);

            return ach.rewardCredits;
        },

        claimAllRewards(): number {
            let total = 0;
            const playerStore = usePlayerStore();

            for (const ach of this.achievements) {
                if (ach.isUnlocked && !ach.rewardClaimed) {
                    ach.rewardClaimed = true;
                    total += ach.rewardCredits;
                }
            }

            if (total > 0) {
                playerStore.credits += total;
                this.saveToLocalStorage();
                this.syncWithBackend();
            }

            return total;
        },

        saveToLocalStorage() {
            try {
                const data = this.achievements.map(a => ({
                    id: a.id,
                    currentProgress: a.currentProgress,
                    isUnlocked: a.isUnlocked,
                    unlockedAt: a.unlockedAt,
                    rewardClaimed: a.rewardClaimed,
                }));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (err) {
                console.warn('[AchievementStore] Failed to save to localStorage:', err);
            }
        },

        loadFromLocalStorage() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                const saved = JSON.parse(raw) as Array<{
                    id: string;
                    currentProgress: number;
                    isUnlocked: boolean;
                    unlockedAt?: string;
                    rewardClaimed: boolean;
                }>;

                for (const item of saved) {
                    const found = this.achievements.find(a => a.id === item.id);
                    if (found) {
                        found.currentProgress = Math.max(found.currentProgress, item.currentProgress);
                        found.isUnlocked = item.isUnlocked;
                        found.unlockedAt = item.unlockedAt;
                        found.rewardClaimed = item.rewardClaimed;
                    }
                }
            } catch (err) {
                console.warn('[AchievementStore] Failed to parse localStorage data:', err);
            }
        },

        async fetchFromBackend() {
            try {
                const params = new URLSearchParams();
                if (this.sessionId) params.append('session_id', this.sessionId);
                if (this.roomCode) params.append('room_code', this.roomCode);

                const res = await fetch(`/api/achievements?${params.toString()}`);
                if (!res.ok) return;

                const remoteData: Array<{
                    achievement_id: string;
                    current_progress: number;
                    is_unlocked: boolean;
                    unlocked_at?: string;
                    reward_claimed: boolean;
                }> = await res.json();

                for (const r of remoteData) {
                    const local = this.achievements.find(a => a.id === r.achievement_id);
                    if (local) {
                        local.currentProgress = Math.max(local.currentProgress, r.current_progress);
                        if (r.is_unlocked) {
                            local.isUnlocked = true;
                            local.unlockedAt = r.unlocked_at || local.unlockedAt;
                        }
                        if (r.reward_claimed) {
                            local.rewardClaimed = true;
                        }
                    }
                }
                this.saveToLocalStorage();
            } catch {
                // Silently fallback to local state if offline or no backend table yet
            }
        },

        async syncWithBackend(specificItems?: Achievement[]) {
            if (this.isSyncing) return;
            this.isSyncing = true;

            try {
                const itemsToSync = specificItems || this.achievements.filter(a => a.currentProgress > 0 || a.isUnlocked);
                const payload = {
                    session_id: this.sessionId,
                    room_code: this.roomCode,
                    achievements: itemsToSync.map(a => ({
                        achievement_id: a.id,
                        current_progress: a.currentProgress,
                        max_progress: a.maxProgress,
                        is_unlocked: a.isUnlocked,
                        unlocked_at: a.unlockedAt,
                        reward_claimed: a.rewardClaimed,
                    })),
                };

                await fetch('/api/achievements/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } catch {
                // Ignore sync failures; optimistic local state is preserved
            } finally {
                this.isSyncing = false;
            }
        },
    },
});

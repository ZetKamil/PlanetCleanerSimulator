import { defineStore } from 'pinia';
import { useGameStore } from './useGameStore';

const SETTINGS_STORAGE_KEY = 'wenuscleaner_user_settings_v1';

export interface UserSettings {
    isMuted: boolean;
    masterVolume: number; // 0.0 to 1.0
    musicMuted: boolean;
    screenShake: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
    isMuted: false,
    masterVolume: 0.65,
    musicMuted: false,
    screenShake: true,
};

export const useSettingsStore = defineStore('settings', {
    state: (): UserSettings => ({
        ...DEFAULT_SETTINGS,
    }),

    getters: {
        volumePercent: (state) => Math.round(state.masterVolume * 100),
    },

    actions: {
        initialize() {
            this.loadFromStorage();
            this.applyAudioSettings();
        },

        loadFromStorage() {
            try {
                const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed.isMuted === 'boolean') this.isMuted = parsed.isMuted;
                    if (typeof parsed.masterVolume === 'number') this.masterVolume = Math.max(0, Math.min(1, parsed.masterVolume));
                    if (typeof parsed.musicMuted === 'boolean') this.musicMuted = parsed.musicMuted;
                    if (typeof parsed.screenShake === 'boolean') this.screenShake = parsed.screenShake;
                }
            } catch (err) {
                console.warn('[SettingsStore] Failed to load settings from localStorage:', err);
            }
        },

        saveToStorage() {
            try {
                const data: UserSettings = {
                    isMuted: this.isMuted,
                    masterVolume: this.masterVolume,
                    musicMuted: this.musicMuted,
                    screenShake: this.screenShake,
                };
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
            } catch (err) {
                console.warn('[SettingsStore] Failed to save settings to localStorage:', err);
            }
        },

        applyAudioSettings() {
            const win = window as any;
            if (win.__gameEngine && win.__gameEngine.soundSystem) {
                win.__gameEngine.soundSystem.isMuted = this.isMuted;
                win.__gameEngine.soundSystem.setVolume(this.masterVolume);
            }
            // Keep gameStore.soundMuted synchronized
            const gameStore = useGameStore();
            gameStore.soundMuted = this.isMuted;
        },

        setMuted(muted: boolean) {
            this.isMuted = muted;
            this.applyAudioSettings();
            this.saveToStorage();
        },

        toggleMute() {
            this.setMuted(!this.isMuted);
        },

        setMasterVolume(vol: number) {
            this.masterVolume = Math.max(0, Math.min(1, vol));
            if (this.masterVolume > 0 && this.isMuted) {
                this.isMuted = false;
            }
            this.applyAudioSettings();
            this.saveToStorage();
        },

        setScreenShake(enabled: boolean) {
            this.screenShake = enabled;
            this.saveToStorage();
        },
    },
});


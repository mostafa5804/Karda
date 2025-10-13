import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Settings } from '../types';

interface SettingsState {
    projectSettings: {
        [projectId: string]: Settings;
    };
    getSettings: (projectId: string) => Settings;
    updateSettings: (projectId: string, newSettings: Partial<Settings>) => void;
    setDayOverride: (projectId: string, date: string, type: 'normal' | 'friday' | 'holiday' | null) => void;
    removeProjectSettings: (projectId: string) => void;
    getStateForBackup: () => { projectSettings: { [id: string]: Settings } };
    restoreState: (state: { projectSettings: { [id: string]: Settings } }) => void;
}

const initialSettings: Settings = {
    baseDayCount: 30,
    holidays: [],
    dayTypeOverrides: {},
};

export const useSettingsStore = create(
    persist<SettingsState>(
        (set, get) => ({
            projectSettings: {
                'default': initialSettings,
            },
            getSettings: (projectId) => {
                return get().projectSettings[projectId] || initialSettings;
            },
            updateSettings: (projectId, newSettings) => set((state) => {
                const currentSettings = state.projectSettings[projectId] || initialSettings;
                return {
                    projectSettings: {
                        ...state.projectSettings,
                        [projectId]: { ...currentSettings, ...newSettings },
                    },
                };
            }),
            setDayOverride: (projectId, date, type) => set((state) => {
                const currentSettings = state.projectSettings[projectId] || initialSettings;
                const newOverrides = { ...currentSettings.dayTypeOverrides };
                if (type) {
                    newOverrides[date] = type;
                } else {
                    delete newOverrides[date];
                }
                return {
                    projectSettings: {
                        ...state.projectSettings,
                        [projectId]: { ...currentSettings, dayTypeOverrides: newOverrides },
                    },
                };
            }),
            removeProjectSettings: (projectId) => set((state) => {
                const newProjectSettings = { ...state.projectSettings };
                delete newProjectSettings[projectId];
                return { projectSettings: newProjectSettings };
            }),
            getStateForBackup: () => ({ projectSettings: get().projectSettings }),
            restoreState: (state) => set(state),
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
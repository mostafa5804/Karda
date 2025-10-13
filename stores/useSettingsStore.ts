import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Settings, CustomAttendanceCode } from '../types';

interface SettingsState {
    projectSettings: {
        [projectId: string]: Settings;
    };
    getSettings: (projectId: string) => Settings;
    updateSettings: (projectId: string, newSettings: Partial<Omit<Settings, 'customCodes'>>) => void;
    setDayOverride: (projectId: string, date: string, type: 'normal' | 'friday' | 'holiday' | null) => void;
    addCustomCode: (projectId: string, code: Omit<CustomAttendanceCode, 'id'>) => boolean;
    updateCustomCode: (projectId: string, codeId: string, updates: Partial<CustomAttendanceCode>) => boolean;
    removeCustomCode: (projectId: string, codeId: string) => void;
    removeProjectSettings: (projectId: string) => void;
    getStateForBackup: () => { projectSettings: { [id: string]: Settings } };
    restoreState: (state: { projectSettings: { [id: string]: Settings } }) => void;
}

const initialSettings: Settings = {
    baseDayCount: 30,
    holidays: [],
    dayTypeOverrides: {},
    currency: 'Toman',
    customCodes: [],
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
            addCustomCode: (projectId, code) => {
                let success = false;
                set(state => {
                    const settings = state.getSettings(projectId);
                    const isCharTaken = settings.customCodes.some(c => c.char === code.char);
                    if (isCharTaken) {
                        success = false;
                        return state;
                    }
                    const newCode = { ...code, id: new Date().toISOString() };
                    const updatedSettings = { ...settings, customCodes: [...settings.customCodes, newCode] };
                    success = true;
                    return { projectSettings: { ...state.projectSettings, [projectId]: updatedSettings } };
                });
                return success;
            },
            updateCustomCode: (projectId, codeId, updates) => {
                 let success = false;
                set(state => {
                    const settings = state.getSettings(projectId);
                    // Check for char collision if char is being updated
                    if (updates.char) {
                        const isCharTaken = settings.customCodes.some(c => c.id !== codeId && c.char === updates.char);
                        if (isCharTaken) {
                            success = false;
                            return state;
                        }
                    }

                    const updatedCodes = settings.customCodes.map(c => c.id === codeId ? { ...c, ...updates } : c);
                    const updatedSettings = { ...settings, customCodes: updatedCodes };
                    success = true;
                    return { projectSettings: { ...state.projectSettings, [projectId]: updatedSettings } };
                });
                return success;
            },
            removeCustomCode: (projectId, codeId) => set(state => {
                const settings = state.getSettings(projectId);
                const updatedCodes = settings.customCodes.filter(c => c.id !== codeId);
                const updatedSettings = { ...settings, customCodes: updatedCodes };
                return { projectSettings: { ...state.projectSettings, [projectId]: updatedSettings } };
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

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
    salaryMode: 'project',
    customCodes: [
        { id: 'system-gh', char: 'غ', description: 'غیبت (کسر از حقوق)', color: '#FECACA', isSystemCode: true },
        { id: 'system-m', char: 'م', description: 'مرخصی (با حقوق)', color: '#A7F3D0', isSystemCode: true },
        { id: 'system-a', char: 'ا', description: 'استعلاجی (با حقوق)', color: '#FDE68A', isSystemCode: true },
        { id: 'system-t', char: 'ت', description: 'تسویه حساب', color: '#E9D5FF', isSystemCode: true },
    ],
    isAiAssistantEnabled: false,
    geminiApiKey: '',
};

export const useSettingsStore = create(
    persist<SettingsState>(
        (set, get) => ({
            projectSettings: {
                'default': initialSettings,
            },
            getSettings: (projectId) => {
                const projectSpecificSettings = get().projectSettings[projectId] || {};
                // Ensure system codes are always present
                const baseCodes = [...initialSettings.customCodes];
                const customCodes = projectSpecificSettings.customCodes || [];
                const codeChars = new Set(customCodes.map(c => c.char));
                baseCodes.forEach(bc => {
                    if (!codeChars.has(bc.char)) {
                        customCodes.push(bc);
                    }
                });

                return { ...initialSettings, ...projectSpecificSettings, customCodes };
            },
            updateSettings: (projectId, newSettings) => set((state) => {
                const currentSettings = state.getSettings(projectId);
                return {
                    projectSettings: {
                        ...state.projectSettings,
                        [projectId]: { ...currentSettings, ...newSettings },
                    },
                };
            }),
            setDayOverride: (projectId, date, type) => set((state) => {
                const currentSettings = state.getSettings(projectId);
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
                    const isCharTaken = settings.customCodes.some(c => c.char.toLowerCase() === code.char.toLowerCase());
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
                    const codeToUpdate = settings.customCodes.find(c => c.id === codeId);

                    if (!codeToUpdate) {
                        success = false;
                        return state;
                    }

                    // Prevent changing char for system codes
                    if (codeToUpdate.isSystemCode && updates.char && updates.char !== codeToUpdate.char) {
                        success = false; // Or show a toast message
                        return state;
                    }

                    // Check for char collision if char is being updated
                    if (updates.char) {
                        const isCharTaken = settings.customCodes.some(c => c.id !== codeId && c.char.toLowerCase() === updates.char!.toLowerCase());
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
                const codeToRemove = settings.customCodes.find(c => c.id === codeId);
                if (codeToRemove?.isSystemCode) {
                    return state; // Cannot remove system codes
                }
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

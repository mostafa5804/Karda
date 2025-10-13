import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ProjectNoteData } from '../types';

interface NotesState {
    projectNotes: ProjectNoteData;
    getNote: (projectId: string, employeeId: string, date: string) => string | undefined;
    addOrUpdateNote: (projectId: string, employeeId: string, date: string, note: string) => void;
    removeEmployeeNotes: (projectId: string, employeeId: string) => void;
    removeProjectNotes: (projectId: string) => void;
    getStateForBackup: () => { projectNotes: ProjectNoteData };
    restoreState: (state: { projectNotes: ProjectNoteData }) => void;
}

export const useNotesStore = create(
    persist<NotesState>(
        (set, get) => ({
            projectNotes: {},
            getNote: (projectId, employeeId, date) => {
                return get().projectNotes[projectId]?.[employeeId]?.[date];
            },
            addOrUpdateNote: (projectId, employeeId, date, note) => set(state => {
                const noteContent = note.trim();
                const newProjectNotes = JSON.parse(JSON.stringify(state.projectNotes));

                if (!newProjectNotes[projectId]) {
                    newProjectNotes[projectId] = {};
                }
                if (!newProjectNotes[projectId][employeeId]) {
                    newProjectNotes[projectId][employeeId] = {};
                }

                if (noteContent) {
                    newProjectNotes[projectId][employeeId][date] = noteContent;
                } else {
                    delete newProjectNotes[projectId][employeeId][date];
                    if (Object.keys(newProjectNotes[projectId][employeeId]).length === 0) {
                        delete newProjectNotes[projectId][employeeId];
                    }
                    if (Object.keys(newProjectNotes[projectId]).length === 0) {
                         delete newProjectNotes[projectId];
                    }
                }
                
                return { projectNotes: newProjectNotes };
            }),
            removeEmployeeNotes: (projectId, employeeId) => set(state => {
                const project = state.projectNotes[projectId];
                if (!project) return state;
                const newProjectNotes = { ...state.projectNotes };
                const newProjectData = { ...project };
                delete newProjectData[employeeId];
                newProjectNotes[projectId] = newProjectData;
                if (Object.keys(newProjectNotes[projectId]).length === 0) {
                    delete newProjectNotes[projectId];
                }
                return { projectNotes: newProjectNotes };
            }),
            removeProjectNotes: (projectId) => set((state) => {
                const newProjectNotes = { ...state.projectNotes };
                delete newProjectNotes[projectId];
                return { projectNotes: newProjectNotes };
            }),
            getStateForBackup: () => ({ projectNotes: get().projectNotes }),
            restoreState: (state) => {
                 if (state && state.projectNotes) {
                    set({ projectNotes: state.projectNotes });
                }
            },
        }),
        {
            name: 'notes-storage-v1',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

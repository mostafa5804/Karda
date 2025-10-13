import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Project } from '../types';

interface CompanyState {
    projects: Project[];
    addProject: (name: string) => string;
    updateProject: (id: string, updates: Partial<Omit<Project, 'id'>>) => void;
    removeProject: (id: string) => void;
    getStateForBackup: () => { projects: Project[] };
    restoreState: (state: { projects: Project[] }) => void;
}

export const useCompanyStore = create(
    persist<CompanyState>(
        (set, get) => ({
            projects: [{ 
                id: 'default', 
                name: 'پروژه اصلی',
                companyName: 'نام شرکت شما',
                companyLogo: '',
            }],
            addProject: (name) => {
                const newProject: Project = { 
                    id: new Date().toISOString(), 
                    name,
                    companyName: 'نام شرکت جدید',
                    companyLogo: '',
                };
                set((state) => ({
                    projects: [...state.projects, newProject],
                }));
                return newProject.id;
            },
            updateProject: (id, updates) => set((state) => ({
                projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p),
            })),
            removeProject: (id) => set((state) => ({
                projects: state.projects.filter(p => p.id !== id),
            })),
            getStateForBackup: () => ({
                projects: get().projects,
            }),
            restoreState: (state) => {
                // Compatibility for old structure
                if ((state as any).companyInfo) {
                    const oldState = (state as any).companyInfo;
                     set({
                        projects: oldState.projects.map((p: any) => ({
                            ...p,
                            companyName: oldState.companyName || 'نام شرکت شما',
                            companyLogo: oldState.companyLogo || ''
                        }))
                    });
                } else {
                    set(state)
                }
            },
        }),
        {
            name: 'company-info-storage-v2', // Version bump
            storage: createJSONStorage(() => localStorage),
        }
    )
);

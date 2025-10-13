import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CompanyInfo, Project } from '../types';

interface CompanyState {
    companyInfo: CompanyInfo;
    updateCompanyInfo: (newInfo: Partial<Omit<CompanyInfo, 'projects'>>) => void;
    addProject: (name: string) => string;
    updateProject: (id: string, name: string) => void;
    removeProject: (id: string) => void;
    setCompanyLogo: (logo: string) => void;
    getStateForBackup: () => { companyInfo: CompanyInfo };
    restoreState: (state: { companyInfo: CompanyInfo }) => void;
}

export const useCompanyStore = create(
    persist<CompanyState>(
        (set, get) => ({
            companyInfo: {
                companyName: 'نام شرکت شما',
                projects: [{ id: 'default', name: 'پروژه اصلی' }],
                companyLogo: '',
            },
            updateCompanyInfo: (newInfo) => set((state) => ({
                companyInfo: { ...state.companyInfo, ...newInfo },
            })),
            addProject: (name) => {
                const newProject: Project = { id: new Date().toISOString(), name };
                set((state) => ({
                    companyInfo: {
                        ...state.companyInfo,
                        projects: [...state.companyInfo.projects, newProject],
                    },
                }));
                return newProject.id;
            },
            updateProject: (id, name) => set((state) => ({
                companyInfo: {
                    ...state.companyInfo,
                    projects: state.companyInfo.projects.map(p => p.id === id ? { ...p, name } : p),
                },
            })),
            removeProject: (id) => set((state) => ({
                companyInfo: {
                    ...state.companyInfo,
                    projects: state.companyInfo.projects.filter(p => p.id !== id),
                },
            })),
            setCompanyLogo: (logo) => set(state => ({
                companyInfo: { ...state.companyInfo, companyLogo: logo }
            })),
            getStateForBackup: () => ({
                companyInfo: get().companyInfo,
            }),
            restoreState: (state) => set(state),
        }),
        {
            name: 'company-info-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
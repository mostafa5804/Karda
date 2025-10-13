import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MonthlyFinancials, FinancialData } from '../types';

interface FinancialState {
    projectFinancials: {
        [projectId: string]: FinancialData;
    };
    getFinancials: (projectId: string, employeeId: string, year: number, month: number) => MonthlyFinancials;
    updateFinancials: (projectId: string, employeeId: string, year: number, month: number, data: Partial<MonthlyFinancials>) => void;
    removeProjectFinancials: (projectId: string) => void;
    removeEmployeeFinancials: (projectId: string, employeeId: string) => void;
    getStateForBackup: () => { projectFinancials: { [id: string]: FinancialData } };
    restoreState: (state: { projectFinancials: { [id: string]: FinancialData } }) => void;
}

const emptyFinancials: MonthlyFinancials = {};

export const useFinancialStore = create(
    persist<FinancialState>(
        (set, get) => ({
            projectFinancials: {},
            getFinancials: (projectId, employeeId, year, month) => {
                const project = get().projectFinancials[projectId];
                return project?.[employeeId]?.[year]?.[month] || emptyFinancials;
            },
            updateFinancials: (projectId, employeeId, year, month, data) => set(state => {
                const currentData = state.projectFinancials[projectId]?.[employeeId]?.[year]?.[month] || {};
                const updatedData = { ...currentData, ...data };
                
                // Cleanup zero/empty values
                if (!updatedData.advance) delete updatedData.advance;
                if (!updatedData.bonus) delete updatedData.bonus;
                if (!updatedData.deduction) delete updatedData.deduction;

                const newProjectFinancials = {
                    ...state.projectFinancials,
                    [projectId]: {
                        ...(state.projectFinancials[projectId] || {}),
                        [employeeId]: {
                            ...(state.projectFinancials[projectId]?.[employeeId] || {}),
                            [year]: {
                                ...(state.projectFinancials[projectId]?.[employeeId]?.[year] || {}),
                                [month]: updatedData
                            }
                        }
                    }
                };
                
                // Cleanup empty month/year/employee objects if they have no keys
                if (Object.keys(newProjectFinancials[projectId][employeeId][year][month]).length === 0) {
                    delete newProjectFinancials[projectId][employeeId][year][month];
                }
                if (Object.keys(newProjectFinancials[projectId][employeeId][year]).length === 0) {
                    delete newProjectFinancials[projectId][employeeId][year];
                }
                if (Object.keys(newProjectFinancials[projectId][employeeId]).length === 0) {
                    delete newProjectFinancials[projectId][employeeId];
                }

                return { projectFinancials: newProjectFinancials };
            }),
            removeProjectFinancials: (projectId) => set(state => {
                const newProjectFinancials = { ...state.projectFinancials };
                delete newProjectFinancials[projectId];
                return { projectFinancials: newProjectFinancials };
            }),
            removeEmployeeFinancials: (projectId, employeeId) => set(state => {
                 const project = state.projectFinancials[projectId];
                 if (!project) return state;
                 const newProjectData = { ...project };
                 delete newProjectData[employeeId];
                 return {
                    projectFinancials: {
                        ...state.projectFinancials,
                        [projectId]: newProjectData
                    }
                 };
            }),
            getStateForBackup: () => ({ projectFinancials: get().projectFinancials }),
            restoreState: (state) => {
                if (state && state.projectFinancials) {
                    set({ projectFinancials: state.projectFinancials });
                }
            },
        }),
        {
            name: 'financial-storage-v1',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

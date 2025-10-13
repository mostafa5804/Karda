import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentJalaliDate } from '../utils/calendar';
import { View, ReportView, DashboardDateFilter } from '../types';

interface AppState {
    view: View;
    setView: (view: View) => void;
    
    selectedYear: number;
    selectedMonth: number;
    setSelectedDate: (year: number, month: number) => void;
    goToNextMonth: () => void;
    goToPreviousMonth: () => void;

    currentProjectId: string | null;
    setCurrentProjectId: (projectId: string | null) => void;

    reportView: ReportView;
    setReportView: (view: ReportView) => void;

    selectedEmployeeIdForReport: string | null;
    setSelectedEmployeeIdForReport: (employeeId: string | null) => void;

    dashboardDateFilter: DashboardDateFilter;
    setDashboardDateFilter: (filter: DashboardDateFilter) => void;
}

const [currentYear, currentMonth] = getCurrentJalaliDate();

export const useAppStore = create(
    persist<AppState>(
        (set, get) => ({
            view: 'dashboard',
            setView: (view) => set({ view }),

            selectedYear: currentYear,
            selectedMonth: currentMonth,
            setSelectedDate: (year, month) => set({ selectedYear: year, selectedMonth: month }),
            goToNextMonth: () => {
                const { selectedYear, selectedMonth } = get();
                if (selectedMonth === 12) {
                    set({ selectedYear: selectedYear + 1, selectedMonth: 1 });
                } else {
                    set({ selectedMonth: selectedMonth + 1 });
                }
            },
            goToPreviousMonth: () => {
                const { selectedYear, selectedMonth } = get();
                if (selectedMonth === 1) {
                    set({ selectedYear: selectedYear - 1, selectedMonth: 12 });
                } else {
                    set({ selectedMonth: selectedMonth - 1 });
                }
            },

            currentProjectId: 'default',
            setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),

            reportView: 'salary',
            setReportView: (view) => set({ reportView: view }),

            selectedEmployeeIdForReport: null,
            setSelectedEmployeeIdForReport: (employeeId) => set({ selectedEmployeeIdForReport: employeeId }),

            dashboardDateFilter: { mode: 'all' },
            setDashboardDateFilter: (filter) => set({ dashboardDateFilter: filter }),
        }),
        {
            name: 'app-storage-v2', // version bump to avoid conflicts
            storage: createJSONStorage(() => localStorage),
        }
    )
);

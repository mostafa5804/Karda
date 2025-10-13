import { create } from 'zustand';
import { View, ReportView } from '../types';
import { getCurrentJalaliDate } from '../utils/calendar';
import { useCompanyStore } from './useCompanyStore';

const [currentYear, currentMonth] = getCurrentJalaliDate();

interface AppState {
    view: View;
    reportView: ReportView;
    selectedYear: number;
    selectedMonth: number;
    currentProjectId: string | null;
    selectedEmployeeIdForReport: string | null;
    setView: (view: View) => void;
    setReportView: (reportView: ReportView) => void;
    setSelectedDate: (year: number, month: number) => void;
    goToPreviousMonth: () => void;
    goToNextMonth: () => void;
    setCurrentProjectId: (id: string | null) => void;
    setSelectedEmployeeIdForReport: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
    view: 'dashboard',
    reportView: 'salary',
    selectedYear: currentYear,
    selectedMonth: currentMonth,
    currentProjectId: useCompanyStore.getState().companyInfo.projects[0]?.id || null,
    selectedEmployeeIdForReport: null,
    setView: (view) => set({ view }),
    setReportView: (reportView) => {
        set({ reportView, selectedEmployeeIdForReport: null }); // Reset employee selection when changing report type
    },
    setSelectedDate: (year, month) => set({ selectedYear: year, selectedMonth: month }),
    goToPreviousMonth: () => set((state) => {
        if (state.selectedMonth === 1) {
            return { selectedYear: state.selectedYear - 1, selectedMonth: 12 };
        }
        return { selectedMonth: state.selectedMonth - 1 };
    }),
    goToNextMonth: () => set((state) => {
        if (state.selectedMonth === 12) {
            return { selectedYear: state.selectedYear + 1, selectedMonth: 1 };
        }
        return { selectedMonth: state.selectedMonth + 1 };
    }),
    setCurrentProjectId: (id) => set({ currentProjectId: id, selectedEmployeeIdForReport: null }),
    setSelectedEmployeeIdForReport: (id) => set({ selectedEmployeeIdForReport: id }),
}));

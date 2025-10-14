import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentJalaliDate } from '../utils/calendar';
import { View, ReportView, DashboardDateFilter, ReportDateFilter, ReportDateFilterMode } from '../types';

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

    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;

    dashboardDateFilter: DashboardDateFilter;
    setDashboardDateFilter: (filter: DashboardDateFilter) => void;

    reportDateFilter: ReportDateFilter;
    setReportDateFilter: (filter: ReportDateFilter) => void;

    isFileSystemReady: boolean;
    setIsFileSystemReady: (isReady: boolean) => void;
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

            isSidebarCollapsed: false,
            toggleSidebar: () => set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

            dashboardDateFilter: { mode: 'all' },
            setDashboardDateFilter: (filter) => set({ dashboardDateFilter: filter }),

            reportDateFilter: {
                mode: 'month',
                from: { year: currentYear, month: currentMonth },
                to: { year: currentYear, month: currentMonth },
            },
            setReportDateFilter: (filter) => set({ reportDateFilter: filter }),

            isFileSystemReady: false,
            setIsFileSystemReady: (isReady) => set({ isFileSystemReady: isReady }),
        }),
        {
            name: 'app-storage-v2',
            storage: createJSONStorage(() => localStorage),
            merge: (persisted, current) => {
                const persistedState = persisted as Partial<AppState> | null;

                if (!persistedState) {
                    return current;
                }

                // Validate the critical nested object from the persisted state.
                const rdf = persistedState.reportDateFilter;

                const isValidRdf =
                    rdf != null &&
                    typeof rdf === 'object' &&
                    typeof rdf.mode === 'string' &&
                    rdf.from != null &&
                    typeof rdf.from === 'object' &&
                    typeof rdf.from.year === 'number' &&
                    typeof rdf.from.month === 'number' &&
                    rdf.to != null &&
                    typeof rdf.to === 'object' &&
                    typeof rdf.to.year === 'number' &&
                    typeof rdf.to.month === 'number';

                if (isValidRdf) {
                    // If the persisted filter is valid, merge the entire persisted state.
                    return { ...current, ...persistedState };
                } else {
                    // If the filter is invalid, merge everything *except* the invalid property.
                    // This ensures the valid `reportDateFilter` from the initial state is used.
                    const { reportDateFilter, ...restOfPersisted } = persistedState;
                    return { ...current, ...restOfPersisted };
                }
            },
        }
    )
);
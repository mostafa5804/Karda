// This file defines all the shared TypeScript types used across the application.

export type View = 'dashboard' | 'attendance' | 'reports' | 'settings';
export type ReportView = 'salary' | 'attendanceSummary' | 'attendanceList' | 'individual';

export interface Employee {
    id: string;
    firstName: string;
    lastName:string;
    position: string;
    monthlySalary: number;
    isArchived: boolean;
}

export interface Attendance {
    [date: string]: string; // e.g., "1403-05-01": "10" or "غ"
}

export interface EmployeeAttendance {
    [employeeId: string]: Attendance;
}

export interface ParsedExcelRow {
    lastName: string;
    firstName: string;
    position: string;
    monthlySalary: number;
    attendance: Attendance;
}

export interface Settings {
    baseDayCount: number;
    holidays: string[]; // dates like "1403-05-01"
    dayTypeOverrides: {
        [date: string]: 'normal' | 'friday' | 'holiday';
    };
}

export interface Project {
    id: string;
    name: string;
}

export interface CompanyInfo {
    companyName: string;
    projects: Project[];
    companyLogo: string;
}

export interface AttendanceSummaryData {
    employeeId: string;
    lastName: string;
    firstName: string;
    position: string;
    presenceDays: number;
    leaveDays: number;
    sickDays: number;
    absentDays: number;
    fridayWorkDays: number;
    holidayWorkDays: number;
    overtimeHours: number;
    nightShiftHours: number;
    totalWorkedDays: number;
    notes: string;
}

export interface MonthlyFinancials {
    advance?: number;
    bonus?: number;
    deduction?: number;
}

export interface FinancialData {
    [employeeId: string]: {
        [year: number]: {
            [month: number]: MonthlyFinancials;
        }
    }
}

// --- New Dashboard Types ---

export interface DailyStats {
    totalActive: number;
    present: number;
    onLeave: number;
    absent: number;
}

export interface OverallStats {
    totalSalaryPaid: number;
    totalWorkDays: number;
    totalOvertimeHours: number;
}

export interface EmployeeTrendDataPoint {
    label: string; // e.g., "مهر 1403"
    count: number;
}

export interface SalaryDistributionDataItem {
    employeeName: string;
    totalPay: number;
}

export interface FullDashboardData {
    dailyStats: DailyStats;
    overallStats: OverallStats;
    employeeTrend: EmployeeTrendDataPoint[];
    salaryDistribution: SalaryDistributionDataItem[];
}
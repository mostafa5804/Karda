export type View = 'dashboard' | 'attendance' | 'reports' | 'settings';
export type ReportView = 'salary' | 'attendanceSummary' | 'attendanceList' | 'individual';

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    monthlySalary: number;
    isArchived: boolean;
}

export interface Attendance {
    [date: string]: string; // date is 'YYYY-MM-DD'
}

export interface EmployeeAttendance {
    [employeeId: string]: Attendance;
}

export interface Settings {
    baseDayCount: number;
    holidays: string[];
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

export interface ParsedExcelRow {
    lastName: string;
    firstName: string;
    position: string;
    monthlySalary: number;
    attendance: Attendance;
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
        };
    };
}

export interface ReportData {
    employeeId: string;
    employeeName: string;
    monthlySalary: number;
    effectiveDays: number;
    absentDays: number;
    leaveDays: number;
    overtimeHours: number;
    totalPayableDays: number;
    totalPay: number;
    dailyRate: number;
    advance: number;
    bonus: number;
    deduction: number;
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

// --- New and Updated Dashboard Types ---

export type DashboardDateFilter = {
    mode: 'all' | 'month';
    year?: number;
    month?: number;
};

export interface DailyStats {
    total: number;
    present: number;
    onLeave: number;
    absent: number;
}

export interface ProjectWideStats {
    totalSalaryPaid: number;
    totalWorkDays: number;
    totalOvertimeHours: number;
}

export interface SalaryDistributionData {
    labels: string[];
    data: number[];
}

export interface EmployeeTrendData {
    labels: string[]; // e.g., "1402-01", "1402-02"
    data: number[];
}


export interface MonthlyDashboardStats {
    totalEmployees: number;
    activeEmployees: number;
    totalPayForMonth: number;
    totalOvertimeHours: number;
    totalAbsences: number;
}

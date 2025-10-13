export type View = 'dashboard' | 'attendance' | 'personnel' | 'reports' | 'settings';
export type ReportView = 'salary' | 'attendanceSummary' | 'attendanceList' | 'individual';

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    monthlySalary: number; // For project-based, this is the main salary. For official, it's the calculated total.
    isArchived: boolean;
    fatherName?: string;
    nationalId?: string;
    phone?: string;
    maritalStatus?: 'single' | 'married';
    childrenCount?: number;
    militaryServiceStatus?: 'not_applicable' | 'completed' | 'exempt' | 'pending';
    address?: string;
    iban?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    // Fields for official (labor law) salary calculation
    baseSalary?: number;
    housingAllowance?: number;
    childAllowance?: number;
    otherBenefits?: number;
}

// Attendance for a single employee: { 'YYYY-MM-DD': 'status' }
export type Attendance = Record<string, string>;

// Attendance for all employees in a project: { 'employeeId': Attendance }
export type EmployeeAttendance = Record<string, Attendance>;

export interface CustomAttendanceCode {
    id: string;
    char: string;
    description: string;
    color: string;
}

export interface Settings {
    baseDayCount: number;
    holidays: string[];
    dayTypeOverrides: { [date: string]: 'normal' | 'friday' | 'holiday' };
    currency: 'Toman' | 'Rial';
    salaryMode: 'project' | 'official';
    customCodes: CustomAttendanceCode[];
    isAiAssistantEnabled: boolean;
    geminiApiKey: string;
}

export interface MonthlyFinancials {
    advance?: number;
    bonus?: number;
    deduction?: number;
}

// Financial data for all employees in a project
// { [employeeId]: { [year]: { [month]: MonthlyFinancials } } }
export type FinancialData = Record<string, Record<number, Record<number, MonthlyFinancials>>>;

export interface Project {
    id: string;
    name: string;
    companyName: string;
    companyLogo: string;
}

export type DashboardDateFilter = { mode: 'all' } | { mode: 'month'; year: number; month: number };

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

export interface ReportData {
    employeeId: string;
    employeeName: string;
    monthlySalary: number;
    effectiveDays: number;
    absentDays: number;
    leaveDays: number;
    sickDays: number;
    overtimeHours: number;
    totalPayableDays: number;
    totalPay: number;
    dailyRate: number;
    advance: number;
    bonus: number;
    deduction: number;
}

export interface ParsedExcelRow {
    lastName: string;
    firstName: string;
    position: string;
    monthlySalary: number;
    attendance: Attendance;
}

// Note data for all projects
// { [projectId]: { [employeeId]: { [date]: string } } }
export type ProjectNoteData = Record<string, Record<string, Record<string, string>>>;


// Dashboard-specific types
export interface DailyStats {
    total: number;
    present: number;
    onLeave: number;
    absent: number;
}

export interface MonthlyDashboardStats {
    totalEmployees: number;
    activeEmployees: number;
    totalPayForMonth: number;
    totalOvertimeHours: number;
    totalAbsences: number;
}

export interface ProjectWideStats {
    totalSalaryPaid: number;
    totalWorkDays: number;
    totalOvertimeHours: number;
}

export interface EmployeeTrendData {
    labels: string[];
    data: number[];
}

export interface SalaryDistributionData {
    labels: string[];
    data: number[];
}

// For useSortableTable hook
export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
    key: keyof T | null;
    direction: SortDirection;
}

export interface Document {
    id: string; // Unique ID for the document
    projectId: string;
    employeeId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    data: string; // Base64 encoded file data
    uploadedAt: string; // ISO string date
}

export type ReportDateFilterMode = 'month' | 'range';

export interface ReportDateFilter {
    mode: ReportDateFilterMode;
    from: { year: number; month: number };
    to: { year: number; month: number };
}

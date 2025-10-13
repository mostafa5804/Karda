import {
    Employee, EmployeeAttendance, Settings, FinancialData, MonthlyDashboardStats,
    DailyStats, ProjectWideStats, EmployeeTrendData, SalaryDistributionData, DashboardDateFilter, ReportData
} from '../types';
import { generateReport } from './reports';
import { getFormattedDate, getCurrentJalaliDate } from './calendar';
import { JALALI_MONTHS } from '../constants';

export const getDailyStats = (employees: Employee[], attendance: EmployeeAttendance): DailyStats => {
    const activeEmployees = employees.filter(e => !e.isArchived);
    const [year, month, day] = getCurrentJalaliDate();
    const todayStr = getFormattedDate(year, month, day);

    let present = 0;
    let onLeave = 0;
    let absent = 0;

    activeEmployees.forEach(emp => {
        const status = attendance[emp.id]?.[todayStr]?.toLowerCase();
        if (status) {
            if (!isNaN(parseFloat(status))) {
                present++;
            } else if (status === 'م') {
                onLeave++;
            } else if (status === 'غ') {
                absent++;
            }
        }
    });

    return {
        total: activeEmployees.length,
        present,
        onLeave,
        absent,
    };
};


const getAllMonthsWithData = (attendance: EmployeeAttendance): { year: number, month: number }[] => {
    const months = new Set<string>();
    Object.values(attendance).forEach(empAttendance => {
        Object.keys(empAttendance).forEach(dateStr => {
            months.add(dateStr.substring(0, 7)); // 'YYYY-MM'
        });
    });
    return Array.from(months)
        .map(monthStr => {
            const [year, month] = monthStr.split('-').map(Number);
            return { year, month };
        })
        .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
};


export const calculateAllDashboardData = (
    employees: Employee[],
    attendance: EmployeeAttendance,
    settings: Settings,
    financialData: FinancialData,
    filter: DashboardDateFilter
) => {
    const activeEmployees = employees.filter(e => !e.isArchived);

    // 1. Daily Stats (always calculated for today)
    const dailyStats = getDailyStats(activeEmployees, attendance);

    // 2. Employee Trend (always calculated project-wide)
    const allMonths = getAllMonthsWithData(attendance);
    const employeeTrend: EmployeeTrendData = {
        labels: allMonths.map(d => `${JALALI_MONTHS[d.month - 1]} ${d.year}`),
        data: allMonths.map(d => {
            // Count employees who had any attendance record up to that month
            const monthKey = `${d.year}-${String(d.month).padStart(2, '0')}`;
            const activeInMonth = new Set<string>();
            Object.keys(attendance).forEach(empId => {
                const hasRecord = Object.keys(attendance[empId]).some(date => date.startsWith(monthKey));
                if(hasRecord) activeInMonth.add(empId);
            });
            return activeInMonth.size;
        })
    };
    
    let monthlyStats: MonthlyDashboardStats | null = null;
    let projectWideStats: ProjectWideStats | null = null;
    let salaryDistribution: SalaryDistributionData | null = null;
    let monthlyReportData: ReportData[] = [];
    
    const allMonthReports: { [key: string]: ReportData[] } = {};
    allMonths.forEach(({year, month}) => {
         const key = `${year}-${month}`;
         allMonthReports[key] = generateReport(activeEmployees, attendance, settings, financialData, year, month);
    });

    if (filter.mode === 'month' && filter.year && filter.month) {
        const key = `${filter.year}-${filter.month}`;
        monthlyReportData = allMonthReports[key] || generateReport(activeEmployees, attendance, settings, financialData, filter.year, filter.month);

        const totalPayForMonth = monthlyReportData.reduce((sum, item) => sum + item.totalPay, 0);
        const totalOvertimeHours = monthlyReportData.reduce((sum, item) => sum + item.overtimeHours, 0);
        const totalAbsences = monthlyReportData.reduce((sum, item) => sum + item.absentDays, 0);

        monthlyStats = {
            totalEmployees: employees.length,
            activeEmployees: activeEmployees.length,
            totalPayForMonth: Math.round(totalPayForMonth),
            totalOvertimeHours,
            totalAbsences,
        };
        
        const positivePayData = monthlyReportData.filter(d => d.totalPay > 0);
        salaryDistribution = {
            labels: positivePayData.map(d => d.employeeName),
            data: positivePayData.map(d => Math.round(d.totalPay)),
        };

    } else { // 'all' mode
        let totalSalaryPaid = 0;
        let totalWorkDays = 0;
        let totalOvertimeHours = 0;
        
        Object.values(allMonthReports).forEach(monthReport => {
            monthReport.forEach(empReport => {
                totalSalaryPaid += empReport.totalPay;
                totalWorkDays += empReport.effectiveDays;
                totalOvertimeHours += empReport.overtimeHours;
            });
        });
        
        projectWideStats = {
            totalSalaryPaid: Math.round(totalSalaryPaid),
            totalWorkDays,
            totalOvertimeHours
        };
    }

    return {
        dailyStats,
        employeeTrend,
        monthlyStats,
        projectWideStats,
        salaryDistribution,
    };
};

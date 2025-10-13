import { Employee, EmployeeAttendance, FinancialData, Settings, DailyStats, OverallStats, EmployeeTrendDataPoint, SalaryDistributionDataItem, FullDashboardData } from '../types';
import { generateReport } from './reports';
import { getCurrentJalaliDate, getFormattedDate } from './calendar';
import { JALALI_MONTHS } from '../constants';

// Helper to get all unique year/month combinations that have data
function getProjectMonths(attendance: EmployeeAttendance): { year: number; month: number }[] {
    const months = new Set<string>();
    Object.values(attendance).forEach(empAttendance => {
        Object.keys(empAttendance).forEach(dateStr => {
            const [year, month] = dateStr.split('-').map(Number);
            months.add(`${year}-${month}`);
        });
    });
    return Array.from(months).map(ym => {
        const [year, month] = ym.split('-').map(Number);
        return { year, month };
    }).sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
}

// --- Calculation Functions ---

function calculateDailyStats(employees: Employee[], attendance: EmployeeAttendance): DailyStats {
    const [year, month, day] = getCurrentJalaliDate();
    const todayStr = getFormattedDate(year, month, day);
    const activeEmployees = employees.filter(e => !e.isArchived);

    let present = 0;
    let onLeave = 0;
    let absent = 0;

    activeEmployees.forEach(emp => {
        const status = attendance[emp.id]?.[todayStr]?.toLowerCase() || '';
        if (status === 'غ') {
            absent++;
        } else if (status === 'م') {
            onLeave++;
        } else if (!isNaN(parseFloat(status)) && parseFloat(status) > 0) {
            present++;
        }
    });

    return {
        totalActive: activeEmployees.length,
        present,
        onLeave,
        absent
    };
}

function calculateOverallStats(
    employees: Employee[],
    attendance: EmployeeAttendance,
    settings: Settings,
    financialData: FinancialData
): OverallStats {
    let totalSalaryPaid = 0;
    let totalWorkDays = 0;
    let totalOvertimeHours = 0;
    
    const projectMonths = getProjectMonths(attendance);

    projectMonths.forEach(({ year, month }) => {
        const monthlyReport = generateReport(employees, attendance, settings, financialData, year, month);
        totalSalaryPaid += monthlyReport.reduce((sum, item) => sum + item.totalPay, 0);
    });

    Object.values(attendance).forEach(empAttendance => {
        Object.values(empAttendance).forEach(value => {
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue) && numericValue > 0) {
                totalWorkDays++;
                totalOvertimeHours += Math.max(0, numericValue - 10);
            }
        });
    });

    return {
        totalSalaryPaid: Math.round(totalSalaryPaid),
        totalWorkDays,
        totalOvertimeHours: Math.round(totalOvertimeHours),
    };
}

function calculateEmployeeTrend(attendance: EmployeeAttendance): EmployeeTrendDataPoint[] {
    const projectMonths = getProjectMonths(attendance);
    if (projectMonths.length === 0) return [];
    
    return projectMonths.map(({year, month}) => {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const employeesInMonth = new Set<string>();

        Object.entries(attendance).forEach(([employeeId, empAttendance]) => {
            for (const dateStr in empAttendance) {
                if (dateStr.startsWith(monthStr)) {
                    employeesInMonth.add(employeeId);
                    break;
                }
            }
        });

        return {
            label: `${JALALI_MONTHS[month - 1]} ${String(year).slice(-2)}`,
            count: employeesInMonth.size
        };
    });
}

function calculateSalaryDistribution(
    employees: Employee[],
    attendance: EmployeeAttendance,
    settings: Settings,
    financialData: FinancialData,
    year: number,
    month: number
): SalaryDistributionDataItem[] {
    const activeEmployees = employees.filter(e => !e.isArchived);
    if (activeEmployees.length === 0) return [];

    const monthlyReport = generateReport(activeEmployees, attendance, settings, financialData, year, month);

    return monthlyReport
        .filter(item => item.totalPay > 0)
        .map(item => ({
            employeeName: item.employeeName,
            totalPay: Math.round(item.totalPay)
        }));
}

// --- Main Orchestrator Function ---

export const generateFullDashboardData = (
    employees: Employee[],
    attendance: EmployeeAttendance,
    settings: Settings,
    financialData: FinancialData,
    selectedYear: number,
    selectedMonth: number
): FullDashboardData => {
    return {
        dailyStats: calculateDailyStats(employees, attendance),
        overallStats: calculateOverallStats(employees, attendance, settings, financialData),
        employeeTrend: calculateEmployeeTrend(attendance),
        salaryDistribution: calculateSalaryDistribution(employees, attendance, settings, financialData, selectedYear, selectedMonth),
    };
};
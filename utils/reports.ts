import { Employee, EmployeeAttendance, Settings, AttendanceSummaryData, FinancialData, MonthlyFinancials } from '../types';
import { getDaysInJalaliMonth, getFormattedDate, getFirstDayOfMonthJalali } from './calendar';

export interface ReportData {
    employeeId: string;
    employeeName: string;
    monthlySalary: number;
    effectiveDays: number; // Total days worked (presence + leave + holiday/friday work)
    absentDays: number;
    leaveDays: number;
    sickDays: number;
    overtimeHours: number;
    totalPayableDays: number; // The final multiplier for salary (e.g., 30.6)
    totalPay: number;
    dailyRate: number;
    advance: number;
    bonus: number;
    deduction: number;
}

export const generateReport = (
    employees: Employee[],
    attendance: EmployeeAttendance,
    settings: Settings,
    financialData: FinancialData,
    year: number,
    month: number
): ReportData[] => {
    const report: ReportData[] = [];
    const daysInMonth = getDaysInJalaliMonth(year, month);
    const firstDay = getFirstDayOfMonthJalali(year, month);

    employees.forEach(employee => {
        const employeeAttendance = attendance[employee.id] || {};
        const financials: MonthlyFinancials = financialData[employee.id]?.[year]?.[month] || {};
        const advance = financials.advance || 0;
        const bonus = financials.bonus || 0;
        const deduction = financials.deduction || 0;

        let presenceDays = 0;
        let absentDays = 0;
        let leaveDays = 0;
        let sickDays = 0;
        let fridayWorkDays = 0;
        let holidayWorkDays = 0;
        let overtimeHours = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = getFormattedDate(year, month, day);
            const status = employeeAttendance[date] || '';
            const dayOfWeek = (firstDay + day - 1) % 7;

            const override = settings.dayTypeOverrides[date];
            let effectiveDayType: 'normal' | 'friday' | 'holiday' = 'normal';
            if (override) {
                effectiveDayType = override;
            } else if (dayOfWeek === 6) {
                effectiveDayType = 'friday';
            } else if (settings.holidays.includes(date)) {
                effectiveDayType = 'holiday';
            }
            
            const numericValue = parseFloat(status);
            if (!isNaN(numericValue) && numericValue > 0) {
                 if (effectiveDayType === 'friday') fridayWorkDays++;
                else if (effectiveDayType === 'holiday') holidayWorkDays++;
                else presenceDays++;
                overtimeHours += Math.max(0, numericValue - 10);
            } else {
                switch (status.toLowerCase()) {
                    case 'غ':
                        absentDays++;
                        break;
                    case 'م':
                        leaveDays++;
                        break;
                    case 'ا':
                        sickDays++;
                        break;
                }
            }
        }

        const baseDayCount = settings.baseDayCount > 0 ? settings.baseDayCount : 30;
        const dailyRate = employee.monthlySalary / baseDayCount;
        const effectiveDays = presenceDays + leaveDays + sickDays + fridayWorkDays + holidayWorkDays;
        const totalPayableDays = effectiveDays + (overtimeHours / 10.0);
        const basePay = totalPayableDays * dailyRate;
        const totalPay = basePay + bonus - advance - deduction;

        report.push({
            employeeId: employee.id,
            employeeName: `${employee.lastName} ${employee.firstName}`,
            monthlySalary: employee.monthlySalary,
            effectiveDays,
            absentDays,
            leaveDays,
            sickDays,
            overtimeHours,
            totalPayableDays,
            totalPay,
            dailyRate,
            advance,
            bonus,
            deduction
        });
    });

    return report;
};


export const generateAttendanceSummary = (
    employees: Employee[],
    attendance: EmployeeAttendance,
    settings: Settings,
    year: number,
    month: number
): AttendanceSummaryData[] => {
    const summary: AttendanceSummaryData[] = [];
    const daysInMonth = getDaysInJalaliMonth(year, month);
    const firstDay = getFirstDayOfMonthJalali(year, month);

    employees.forEach(employee => {
        const employeeAttendance = attendance[employee.id] || {};
        
        let presenceDays = 0;
        let leaveDays = 0;
        let sickDays = 0;
        let absentDays = 0;
        let fridayWorkDays = 0;
        let holidayWorkDays = 0;
        let overtimeHours = 0;
        let nightShiftHours = 0;
        let notes = '';
        let hasSettlement = false;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = getFormattedDate(year, month, day);
            const status = employeeAttendance[date] || '';
            const dayOfWeek = (firstDay + day - 1) % 7;

            const override = settings.dayTypeOverrides[date];
            let effectiveDayType: 'normal' | 'friday' | 'holiday' = 'normal';
            if (override) {
                effectiveDayType = override;
            } else if (dayOfWeek === 6) {
                effectiveDayType = 'friday';
            } else if (settings.holidays.includes(date)) {
                effectiveDayType = 'holiday';
            }

            const numericValue = parseFloat(status);

            if (!isNaN(numericValue) && numericValue > 0) {
                if (effectiveDayType === 'friday') fridayWorkDays++;
                else if (effectiveDayType === 'holiday') holidayWorkDays++;
                else presenceDays++;

                overtimeHours += Math.max(0, numericValue - 10);
            } else {
                 switch (status.toLowerCase()) {
                    case 'غ': absentDays++; break;
                    case 'م': leaveDays++; break;
                    case 'ا': sickDays++; break;
                    case 'ت': hasSettlement = true; break;
                }
            }
        }

        if (hasSettlement) {
            notes = 'تسویه';
        }

        const totalWorkedDays = presenceDays + leaveDays + sickDays + fridayWorkDays + holidayWorkDays;
        
        summary.push({
            employeeId: employee.id,
            lastName: employee.lastName,
            firstName: employee.firstName,
            position: employee.position,
            presenceDays,
            leaveDays,
            sickDays,
            absentDays,
            fridayWorkDays,
            holidayWorkDays,
            overtimeHours,
            nightShiftHours,
            totalWorkedDays,
            notes,
        });
    });

    return summary;
};
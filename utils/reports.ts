import { Employee, EmployeeAttendance, Settings, AttendanceSummaryData, FinancialData, MonthlyFinancials, ReportData } from '../types';
import { getDaysInJalaliMonth, getFormattedDate, getFirstDayOfMonthJalali } from './calendar';

const getMonthsInRange = (from: { year: number; month: number }, to: { year: number; month: number }): { year: number, month: number }[] => {
    const months = [];
    let currentYear = from.year;
    let currentMonth = from.month;

    while (currentYear < to.year || (currentYear === to.year && currentMonth <= to.month)) {
        months.push({ year: currentYear, month: currentMonth });

        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }
    }
    return months;
};


export const generateReport = (
    employees: Employee[],
    attendance: EmployeeAttendance,
    settings: Settings,
    financialData: FinancialData,
    from: { year: number; month: number },
    to: { year: number; month: number }
): ReportData[] => {
    const aggregatedReport = new Map<string, ReportData>();

    employees.forEach(employee => {
        aggregatedReport.set(employee.id, {
            employeeId: employee.id,
            employeeName: `${employee.lastName} ${employee.firstName}`,
            monthlySalary: employee.monthlySalary,
            dailyRate: employee.monthlySalary / (settings.baseDayCount > 0 ? settings.baseDayCount : 30),
            effectiveDays: 0,
            absentDays: 0,
            leaveDays: 0,
            sickDays: 0,
            overtimeHours: 0,
            totalPayableDays: 0,
            totalPay: 0,
            advance: 0,
            bonus: 0,
            deduction: 0,
        });
    });

    const months = getMonthsInRange(from, to);

    months.forEach(({ year, month }) => {
        const daysInMonth = getDaysInJalaliMonth(year, month);
        const firstDay = getFirstDayOfMonthJalali(year, month);

        employees.forEach(employee => {
            const reportItem = aggregatedReport.get(employee.id)!;
            const employeeAttendance = attendance[employee.id] || {};
            const financials: MonthlyFinancials = financialData[employee.id]?.[year]?.[month] || {};
            
            reportItem.advance += financials.advance || 0;
            reportItem.bonus += financials.bonus || 0;
            reportItem.deduction += financials.deduction || 0;
            
            let presenceDays = 0, fridayWorkDays = 0, holidayWorkDays = 0;

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
                    reportItem.overtimeHours += Math.max(0, numericValue - 10);
                } else {
                    switch (status.toLowerCase()) {
                        case 'غ': reportItem.absentDays++; break;
                        case 'م': reportItem.leaveDays++; break;
                        case 'ا': reportItem.sickDays++; break;
                    }
                }
            }
            reportItem.effectiveDays += presenceDays + reportItem.leaveDays + reportItem.sickDays + fridayWorkDays + holidayWorkDays;
        });
    });

    aggregatedReport.forEach(reportItem => {
        reportItem.totalPayableDays = reportItem.effectiveDays + (reportItem.overtimeHours / 10.0);
        const basePay = reportItem.totalPayableDays * reportItem.dailyRate;
        reportItem.totalPay = basePay + reportItem.bonus - reportItem.advance - reportItem.deduction;
    });

    return Array.from(aggregatedReport.values());
};


export const generateAttendanceSummary = (
    employees: Employee[],
    attendance: EmployeeAttendance,
    settings: Settings,
    from: { year: number; month: number },
    to: { year: number; month: number }
): AttendanceSummaryData[] => {
    const aggregatedSummary = new Map<string, AttendanceSummaryData>();

    employees.forEach(employee => {
        aggregatedSummary.set(employee.id, {
            employeeId: employee.id,
            lastName: employee.lastName,
            firstName: employee.firstName,
            position: employee.position,
            presenceDays: 0,
            leaveDays: 0,
            sickDays: 0,
            absentDays: 0,
            fridayWorkDays: 0,
            holidayWorkDays: 0,
            overtimeHours: 0,
            nightShiftHours: 0,
            totalWorkedDays: 0,
            notes: '',
        });
    });

    const months = getMonthsInRange(from, to);
    
    months.forEach(({ year, month }) => {
        const daysInMonth = getDaysInJalaliMonth(year, month);
        const firstDay = getFirstDayOfMonthJalali(year, month);

        employees.forEach(employee => {
            const summaryItem = aggregatedSummary.get(employee.id)!;
            const employeeAttendance = attendance[employee.id] || {};
            let hasSettlementInMonth = false;

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
                    if (effectiveDayType === 'friday') summaryItem.fridayWorkDays++;
                    else if (effectiveDayType === 'holiday') summaryItem.holidayWorkDays++;
                    else summaryItem.presenceDays++;

                    summaryItem.overtimeHours += Math.max(0, numericValue - 10);
                } else {
                     switch (status.toLowerCase()) {
                        case 'غ': summaryItem.absentDays++; break;
                        case 'م': summaryItem.leaveDays++; break;
                        case 'ا': summaryItem.sickDays++; break;
                        case 'ت': hasSettlementInMonth = true; break;
                    }
                }
            }
            if (hasSettlementInMonth && !summaryItem.notes.includes('تسویه')) {
                 summaryItem.notes = (summaryItem.notes ? summaryItem.notes + ', ' : '') + 'تسویه';
            }
        });
    });

    aggregatedSummary.forEach(summaryItem => {
        summaryItem.totalWorkedDays = summaryItem.presenceDays + summaryItem.leaveDays + summaryItem.sickDays + summaryItem.fridayWorkDays + summaryItem.holidayWorkDays;
    });

    return Array.from(aggregatedSummary.values());
};

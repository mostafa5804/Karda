import React from 'react';
import { Employee, ReportData, Settings, Project } from '../types';
import { formatCurrency } from '../utils/currency';

interface PayslipProps {
    employee: Employee;
    reportData: ReportData;
    settings: Settings;
    project: Project;
    dateRangeString: string;
}

const Payslip: React.FC<PayslipProps> = ({ employee, reportData, settings, project, dateRangeString }) => {

    const { salaryMode } = settings;
    const { dailyRate, effectiveDays, absentDays, overtimeHours, bonus = 0, advance = 0, deduction = 0 } = reportData;

    // --- Calculations ---
    const absenceDeduction = dailyRate * absentDays;
    const overtimePay = (overtimeHours / 10) * dailyRate; // Assuming 10 hours overtime = 1 day pay

    let earnings: { title: string, value: number, note?: string }[] = [];
    
    if (salaryMode === 'official') {
        const baseDayCount = settings.baseDayCount > 0 ? settings.baseDayCount : 30;
        const baseSalaryProrated = ((employee.baseSalary || 0) / baseDayCount) * effectiveDays;
        const housingAllowanceProrated = ((employee.housingAllowance || 0) / baseDayCount) * effectiveDays;
        const childAllowanceProrated = ((employee.childAllowance || 0) / baseDayCount) * effectiveDays;
        const otherBenefitsProrated = ((employee.otherBenefits || 0) / baseDayCount) * effectiveDays;

        earnings = [
            { title: 'حقوق پایه', value: baseSalaryProrated, note: `بر اساس ${effectiveDays} روز کارکرد` },
            { title: 'حق مسکن', value: housingAllowanceProrated },
            { title: 'حق اولاد', value: childAllowanceProrated },
            { title: 'سایر مزایا', value: otherBenefitsProrated },
            { title: 'مبلغ اضافه کاری', value: overtimePay, note: `${overtimeHours} ساعت` },
            { title: 'پاداش', value: bonus },
        ];
    } else { // Project mode
        const baseWorkPay = dailyRate * effectiveDays;
        earnings = [
            { title: 'حقوق بر اساس کارکرد', value: baseWorkPay, note: `${effectiveDays} روز` },
            { title: 'مبلغ اضافه کاری', value: overtimePay, note: `${overtimeHours} ساعت` },
            { title: 'پاداش', value: bonus },
        ];
    }

    const deductions = [
        { title: 'کسر غیبت', value: absenceDeduction, note: `${absentDays} روز` },
        { title: 'مساعده', value: advance },
        { title: 'سایر کسورات', value: deduction },
    ];
    
    const totalEarnings = earnings.reduce((sum, item) => sum + item.value, 0);
    const totalDeductions = deductions.reduce((sum, item) => sum + item.value, 0);
    const netPay = totalEarnings - totalDeductions;

    return (
        <div className="bg-base-100 p-4 border rounded-lg">
            <header className="text-center border-b-2 border-base-content pb-4 mb-4">
                <h2 className="text-xl font-bold">{project.companyName}</h2>
                <h3 className="text-lg">فیش حقوقی پروژه: {project.name}</h3>
                <p className="text-base-content/80">{dateRangeString}</p>
            </header>

            <div className="grid grid-cols-2 gap-4">
                {/* --- Earnings Column --- */}
                <div className="border rounded-lg p-4">
                    <h4 className="font-bold text-lg text-green-700 border-b pb-2 mb-2">دریافتی‌ها</h4>
                    <table className="w-full text-sm">
                        <tbody>
                            {earnings.filter(item => item.value > 0).map((item, index) => (
                                <tr key={index} className="border-b last:border-b-0">
                                    <td className="py-2 pr-2">
                                        {item.title}
                                        {item.note && <span className="text-xs text-base-content/60 block">({item.note})</span>}
                                    </td>
                                    <td className="py-2 text-left font-mono">{formatCurrency(item.value, settings.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold bg-base-200">
                                <td className="py-2 pr-2">جمع دریافتی</td>
                                <td className="py-2 text-left font-mono">{formatCurrency(totalEarnings, settings.currency)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* --- Deductions Column --- */}
                <div className="border rounded-lg p-4">
                    <h4 className="font-bold text-lg text-red-700 border-b pb-2 mb-2">کسورات</h4>
                    <table className="w-full text-sm">
                        <tbody>
                             {deductions.filter(item => item.value > 0).map((item, index) => (
                                <tr key={index} className="border-b last:border-b-0">
                                    <td className="py-2 pr-2">
                                        {item.title}
                                         {item.note && <span className="text-xs text-base-content/60 block">({item.note})</span>}
                                    </td>
                                    <td className="py-2 text-left font-mono">{formatCurrency(item.value, settings.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                             <tr className="font-bold bg-base-200">
                                <td className="py-2 pr-2">جمع کسورات</td>
                                <td className="py-2 text-left font-mono">{formatCurrency(totalDeductions, settings.currency)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* --- Footer --- */}
            <div className="mt-4 p-4 bg-primary text-primary-content rounded-lg flex justify-between items-center">
                <span className="font-bold text-lg">خالص پرداختی</span>
                <span className="font-bold text-xl font-mono">{formatCurrency(netPay, settings.currency, true)}</span>
            </div>

            <footer className="mt-16 pt-4 text-center text-sm">
                <div className="flex justify-around">
                    <span>امضاء حسابداری</span>
                    <span>امضاء کارمند</span>
                </div>
            </footer>
        </div>
    );
};

export default Payslip;
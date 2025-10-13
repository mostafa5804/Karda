import React, { useMemo } from 'react';
import { Employee } from '../types';
import { useAppStore } from '../stores/useAppStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { generateReport } from '../utils/reports';
import { JALALI_MONTHS, ICONS } from '../constants';
import { formatCurrency } from '../utils/currency';
import { getDaysInJalaliMonth, getFormattedDate, getFirstDayOfMonthJalali } from '../utils/calendar';
import IndividualAiAnalysis from './IndividualAiAnalysis';

interface IndividualReportProps {
    employee?: Employee;
    employees: Employee[];
    projectId: string;
}

const IndividualReport: React.FC<IndividualReportProps> = ({ employee, projectId }) => {
    const { selectedYear, selectedMonth } = useAppStore();
    const { attendance } = useEmployeeStore().getProjectData(projectId);
    const settings = useSettingsStore().getSettings(projectId);
    const { projectFinancials } = useFinancialStore();

    const monthlyReportData = useMemo(() => {
        if (!employee) return null;
        return generateReport([employee], attendance, settings, projectFinancials[projectId] || {}, selectedYear, selectedMonth)[0];
    }, [employee, attendance, settings, projectFinancials, selectedYear, selectedMonth, projectId]);

    const handlePrint = () => {
        window.print();
    };

    if (!employee) {
        return (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                لطفاً یک کارمند را برای مشاهده گزارش فردی انتخاب کنید.
            </div>
        );
    }
    
    const daysInMonth = getDaysInJalaliMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonthJalali(selectedYear, selectedMonth);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4 no-print">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">گزارش فردی: {employee.lastName} {employee.firstName}</h1>
                        <p className="text-gray-600">گزارش ماه {JALALI_MONTHS[selectedMonth - 1]} {selectedYear}</p>
                    </div>
                    <button onClick={handlePrint} className="btn btn-primary">{ICONS.print} <span className="mr-2">چاپ</span></button>
                </div>
                
                <div className="print-area">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md mb-6">
                        <div><strong className="block text-sm text-gray-500">نام:</strong><span>{employee.lastName} {employee.firstName}</span></div>
                        <div><strong className="block text-sm text-gray-500">سمت:</strong><span>{employee.position}</span></div>
                        <div><strong className="block text-sm text-gray-500">کد ملی:</strong><span>{employee.nationalId || '-'}</span></div>
                        <div><strong className="block text-sm text-gray-500">حقوق پایه:</strong><span>{formatCurrency(employee.monthlySalary, settings.currency, true)}</span></div>
                    </div>

                    {monthlyReportData && (
                        <div className="stats stats-vertical lg:stats-horizontal shadow w-full mb-6">
                            <div className="stat">
                                <div className="stat-title">روزهای موثر</div>
                                <div className="stat-value text-primary">{monthlyReportData.effectiveDays}</div>
                                <div className="stat-desc">حضور + مرخصی + استعلاجی</div>
                            </div>
                            <div className="stat">
                                <div className="stat-title">اضافه کاری</div>
                                <div className="stat-value text-secondary">{monthlyReportData.overtimeHours}</div>
                                <div className="stat-desc">ساعت</div>
                            </div>
                            <div className="stat">
                                <div className="stat-title">غیبت / مرخصی</div>
                                <div className="stat-value">{monthlyReportData.absentDays} / {monthlyReportData.leaveDays}</div>
                                <div className="stat-desc">روز</div>
                            </div>
                            <div className="stat">
                                <div className="stat-title">حقوق قابل پرداخت</div>
                                <div className="stat-value">{formatCurrency(monthlyReportData.totalPay, settings.currency, true)}</div>
                                <div className="stat-desc">پس از کسورات و اضافات</div>
                            </div>
                        </div>
                    )}

                    <h2 className="text-lg font-semibold mb-2">تقویم کارکرد ماه</h2>
                     <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="p-1"></div>)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                             const day = i + 1;
                             const date = getFormattedDate(selectedYear, selectedMonth, day);
                             const status = attendance[employee.id]?.[date] || '';
                             return (
                                 <div key={day} className="p-1 border rounded" title={`${day} ${JALALI_MONTHS[selectedMonth-1]}`}>
                                     <div className="font-bold">{day}</div>
                                     <div className="mt-1">{status || '-'}</div>
                                 </div>
                             );
                         })}
                    </div>
                </div>
            </div>
            {settings.isAiAssistantEnabled && <IndividualAiAnalysis employee={employee} projectId={projectId} />}
        </div>
    );
};

export default IndividualReport;

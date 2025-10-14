import React, { useMemo, useState } from 'react';
import { Employee } from '../types';
import { useAppStore } from '../stores/useAppStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { generateReport } from '../utils/reports';
import { JALALI_MONTHS, ICONS } from '../constants';
import { formatCurrency } from '../utils/currency';
import { getDaysInJalaliMonth, getFormattedDate, getFirstDayOfMonthJalali } from '../utils/calendar';
import IndividualAiAnalysis from './IndividualAiAnalysis';
import Payslip from './Payslip';

interface IndividualReportProps {
    employee?: Employee;
    employees: Employee[];
    projectId: string;
}

const IndividualReport: React.FC<IndividualReportProps> = ({ employee, projectId }) => {
    const { reportDateFilter } = useAppStore();
    const { attendance } = useEmployeeStore().getProjectData(projectId);
    const settings = useSettingsStore().getSettings(projectId);
    const { projectFinancials } = useFinancialStore();
    const { projects } = useCompanyStore();
    const [printMode, setPrintMode] = useState<'color' | 'monochrome'>('monochrome');


    const currentProject = projects.find(p => p.id === projectId);

    const reportData = useMemo(() => {
        if (!employee) return null;
        return generateReport([employee], attendance, settings, projectFinancials[projectId] || {}, reportDateFilter.from, reportDateFilter.to)[0];
    }, [employee, attendance, settings, projectFinancials, reportDateFilter, projectId]);
    
    const reportTitle = useMemo(() => {
        const { from, to } = reportDateFilter;
        if (from.year === to.year && from.month === to.month) {
            return `گزارش ماه ${JALALI_MONTHS[from.month - 1]} ${from.year}`;
        }
        return `گزارش از ${JALALI_MONTHS[from.month - 1]} ${from.year} تا ${JALALI_MONTHS[to.month - 1]} ${to.year}`;
    }, [reportDateFilter]);

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
    
    const { year: selectedYear, month: selectedMonth } = reportDateFilter.from;
    const daysInMonth = getDaysInJalaliMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonthJalali(selectedYear, selectedMonth);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4 no-print flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">گزارش فردی: {employee.lastName} {employee.firstName}</h1>
                        <p className="text-gray-600">{reportTitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="join">
                            <input className="join-item btn btn-sm" type="radio" name="print_options_individual" aria-label="رنگی" value="color" checked={printMode === 'color'} onChange={() => setPrintMode('color')} />
                            <input className="join-item btn btn-sm" type="radio" name="print_options_individual" aria-label="سیاه‌وسفید" value="monochrome" checked={printMode === 'monochrome'} onChange={() => setPrintMode('monochrome')} />
                        </div>
                        <button onClick={handlePrint} className="btn btn-primary">{ICONS.print} <span className="mr-2">چاپ فیش حقوقی</span></button>
                    </div>
                </div>
                
                <div className={`print-area payslip-print-area print-${printMode}`}>
                    {/* This part is visible on screen and print */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md mb-6">
                        <div><strong className="block text-sm text-gray-500">نام:</strong><span>{employee.lastName} {employee.firstName}</span></div>
                        <div><strong className="block text-sm text-gray-500">سمت:</strong><span>{employee.position}</span></div>
                        <div><strong className="block text-sm text-gray-500">کد ملی:</strong><span>{employee.nationalId || '-'}</span></div>
                        <div><strong className="block text-sm text-gray-500">حقوق ماهانه:</strong><span>{formatCurrency(employee.monthlySalary, settings.currency, true)}</span></div>
                    </div>

                    {reportData && currentProject && (
                        <Payslip 
                           employee={employee}
                           reportData={reportData}
                           settings={settings}
                           project={currentProject}
                           dateRangeString={reportTitle}
                        />
                    )}

                    {/* These parts are only visible on screen */}
                    <div className="no-print">
                        {reportData && (
                            <div className="stats stats-vertical lg:stats-horizontal shadow w-full my-6">
                                <div className="stat">
                                    <div className="stat-title">روزهای موثر</div>
                                    <div className="stat-value text-primary">{reportData.effectiveDays}</div>
                                    <div className="stat-desc">حضور + مرخصی + استعلاجی</div>
                                </div>
                                <div className="stat">
                                    <div className="stat-title">اضافه کاری</div>
                                    <div className="stat-value text-secondary">{reportData.overtimeHours}</div>
                                    <div className="stat-desc">ساعت</div>
                                </div>
                                <div className="stat">
                                    <div className="stat-title">غیبت / مرخصی</div>
                                    <div className="stat-value">{reportData.absentDays} / {reportData.leaveDays}</div>
                                    <div className="stat-desc">روز</div>
                                </div>
                                <div className="stat">
                                    <div className="stat-title">حقوق قابل پرداخت</div>
                                    <div className="stat-value">{formatCurrency(reportData.totalPay, settings.currency, true)}</div>
                                    <div className="stat-desc">پس از کسورات و اضافات</div>
                                </div>
                            </div>
                        )}

                        <h2 className="text-lg font-semibold mb-2 mt-6">تقویم کارکرد (ماه اول بازه)</h2>
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
            </div>
            <div className="no-print">
               {settings.isAiAssistantEnabled && <IndividualAiAnalysis employee={employee} projectId={projectId} />}
            </div>
        </div>
    );
};

export default IndividualReport;
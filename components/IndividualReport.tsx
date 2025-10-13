import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { MonthlyFinancials } from '../types';
import { generateReport, generateAttendanceSummary } from '../utils/reports';
import { JALALI_MONTHS, ICONS } from '../constants';
import { Employee } from '../types';

const FinancialsEditor: React.FC<{employeeId: string, projectId: string, year: number, month: number}> = ({employeeId, projectId, year, month}) => {
    const { getFinancials, updateFinancials } = useFinancialStore();
    const [localFinancials, setLocalFinancials] = useState<MonthlyFinancials>(() => getFinancials(projectId, employeeId, year, month));
    
    useEffect(() => {
        setLocalFinancials(getFinancials(projectId, employeeId, year, month));
    }, [projectId, employeeId, year, month, getFinancials]);

    useEffect(() => {
        const handler = setTimeout(() => {
            const storeState = getFinancials(projectId, employeeId, year, month);
            if (JSON.stringify(localFinancials) !== JSON.stringify(storeState)) {
                 updateFinancials(projectId, employeeId, year, month, localFinancials);
            }
        }, 1000); // 1-second debounce

        return () => {
            clearTimeout(handler);
        };
    }, [localFinancials, updateFinancials, projectId, employeeId, year, month, getFinancials]);

    const handleChange = (field: keyof MonthlyFinancials, value: string) => {
        const numValue = parseInt(value, 10);
        setLocalFinancials(prev => {
            const newFinancials = {...prev};
            if (isNaN(numValue) || numValue === 0) {
                delete newFinancials[field];
            } else {
                newFinancials[field] = numValue;
            }
            return newFinancials;
        });
    };
    
    return (
         <div className="border p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-2 border-b pb-1">اطلاعات مالی ماه</h3>
            <div className="space-y-3 text-sm">
                <div className="form-control">
                    <label className="label"><span className="label-text">مساعده (تومان)</span></label>
                    <input type="number" placeholder="0" className="input input-bordered input-sm"
                        value={localFinancials.advance || ''} onChange={e => handleChange('advance', e.target.value)} />
                </div>
                 <div className="form-control">
                    <label className="label"><span className="label-text">پاداش (تومان)</span></label>
                    <input type="number" placeholder="0" className="input input-bordered input-sm" 
                        value={localFinancials.bonus || ''} onChange={e => handleChange('bonus', e.target.value)} />
                </div>
                 <div className="form-control">
                    <label className="label"><span className="label-text">کسورات (تومان)</span></label>
                    <input type="number" placeholder="0" className="input input-bordered input-sm" 
                        value={localFinancials.deduction || ''} onChange={e => handleChange('deduction', e.target.value)} />
                </div>
            </div>
        </div>
    );
};

interface IndividualReportProps {
    employee: Employee | undefined;
    employees: Employee[]; // All project employees for context
    projectId: string;
}

const IndividualReport: React.FC<IndividualReportProps> = ({ employee, employees, projectId }) => {
    const { getProjectData } = useEmployeeStore();
    const { getSettings } = useSettingsStore();
    const { selectedYear, selectedMonth } = useAppStore();
    const { companyInfo } = useCompanyStore();
    const { projectFinancials } = useFinancialStore();
    
    const { attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);
    const financialData = projectFinancials[projectId] || {};

    const salaryData = useMemo(() => {
        if (!employee) return null;
        // FIX: Corrected the arguments for generateReport. The second argument should be 'attendance', not 'financialData'.
        const report = generateReport([employee], attendance, settings, financialData, selectedYear, selectedMonth);
        return report[0];
    }, [employee, attendance, settings, financialData, selectedYear, selectedMonth]);

    const summaryData = useMemo(() => {
        if (!employee) return null;
        const summary = generateAttendanceSummary([employee], attendance, settings, selectedYear, selectedMonth);
        return summary[0];
    }, [employee, attendance, settings, selectedYear, selectedMonth]);

    const handlePrint = () => {
        window.print();
    };

    if (!employee) {
        return (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
               {employees.length > 0 ? 'لطفاً یک کارمند را از لیست بالا انتخاب کنید تا گزارش او نمایش داده شود.' : 'هیچ کارمند فعالی برای نمایش گزارش وجود ندارد.'}
            </div>
        );
    }
    
    if (!salaryData || !summaryData) {
        return <div className="text-center p-8 bg-white p-6 rounded-lg shadow">اطلاعات این کارمند یافت نشد.</div>;
    }

    const ReportHeader = () => (
         <div className="mb-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                <div className="text-right">
                    <h1 className="text-xl font-bold">{companyInfo.companyName}</h1>
                    <p>پروژه: {companyInfo.projects.find(p => p.id === projectId)?.name}</p>
                </div>
                 <div className="text-center">
                    <h2 className="text-lg font-bold">گزارش کارکرد ماهانه فردی</h2>
                    <p>{JALALI_MONTHS[selectedMonth - 1]} {selectedYear}</p>
                </div>
                <div className="w-1/4 flex justify-end">
                    {companyInfo.companyLogo && <img src={companyInfo.companyLogo} alt="Company Logo" className="h-16 w-auto" />}
                </div>
            </div>
             <div className="flex justify-between items-center bg-gray-100 p-2 rounded">
                <div><span className="font-bold">نام و نام خانوادگی:</span> {employee.lastName} {employee.firstName}</div>
                <div><span className="font-bold">سمت:</span> {employee.position}</div>
             </div>
        </div>
    );
    
    const ReportFooter = () => (
         <div className="mt-8 pt-4 text-center text-sm" style={{pageBreakInside: 'avoid'}}>
            <div className="flex justify-around">
                <span>تهیه کننده:</span>
                <span>تایید کننده:</span>
                <span>تصویب کننده:</span>
            </div>
        </div>
    );

    return (
         <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4 no-print">
                <h1 className="text-2xl font-bold text-gray-800">
                    گزارش فردی: {employee.lastName} {employee.firstName}
                </h1>
                <button onClick={handlePrint} className="btn btn-primary">
                    {ICONS.print} <span className="mr-2">چاپ گزارش</span>
                </button>
            </div>
            
            <div className="print-area bg-white p-4 border rounded-md">
                <ReportHeader />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Salary Details */}
                        <div className="border p-4 rounded-lg">
                            <h3 className="text-lg font-bold mb-2 border-b pb-1">خلاصه حقوق</h3>
                            <div className="space-y-2 text-sm">
                               <p className="flex justify-between"><span>حقوق پایه ماهانه:</span> <span className="font-mono">{salaryData.monthlySalary.toLocaleString('fa-IR')}</span></p>
                               <p className="flex justify-between"><span>نرخ هر روز کاری:</span> <span className="font-mono">{Math.round(salaryData.dailyRate).toLocaleString('fa-IR')}</span></p>
                               <p className="flex justify-between"><span>روزهای کاری موثر:</span> <span className="font-mono">{salaryData.effectiveDays} روز</span></p>
                               <p className="flex justify-between"><span>ساعات اضافه کاری:</span> <span className="font-mono">{salaryData.overtimeHours} ساعت</span></p>
                               <hr/>
                               <p className="flex justify-between"><span>مساعده:</span> <span className="font-mono text-red-600">{(salaryData.advance || 0).toLocaleString('fa-IR')}</span></p>
                               <p className="flex justify-between"><span>پاداش:</span> <span className="font-mono text-green-600">{(salaryData.bonus || 0).toLocaleString('fa-IR')}</span></p>
                               <p className="flex justify-between"><span>کسورات:</span> <span className="font-mono text-red-600">{(salaryData.deduction || 0).toLocaleString('fa-IR')}</span></p>
                               <hr />
                               <p className="flex justify-between text-base font-bold"><span>قابل پرداخت (تومان):</span> <span className="font-mono text-blue-700">{Math.round(salaryData.totalPay).toLocaleString('fa-IR')}</span></p>
                            </div>
                        </div>
                         {/* Attendance Details */}
                        <div className="border p-4 rounded-lg">
                            <h3 className="text-lg font-bold mb-2 border-b pb-1">خلاصه کارکرد</h3>
                            <div className="space-y-2 text-sm">
                               <p className="flex justify-between"><span>حضور در روزهای عادی:</span> <span className="font-mono">{summaryData.presenceDays} روز</span></p>
                               <p className="flex justify-between"><span>کار در روزهای جمعه:</span> <span className="font-mono">{summaryData.fridayWorkDays} روز</span></p>
                               <p className="flex justify-between"><span>کار در روزهای تعطیل:</span> <span className="font-mono">{summaryData.holidayWorkDays} روز</span></p>
                               <p className="flex justify-between"><span>مرخصی استحقاقی:</span> <span className="font-mono">{summaryData.leaveDays} روز</span></p>
                               <p className="flex justify-between"><span>غیبت:</span> <span className="font-mono text-red-600">{summaryData.absentDays} روز</span></p>
                                <hr />
                               <p className="flex justify-between text-base font-bold"><span>جمع کل ایام کارکرد:</span> <span className="font-mono">{summaryData.totalWorkedDays} روز</span></p>
                            </div>
                        </div>
                    </div>
                    {/* Financial Editor */}
                    <div className="no-print">
                        <FinancialsEditor employeeId={employee.id} projectId={projectId} year={selectedYear} month={selectedMonth} />
                    </div>
                </div>
                <ReportFooter />
            </div>
         </div>
    );
};

export default IndividualReport;
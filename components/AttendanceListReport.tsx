import React from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { getDaysInJalaliMonth, getFirstDayOfMonthJalali, getFormattedDate } from '../utils/calendar';
import { JALALI_MONTHS, JALALI_DAYS_ABBR, ICONS } from '../constants';
import { Employee, EmployeeAttendance, Settings } from '../types';

interface AttendanceListReportProps {
    employees: Employee[];
    attendance: EmployeeAttendance;
    settings: Settings;
    projectId: string;
}

const AttendanceListReport: React.FC<AttendanceListReportProps> = ({ employees, attendance, settings, projectId }) => {
    const { selectedYear, selectedMonth } = useAppStore();
    const { companyInfo } = useCompanyStore();

    const daysInMonth = getDaysInJalaliMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonthJalali(selectedYear, selectedMonth);

    const handlePrint = () => {
        const style = document.createElement('style');
        style.id = 'print-landscape-style';
        style.innerHTML = `@media print { @page { size: A4 landscape; margin: 1cm; } }`;
        document.head.appendChild(style);
        window.print();
        document.getElementById('print-landscape-style')?.remove();
    };

    const currentProjectName = companyInfo.projects.find(p => p.id === projectId)?.name || '';

    const ReportHeader = () => (
        <div className="mb-4 text-center">
            <h1 className="text-xl font-bold">لیست کارکرد پرسنل پروژه {currentProjectName} ( {JALALI_MONTHS[selectedMonth - 1]} ماه ) {selectedYear}</h1>
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

    const renderHeader = () => {
        const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = getFormattedDate(selectedYear, selectedMonth, day);
            const dayOfWeek = (firstDay + i) % 7;
            const override = settings.dayTypeOverrides[date];
            let dayType = override || (dayOfWeek === 6 ? 'friday' : (settings.holidays.includes(date) ? 'holiday' : 'normal'));

            let headerBg = 'bg-gray-200';
            if (dayType === 'friday') headerBg = 'bg-green-300';
            else if (dayType === 'holiday') headerBg = 'bg-yellow-300';
            
            return (
                <th key={day} className={`border border-black p-1 text-center font-normal text-xs ${headerBg}`}>
                    <div>{JALALI_DAYS_ABBR[dayOfWeek]}</div>
                    <div>{day}</div>
                </th>
            );
        });

        return (
            <thead>
                <tr>
                    <th className="border border-black p-1 bg-gray-200 w-8">ردیف</th>
                    <th className="border border-black p-1 bg-gray-200 min-w-[150px]">نام و نام خانوادگی</th>
                    {dayHeaders}
                    <th className="border border-black p-1 bg-gray-200">جمع کل</th>
                </tr>
            </thead>
        );
    };

    const renderBody = () => {
        return (
             <tbody>
                {employees.map((employee, index) => {
                    const employeeAttendance = attendance[employee.id] || {};
                    let hasSettlement = false;
                    // FIX: Explicitly type `sum` as `number` to avoid type inference issues.
                    const totalHours = Object.values(employeeAttendance).reduce((sum: number, value) => {
                        const strValue = String(value);
                        if (strValue.toLowerCase() === 'ت') hasSettlement = true;
                        const hours = parseFloat(strValue);
                        return sum + (isNaN(hours) ? 0 : hours);
                    }, 0);
                    const rowBg = hasSettlement ? 'bg-red-100' : '';

                    return (
                        <tr key={employee.id} className={rowBg}>
                            <td className="border border-black p-1 text-center">{index + 1}</td>
                            <td className="border border-black p-1 text-right">{`${employee.lastName} ${employee.firstName}`}</td>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const date = getFormattedDate(selectedYear, selectedMonth, day);
                                const value = employeeAttendance[date] || '';
                                return (<td key={date} className="border border-black p-1 text-center">{value}</td>);
                            })}
                            <td className="border border-black p-1 text-center font-bold">{totalHours}</td>
                        </tr>
                    );
                })}
            </tbody>
        )
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
             <div className="flex justify-between items-center mb-4 no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        لیست کارکرد
                    </h1>
                    <p className="text-gray-600">
                        این گزارش برای چاپ افقی در صفحه A4 بهینه شده است.
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    className="btn btn-primary"
                    disabled={employees.length === 0}
                >
                    {ICONS.print}
                    <span className="mr-2">چاپ گزارش</span>
                </button>
            </div>
            {employees.length > 0 ? (
                <div className="print-area bg-white p-2 border rounded-md overflow-x-auto">
                     <ReportHeader />
                     <table className="w-full border-collapse border border-black text-xs">
                        {renderHeader()}
                        {renderBody()}
                     </table>
                     <ReportFooter />
                </div>
            ) : (
                <div className="text-center p-6 text-gray-500">
                    هیچ اطلاعاتی برای نمایش در این ماه وجود ندارد.
                </div>
            )}
        </div>
    );
};

export default AttendanceListReport;

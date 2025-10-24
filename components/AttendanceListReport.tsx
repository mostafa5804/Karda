import React, { useMemo, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getDaysInJalaliMonth, getFirstDayOfMonthJalali, getFormattedDate, getCurrentJalaliDate } from '../utils/calendar';
import { JALALI_MONTHS, JALALI_DAYS_ABBR, ICONS } from '../constants';
import { Employee, EmployeeAttendance, Settings, CustomAttendanceCode } from '../types';
import { getContrastingTextColor } from '../utils/color';

interface AttendanceListReportProps {
    employees: Employee[];
    attendance: EmployeeAttendance;
    settings: Settings;
    projectId: string;
}

const AttendanceListReport: React.FC<AttendanceListReportProps> = ({ employees, attendance, settings, projectId }) => {
    const { reportDateFilter } = useAppStore();
    const { projects } = useCompanyStore();
    const [printMode, setPrintMode] = useState<'color' | 'monochrome'>('monochrome');
    const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
    
    // This report is always for a single month, taken from the 'from' part of the filter
    let { year: selectedYear, month: selectedMonth } = reportDateFilter.from || {};
    if (!selectedYear || !selectedMonth) {
        [selectedYear, selectedMonth] = getCurrentJalaliDate();
    }

    const daysInMonth = getDaysInJalaliMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonthJalali(selectedYear, selectedMonth);

    const customCodeMap = useMemo(() => {
        const map = new Map<string, CustomAttendanceCode>();
        settings.customCodes.forEach(code => map.set(code.char.toLowerCase(), code));
        return map;
    }, [settings.customCodes]);

    const handlePrint = () => {
        const styleId = 'dynamic-print-style';
        document.getElementById(styleId)?.remove();

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `@media print { @page { size: A4 ${printOrientation}; margin: 1cm; } }`;
        document.head.appendChild(style);
        
        window.print();
    };

    const currentProject = projects.find(p => p.id === projectId);

    const ReportHeader = () => (
        <div className="mb-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <div className="w-1/4 flex justify-center">
                    {currentProject?.companyLogo && <img src={currentProject.companyLogo} alt="Company Logo" className="h-16 w-auto" />}
                </div>
                <div className="w-1/2 text-center">
                    <h1 className="text-xl font-bold">{currentProject?.companyName}</h1>
                    <h2 className="text-lg">لیست کارکرد پرسنل پروژه: {currentProject?.name}</h2>
                    <p>({JALALI_MONTHS[selectedMonth - 1]} ماه {selectedYear})</p>
                </div>
                <div className="w-1/4" />
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

    const renderHeader = () => {
        const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = getFormattedDate(selectedYear, selectedMonth, day);
            const dayOfWeek = (firstDay + i) % 7;
            const override = settings.dayTypeOverrides[date];
            const isFriday = override === 'friday' || (!override && dayOfWeek === 6);
            const isHoliday = override === 'holiday' || (!override && settings.holidays.includes(date));

            const headerStyle: React.CSSProperties = {};
            if (isFriday) {
                headerStyle.backgroundColor = settings.customCodes.find(c => c.id === 'system-friday-work')?.color || '#dcfce7';
            } else if (isHoliday) {
                headerStyle.backgroundColor = settings.customCodes.find(c => c.id === 'system-holiday-work')?.color || '#fee2e2';
            }
            
            return (
                <th key={day} className="border border-black p-1 text-center font-normal" style={headerStyle}>
                    <div>{JALALI_DAYS_ABBR[dayOfWeek]}</div>
                    <div>{day}</div>
                </th>
            );
        });

        return (
            <thead>
                <tr>
                    <th className="border border-black p-1 w-8">ردیف</th>
                    <th className="border border-black p-1 min-w-[150px]">نام و نام خانوادگی</th>
                    {dayHeaders}
                    <th className="border border-black p-1">جمع کل</th>
                </tr>
            </thead>
        );
    };

    const renderBody = () => {
        return (
             <tbody>
                {employees.map((employee, index) => {
                    const employeeAttendance = attendance[employee.id] || {};
                    const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
                    let hasSettlement = false;

                    const totalHours = Object.entries(employeeAttendance)
                        .filter(([date]) => date.startsWith(monthPrefix)) // Filter for the current month only
                        .reduce((sum: number, [, value]) => {
                            const strValue = String(value);
                            if (strValue.toLowerCase() === 'ت') hasSettlement = true;
                            const hours = parseFloat(strValue);
                            return sum + (isNaN(hours) ? 0 : hours);
                        }, 0);
                    
                    const settlementCodeColor = customCodeMap.get('ت')?.color;
                    const rowStyle = hasSettlement ? { backgroundColor: settlementCodeColor || '#E9D5FF' } : {};


                    return (
                        <tr key={employee.id} style={rowStyle}>
                            <td className="border border-black p-1 text-center">{index + 1}</td>
                            <td className="border border-black p-1 text-right print-no-wrap">{`${employee.lastName} ${employee.firstName}`}</td>
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const date = getFormattedDate(selectedYear, selectedMonth, day);
                                const value = employeeAttendance[date] || '';
                                
                                const cellStyle: React.CSSProperties = {};
                                const customCode = customCodeMap.get(String(value).toLowerCase());
                                if (customCode) {
                                    cellStyle.backgroundColor = customCode.color;
                                    cellStyle.color = getContrastingTextColor(customCode.color);
                                } else {
                                    const dayOfWeek = (firstDay + i) % 7;
                                    const override = settings.dayTypeOverrides[date];
                                    const isFriday = override === 'friday' || (!override && dayOfWeek === 6);
                                    const isHoliday = override === 'holiday' || (!override && settings.holidays.includes(date));
                                    
                                    if (isFriday) {
                                        cellStyle.backgroundColor = settings.customCodes.find(c => c.id === 'system-friday-work')?.color;
                                    } else if (isHoliday) {
                                        cellStyle.backgroundColor = settings.customCodes.find(c => c.id === 'system-holiday-work')?.color;
                                    }
                                }

                                return (<td key={date} className="border border-black p-1 text-center" style={cellStyle}>{value}</td>);
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
             <div className="flex justify-between items-center mb-4 no-print flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        لیست کارکرد
                    </h1>
                    <p className="text-gray-600">
                        این گزارش برای چاپ بهینه شده است.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="join">
                        <input className="join-item btn btn-sm" type="radio" name="print_orientation_list" aria-label="عمودی" value="portrait" checked={printOrientation === 'portrait'} onChange={() => setPrintOrientation('portrait')} />
                        <input className="join-item btn btn-sm" type="radio" name="print_orientation_list" aria-label="افقی" value="landscape" checked={printOrientation === 'landscape'} onChange={() => setPrintOrientation('landscape')} />
                    </div>
                    <div className="join">
                        <input className="join-item btn btn-sm" type="radio" name="print_options_list" aria-label="رنگی" value="color" checked={printMode === 'color'} onChange={() => setPrintMode('color')} />
                        <input className="join-item btn btn-sm" type="radio" name="print_options_list" aria-label="سیاه‌وسفید" value="monochrome" checked={printMode === 'monochrome'} onChange={() => setPrintMode('monochrome')} />
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
            </div>
            {employees.length > 0 ? (
                <div className={`print-area bg-white p-2 border rounded-md overflow-x-auto print-${printMode}`}>
                     <ReportHeader />
                     <table className="w-full border-collapse border border-black attendance-list-report table-alternating-rows">
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
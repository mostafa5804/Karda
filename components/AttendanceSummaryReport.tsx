import React, { useMemo, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { generateAttendanceSummary } from '../utils/reports';
import { JALALI_MONTHS, ICONS } from '../constants';
import { Employee, EmployeeAttendance, Settings } from '../types';

interface AttendanceSummaryReportProps {
    employees: Employee[];
    attendance: EmployeeAttendance;
    settings: Settings;
    projectId: string;
}

const AttendanceSummaryReport: React.FC<AttendanceSummaryReportProps> = ({ employees, attendance, settings, projectId }) => {
    const { reportDateFilter } = useAppStore();
    const { projects } = useCompanyStore();
    const [printMode, setPrintMode] = useState<'color' | 'monochrome'>('monochrome');
    const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');

    const currentProject = projects.find(p => p.id === projectId);

    const data = useMemo(() => {
        return generateAttendanceSummary(employees, attendance, settings, reportDateFilter.from, reportDateFilter.to);
    }, [employees, attendance, settings, reportDateFilter]);

    const handlePrint = () => {
        const styleId = 'dynamic-print-style';
        document.getElementById(styleId)?.remove();

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `@media print { @page { size: A4 ${printOrientation}; margin: 1cm; } }`;
        document.head.appendChild(style);

        window.print();
    };
    
    const ReportHeader = () => {
        const { mode, from, to } = reportDateFilter;
        let dateString;
        if (mode === 'month' || (from.year === to.year && from.month === to.month)) {
            dateString = `ماه: ${JALALI_MONTHS[from.month - 1]} سال: ${from.year}`;
        } else {
             dateString = `از ${JALALI_MONTHS[from.month - 1]} ${from.year} تا ${JALALI_MONTHS[to.month - 1]} ${to.year}`;
        }

        return (
            <div className="mb-4">
                <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                    <div className="w-1/4 flex justify-center">
                        {currentProject?.companyLogo && <img src={currentProject.companyLogo} alt="Company Logo" className="h-16 w-auto" />}
                    </div>
                    <div className="w-1/2 text-center">
                        <h1 className="text-xl font-bold">{currentProject?.companyName}</h1>
                        <h2 className="text-lg">لیست کارکرد پرسنل</h2>
                        <p>گزارش کار پروژه: {currentProject?.name}</p>
                    </div>
                    <div className="w-1/4 flex justify-center">
                        {/* This div is for balance */}
                    </div>
                </div>
                <div className="text-center font-semibold">
                    {dateString}
                </div>
            </div>
        );
    };

    const ReportFooter = () => (
         <div className="mt-8 pt-4 text-center text-sm">
            <div className="flex justify-around">
                <span>تهیه کننده:</span>
                <span>تایید کننده:</span>
                <span>تصویب کننده:</span>
            </div>
        </div>
    );
    
    const reportTitle = useMemo(() => {
        const { mode } = reportDateFilter;
        if (mode === 'month') {
            return `گزارش کارکرد کلی`;
        }
        return `گزارش کارکرد کلی (تجمیعی)`;
    }, [reportDateFilter]);


    return (
        <div className="bg-white p-6 rounded-lg shadow">
             <div className="flex justify-between items-center mb-4 no-print flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {reportTitle}
                    </h1>
                    <p className="text-gray-600">
                        این گزارش برای چاپ در صفحه A4 بهینه شده است.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                     <div className="join">
                        <input className="join-item btn btn-sm" type="radio" name="print_orientation_summary" aria-label="عمودی" value="portrait" checked={printOrientation === 'portrait'} onChange={() => setPrintOrientation('portrait')} />
                        <input className="join-item btn btn-sm" type="radio" name="print_orientation_summary" aria-label="افقی" value="landscape" checked={printOrientation === 'landscape'} onChange={() => setPrintOrientation('landscape')} />
                    </div>
                     <div className="join">
                        <input className="join-item btn btn-sm" type="radio" name="print_options" aria-label="رنگی" value="color" checked={printMode === 'color'} onChange={() => setPrintMode('color')} />
                        <input className="join-item btn btn-sm" type="radio" name="print_options" aria-label="سیاه‌وسفید" value="monochrome" checked={printMode === 'monochrome'} onChange={() => setPrintMode('monochrome')} />
                    </div>
                    <button
                        onClick={handlePrint}
                        className="btn btn-primary"
                        disabled={data.length === 0}
                    >
                        {ICONS.print}
                        <span className="mr-2">چاپ گزارش</span>
                    </button>
                </div>
            </div>

            {data.length > 0 ? (
                <div className={`print-area bg-white p-4 border rounded-md print-${printMode} summary-report-print`}>
                    <ReportHeader />
                    <table className="w-full text-center border-collapse border border-black mt-4 table-alternating-rows">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1">ردیف</th>
                                <th className="border border-black p-1">نام خانوادگی</th>
                                <th className="border border-black p-1">نام</th>
                                <th className="border border-black p-1">شغل</th>
                                <th className="border border-black p-1 vertical-header numeric-col">حضور</th>
                                <th className="border border-black p-1 vertical-header numeric-col">مرخصی</th>
                                <th className="border border-black p-1 vertical-header numeric-col">استعلاجی</th>
                                <th className="border border-black p-1 vertical-header numeric-col">غیبت</th>
                                <th className="border border-black p-1 vertical-header numeric-col">جمعه کاری</th>
                                <th className="border border-black p-1 vertical-header numeric-col">تعطیل کاری</th>
                                <th className="border border-black p-1 vertical-header numeric-col">اضافه کاری</th>
                                <th className="border border-black p-1 vertical-header numeric-col">جمع ایام</th>
                                <th className="border border-black p-1">توضیحات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr key={item.employeeId}>
                                    <td className="border border-black p-1">{index + 1}</td>
                                    <td className="border border-black p-1 text-right print-no-wrap">{item.lastName}</td>
                                    <td className="border border-black p-1 text-right print-no-wrap">{item.firstName}</td>
                                    <td className="border border-black p-1 text-right print-no-wrap">{item.position}</td>
                                    <td className="border border-black p-1 numeric-col">{item.presenceDays || '-'}</td>
                                    <td className="border border-black p-1 numeric-col">{item.leaveDays || '-'}</td>
                                    <td className="border border-black p-1 numeric-col">{item.sickDays || '-'}</td>
                                    <td className="border border-black p-1 numeric-col">{item.absentDays || '-'}</td>
                                    <td className="border border-black p-1 numeric-col">{item.fridayWorkDays || '-'}</td>
                                    <td className="border border-black p-1 numeric-col">{item.holidayWorkDays || '-'}</td>
                                    <td className="border border-black p-1 numeric-col">{item.overtimeHours || '-'}</td>
                                    <td className="border border-black p-1 font-bold numeric-col">{item.totalWorkedDays}</td>
                                    <td className="border border-black p-1">{item.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <ReportFooter />
                </div>
             ) : (
                <div className="text-center p-6 text-gray-500">
                    هیچ اطلاعاتی برای نمایش در این بازه زمانی وجود ندارد.
                </div>
            )}
        </div>
    );
};

export default AttendanceSummaryReport;
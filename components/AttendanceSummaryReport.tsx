import React, { useMemo } from 'react';
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
    const { selectedYear, selectedMonth } = useAppStore();
    const { companyInfo } = useCompanyStore();

    const data = useMemo(() => {
        return generateAttendanceSummary(employees, attendance, settings, selectedYear, selectedMonth);
    }, [employees, attendance, settings, selectedYear, selectedMonth]);

    const handlePrint = () => {
        window.print();
    };
    
    const currentProjectName = companyInfo.projects.find(p => p.id === projectId)?.name || '';

    const ReportHeader = () => (
        <div className="mb-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                <div className="w-1/4 flex justify-center">
                    {/* Placeholder for the right logo from the image */}
                </div>
                <div className="w-1/2 text-center">
                    <h1 className="text-xl font-bold">{companyInfo.companyName}</h1>
                    <h2 className="text-lg">لیست حقوق پرسنل</h2>
                    <p>گزارش کار پروژه: {currentProjectName}</p>
                </div>
                <div className="w-1/4 flex justify-center">
                    {companyInfo.companyLogo && <img src={companyInfo.companyLogo} alt="Company Logo" className="h-16 w-auto" />}
                </div>
            </div>
            <div className="flex justify-between items-center">
                <div>ماه: {JALALI_MONTHS[selectedMonth - 1]}</div>
                <div>سال: {selectedYear}</div>
            </div>
        </div>
    );

    const ReportFooter = () => (
         <div className="mt-8 pt-4 text-center text-sm">
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
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        گزارش کارکرد کلی
                    </h1>
                    <p className="text-gray-600">
                        این گزارش برای چاپ در صفحه A4 عمودی بهینه شده است.
                    </p>
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

            {data.length > 0 ? (
                <div className="print-area bg-white p-4 border rounded-md">
                    <ReportHeader />
                    <table className="w-full text-center border-collapse border border-black mt-4">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-1">ردیف</th>
                                <th className="border border-black p-1">نام خانوادگی</th>
                                <th className="border border-black p-1">نام</th>
                                <th className="border border-black p-1">شغل</th>
                                <th className="border border-black p-1">حضور</th>
                                <th className="border border-black p-1">مرخصی</th>
                                <th className="border border-black p-1">غیبت</th>
                                <th className="border border-black p-1">جمعه کاری</th>
                                <th className="border border-black p-1">تعطیل کاری</th>
                                <th className="border border-black p-1">اضافه کاری</th>
                                <th className="border border-black p-1">جمع ایام</th>
                                <th className="border border-black p-1">توضیحات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr key={item.employeeId}>
                                    <td className="border border-black p-1">{index + 1}</td>
                                    <td className="border border-black p-1 text-right">{item.lastName}</td>
                                    <td className="border border-black p-1 text-right">{item.firstName}</td>
                                    <td className="border border-black p-1 text-right">{item.position}</td>
                                    <td className="border border-black p-1">{item.presenceDays || '-'}</td>
                                    <td className="border border-black p-1">{item.leaveDays || '-'}</td>
                                    <td className="border border-black p-1">{item.absentDays || '-'}</td>
                                    <td className="border border-black p-1">{item.fridayWorkDays || '-'}</td>
                                    <td className="border border-black p-1">{item.holidayWorkDays || '-'}</td>
                                    <td className="border border-black p-1">{item.overtimeHours || '-'}</td>
                                    <td className="border border-black p-1 font-bold">{item.totalWorkedDays}</td>
                                    <td className="border border-black p-1">{item.notes}</td>
                                </tr>
                            ))}
                        </tbody>
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

export default AttendanceSummaryReport;
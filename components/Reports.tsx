import React, { useMemo } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { generateReport } from '../utils/reports';
import { exportReportToCSV } from '../utils/export';
import { JALALI_MONTHS, ICONS } from '../constants';
import AttendanceSummaryReport from './AttendanceSummaryReport';
import AttendanceListReport from './AttendanceListReport';
import IndividualReport from './IndividualReport';

const Reports: React.FC = () => {
    const { currentProjectId, selectedYear, selectedMonth, reportView, setReportView, selectedEmployeeIdForReport, setSelectedEmployeeIdForReport, setView } = useAppStore();
    const { getProjectData } = useEmployeeStore();
    const { getSettings } = useSettingsStore();
    const { companyInfo } = useCompanyStore();
    const { projectFinancials } = useFinancialStore();

    // Ensure we always have a valid project ID
    const projectId = currentProjectId || 'default';

    const { employees, attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);
    const financialData = projectFinancials[projectId] || {};

    const activeEmployees = useMemo(() => employees.filter(e => !e.isArchived), [employees]);

    const salaryReportData = useMemo(() => {
        if (activeEmployees.length === 0) return [];
        return generateReport(activeEmployees, attendance, settings, financialData, selectedYear, selectedMonth);
    }, [activeEmployees, attendance, settings, financialData, selectedYear, selectedMonth]);
    
    const handleExport = () => {
        exportReportToCSV(salaryReportData, companyInfo, projectId, selectedYear, selectedMonth);
    };

    const handleViewIndividualReport = (employeeId: string) => {
        setView('reports');
        setReportView('individual');
        setSelectedEmployeeIdForReport(employeeId);
    };
    
    const totalPayAllEmployees = salaryReportData.reduce((sum, item) => sum + item.totalPay, 0);

    const selectedEmployee = useMemo(() => {
        return activeEmployees.find(emp => emp.id === selectedEmployeeIdForReport);
    }, [activeEmployees, selectedEmployeeIdForReport]);

    if (!currentProjectId) {
         return <div className="text-center p-8 bg-white rounded-lg shadow">لطفاً ابتدا یک پروژه را از منوی بالا انتخاب کنید یا در صفحه تنظیمات یک پروژه جدید بسازید.</div>
    }
    
    const renderContent = () => {
        switch(reportView) {
            case 'salary':
                return (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">گزارش مبلغ حقوق - {JALALI_MONTHS[selectedMonth - 1]} {selectedYear}</h1>
                                <p className="text-gray-600">{companyInfo.companyName} - {companyInfo.projects.find(p => p.id === projectId)?.name}</p>
                            </div>
                            <button onClick={handleExport} className="btn btn-success no-print" disabled={salaryReportData.length === 0}>خروجی CSV</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-center">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 font-semibold">#</th>
                                        <th className="p-3 font-semibold text-right">نام کارمند</th>
                                        <th className="p-3 font-semibold">حقوق پایه</th>
                                        <th className="p-3 font-semibold">روزهای موثر</th>
                                        <th className="p-3 font-semibold">اضافه کاری</th>
                                        <th className="p-3 font-semibold">مساعده</th>
                                        <th className="p-3 font-semibold">پاداش</th>
                                        <th className="p-3 font-semibold">کسورات</th>
                                        <th className="p-3 font-semibold">حقوق قابل پرداخت (تومان)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaryReportData.map((item, index) => (
                                        <tr key={item.employeeId} className="border-t border-gray-200 hover:bg-gray-50">
                                            <td className="p-3">{index + 1}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleViewIndividualReport(item.employeeId)} className="link link-hover text-right">
                                                    {item.employeeName}
                                                </button>
                                            </td>
                                            <td className="p-3">{item.monthlySalary.toLocaleString('fa-IR')}</td>
                                            <td className="p-3 font-bold text-blue-600">{item.effectiveDays}</td>
                                            <td className="p-3 font-bold text-purple-600">{item.overtimeHours}</td>
                                            <td className="p-3 text-orange-600">{(item.advance || 0).toLocaleString('fa-IR')}</td>
                                            <td className="p-3 text-green-600">{(item.bonus || 0).toLocaleString('fa-IR')}</td>
                                            <td className="p-3 text-red-600">{(item.deduction || 0).toLocaleString('fa-IR')}</td>
                                            <td className="p-3 font-bold">{Math.round(item.totalPay).toLocaleString('fa-IR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-200 font-bold">
                                    <tr>
                                        <td colSpan={8} className="p-3 text-right">جمع کل پرداختی:</td>
                                        <td className="p-3">{Math.round(totalPayAllEmployees).toLocaleString('fa-IR')} تومان</td>
                                    </tr>
                                </tfoot>
                            </table>
                             {salaryReportData.length === 0 && (
                                <div className="text-center p-6 text-gray-500">هیچ کارمند فعالی برای نمایش گزارش حقوق در این ماه وجود ندارد.</div>
                            )}
                        </div>
                    </div>
                );
            case 'attendanceSummary':
                return <AttendanceSummaryReport employees={activeEmployees} attendance={attendance} settings={settings} projectId={projectId} />;
            case 'attendanceList':
                return <AttendanceListReport employees={activeEmployees} attendance={attendance} settings={settings} projectId={projectId} />;
            case 'individual':
                return <IndividualReport employee={selectedEmployee} employees={activeEmployees} projectId={projectId} />;
            default:
                return null;
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow no-print">
                 <div role="tablist" className="tabs tabs-boxed mb-4">
                    <a role="tab" className={`tab ${reportView === 'salary' ? 'tab-active' : ''}`} onClick={() => setReportView('salary')}>مبلغ حقوق</a> 
                    <a role="tab" className={`tab ${reportView === 'attendanceSummary' ? 'tab-active' : ''}`} onClick={() => setReportView('attendanceSummary')}>کارکرد کلی</a>
                    <a role="tab" className={`tab ${reportView === 'attendanceList' ? 'tab-active' : ''}`} onClick={() => setReportView('attendanceList')}>لیست کارکرد</a>
                    <a role="tab" className={`tab ${reportView === 'individual' ? 'tab-active' : ''}`} onClick={() => setReportView('individual')}>گزارش فردی</a>
                </div>
                 {reportView === 'individual' && (
                    <div className="form-control">
                        <select 
                            className="select select-bordered w-full max-w-xs"
                            value={selectedEmployeeIdForReport || ""}
                            onChange={(e) => setSelectedEmployeeIdForReport(e.target.value || null)}
                        >
                            <option value="">یک کارمند را انتخاب کنید</option>
                            {activeEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.lastName} {emp.firstName}</option>
                            ))}
                        </select>
                         {activeEmployees.length === 0 && <p className="text-sm text-gray-500 mt-2">هیچ کارمند فعالی برای انتخاب وجود ندارد.</p>}
                    </div>
                )}
            </div>
            
            {renderContent()}

        </div>
    );
};

export default Reports;

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { generateReport } from '../utils/reports';
import { exportReportToCSV } from '../utils/export';
import { formatCurrency } from '../utils/currency';
import { JALALI_MONTHS, ICONS } from '../constants';
import AttendanceSummaryReport from './AttendanceSummaryReport';
import AttendanceListReport from './AttendanceListReport';
import IndividualReport from './IndividualReport';

const Reports: React.FC = () => {
    const { currentProjectId, selectedYear, selectedMonth, reportView, setReportView, selectedEmployeeIdForReport, setSelectedEmployeeIdForReport, setView } = useAppStore();
    const { getProjectData } = useEmployeeStore();
    const { getSettings } = useSettingsStore();
    const { projects } = useCompanyStore();
    const { projectFinancials } = useFinancialStore();

    const projectId = currentProjectId || 'default';
    const currentProject = projects.find(p => p.id === projectId);

    const { employees, attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);
    const financialData = projectFinancials[projectId] || {};

    const activeEmployees = useMemo(() => employees.filter(e => !e.isArchived), [employees]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        return activeEmployees.filter(emp => 
            `${emp.lastName} ${emp.firstName}`.toLowerCase().includes(lowerCaseQuery)
        );
    }, [searchQuery, activeEmployees]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const salaryReportData = useMemo(() => {
        if (activeEmployees.length === 0) return [];
        return generateReport(activeEmployees, attendance, settings, financialData, selectedYear, selectedMonth);
    }, [activeEmployees, attendance, settings, financialData, selectedYear, selectedMonth]);
    
    const handleExport = () => {
        exportReportToCSV(salaryReportData, projects, projectId, selectedYear, selectedMonth);
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
                                <p className="text-gray-600">{currentProject?.companyName} - {currentProject?.name}</p>
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
                                        <th className="p-3 font-semibold">حقوق قابل پرداخت ({settings.currency === 'Rial' ? 'ریال' : 'تومان'})</th>
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
                                            <td className="p-3">{formatCurrency(item.monthlySalary, settings.currency)}</td>
                                            <td className="p-3 font-bold text-blue-600">{item.effectiveDays}</td>
                                            <td className="p-3 font-bold text-purple-600">{item.overtimeHours}</td>
                                            <td className="p-3 text-orange-600">{formatCurrency(item.advance, settings.currency)}</td>
                                            <td className="p-3 text-green-600">{formatCurrency(item.bonus, settings.currency)}</td>
                                            <td className="p-3 text-red-600">{formatCurrency(item.deduction, settings.currency)}</td>
                                            <td className="p-3 font-bold">{formatCurrency(item.totalPay, settings.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-200 font-bold">
                                    <tr>
                                        <td colSpan={8} className="p-3 text-right">جمع کل پرداختی:</td>
                                        <td className="p-3">{formatCurrency(totalPayAllEmployees, settings.currency, true)}</td>
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
                    <div ref={searchContainerRef} className="form-control relative w-full max-w-xs">
                        <input 
                            type="text"
                            className="input input-bordered w-full"
                            placeholder="جستجوی کارمند..."
                            value={isDropdownVisible ? searchQuery : (selectedEmployee ? `${selectedEmployee.lastName} ${selectedEmployee.firstName}` : searchQuery)}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!isDropdownVisible) setIsDropdownVisible(true);
                            }}
                            onFocus={() => {
                                setIsDropdownVisible(true);
                                setSearchQuery('');
                            }}
                        />
                        {isDropdownVisible && filteredEmployees.length > 0 && (
                            <ul className="absolute z-20 w-full mt-1 menu p-2 shadow bg-base-100 rounded-box max-h-60 overflow-y-auto">
                                {filteredEmployees.map(emp => (
                                    <li key={emp.id}>
                                        <a
                                            onClick={() => {
                                                setSelectedEmployeeIdForReport(emp.id);
                                                setSearchQuery('');
                                                setIsDropdownVisible(false);
                                            }}
                                        >
                                            {emp.lastName} {emp.firstName}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                         {activeEmployees.length === 0 && <p className="text-sm text-gray-500 mt-2">هیچ کارمند فعالی برای انتخاب وجود ندارد.</p>}
                    </div>
                )}
            </div>
            
            {renderContent()}

        </div>
    );
};

export default Reports;

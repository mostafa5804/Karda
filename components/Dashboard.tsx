import React, { useMemo, useEffect, useRef } from 'react';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { calculateAllDashboardData } from '../utils/dashboard';
import { JALALI_MONTHS } from '../constants';
import { getCurrentJalaliDate } from '../utils/calendar';

const StatCard: React.FC<{ title: string; value: string | number; description?: string, className?: string }> = ({ title, value, description, className }) => (
    <div className={`bg-white p-4 rounded-lg shadow-md flex flex-col justify-between ${className ?? ''}`}>
        <div>
            <h3 className="text-gray-500 font-semibold text-sm">{title}</h3>
            <p className="text-2xl lg:text-3xl font-bold text-gray-800 my-1">{value}</p>
        </div>
        {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
);

const Dashboard: React.FC = () => {
    const { currentProjectId, dashboardDateFilter, setDashboardDateFilter, selectedYear, selectedMonth } = useAppStore();
    const { getProjectData } = useEmployeeStore();
    const { getSettings } = useSettingsStore();
    const { projectFinancials } = useFinancialStore();
    const { companyInfo } = useCompanyStore();
    const salaryChartRef = useRef<HTMLCanvasElement>(null);
    const trendChartRef = useRef<HTMLCanvasElement>(null);

    const projectId = currentProjectId || 'default';
    const { employees, attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);
    const financialData = projectFinancials[projectId] || {};
    
    const allDashboardData = useMemo(() => {
        return calculateAllDashboardData(employees, attendance, settings, financialData, dashboardDateFilter);
    }, [employees, attendance, settings, financialData, dashboardDateFilter]);

    useEffect(() => {
        const chartCanvas = salaryChartRef.current;
        if (!chartCanvas) return;
        const existingChart = (window as any).salaryChartInstance;
        if(existingChart) existingChart.destroy();

        if (allDashboardData.salaryDistribution && allDashboardData.salaryDistribution.data.length > 0) {
            const ctx = chartCanvas.getContext('2d');
            if (ctx) {
                (window as any).salaryChartInstance = new (window as any).Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: allDashboardData.salaryDistribution.labels,
                        datasets: [{
                            data: allDashboardData.salaryDistribution.data,
                            backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (context.parsed !== null) {
                                            label += new Intl.NumberFormat('fa-IR').format(context.parsed) + ' تومان';
                                        }
                                        return `${context.label}: ${label}`;
                                    }
                                }
                            }
                        }
                    },
                });
            }
        }
    }, [allDashboardData.salaryDistribution]);
    
     useEffect(() => {
        const chartCanvas = trendChartRef.current;
        if (!chartCanvas) return;
        const existingChart = (window as any).trendChartInstance;
        if(existingChart) existingChart.destroy();

        if (allDashboardData.employeeTrend && allDashboardData.employeeTrend.data.length > 0) {
            const ctx = chartCanvas.getContext('2d');
            if (ctx) {
                (window as any).trendChartInstance = new (window as any).Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: allDashboardData.employeeTrend.labels,
                        datasets: [{
                            label: 'تعداد کارمندان فعال',
                            data: allDashboardData.employeeTrend.data,
                            fill: true,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1,
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                    }
                });
            }
        }
    }, [allDashboardData.employeeTrend]);
    
    const currentProject = companyInfo.projects.find(p => p.id === projectId);
    const [todayY, todayM, todayD] = getCurrentJalaliDate();

    if (!currentProjectId) {
        return <div className="text-center p-8 bg-white rounded-lg shadow">لطفاً ابتدا یک پروژه را از منوی بالا انتخاب کنید یا در صفحه تنظیمات یک پروژه جدید بسازید.</div>
    }

    const { dailyStats, monthlyStats, projectWideStats, salaryDistribution } = allDashboardData;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold text-gray-800">داشبورد پروژه: {currentProject?.name}</h1>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm">
                    <button onClick={() => setDashboardDateFilter({mode: 'all'})} className={`btn btn-sm ${dashboardDateFilter.mode === 'all' ? 'btn-primary' : 'btn-ghost'}`}>کل پروژه</button>
                    <button onClick={() => setDashboardDateFilter({mode: 'month', year: selectedYear, month: selectedMonth})} className={`btn btn-sm ${dashboardDateFilter.mode === 'month' ? 'btn-primary' : 'btn-ghost'}`}>
                        {JALALI_MONTHS[selectedMonth - 1]} {selectedYear}
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title={`خلاصه وضعیت امروز`} value={`${todayD} ${JALALI_MONTHS[todayM - 1]}`} className="col-span-2 md:col-span-4" />
                <StatCard title="کل فعال" value={dailyStats.total} />
                <StatCard title="حاضر" value={dailyStats.present} className="text-green-600" />
                <StatCard title="مرخصی" value={dailyStats.onLeave} className="text-yellow-600" />
                <StatCard title="غایب" value={dailyStats.absent} className="text-red-600" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                    {dashboardDateFilter.mode === 'all' ? 'آمار کلی پروژه (از ابتدا تا کنون)' : `آمار ماه ${JALALI_MONTHS[dashboardDateFilter.month! - 1]} ${dashboardDateFilter.year}`}
                </h2>
                {dashboardDateFilter.mode === 'all' && projectWideStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="جمع کل حقوق پرداختی" value={projectWideStats.totalSalaryPaid.toLocaleString('fa-IR')} description="تومان" />
                        <StatCard title="جمع کل روزهای کاری" value={projectWideStats.totalWorkDays.toLocaleString('fa-IR')} description="روز" />
                        <StatCard title="جمع کل اضافه کاری" value={projectWideStats.totalOvertimeHours.toLocaleString('fa-IR')} description="ساعت" />
                    </div>
                )}
                {dashboardDateFilter.mode === 'month' && monthlyStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="جمع کل پرداختی ماه" value={monthlyStats.totalPayForMonth.toLocaleString('fa-IR')} description="تومان" />
                        <StatCard title="جمع اضافه کاری ماه" value={monthlyStats.totalOvertimeHours} description="ساعت" />
                        <StatCard title="جمع غیبت‌های ماه" value={monthlyStats.totalAbsences} description="روز" />
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-semibold mb-4">روند تعداد کارمندان</h2>
                     <div className="h-64"><canvas ref={trendChartRef}></canvas></div>
                </div>
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">توزیع حقوق ماه</h2>
                     {salaryDistribution && salaryDistribution.data.length > 0 ? (
                        <div className="h-64"><canvas ref={salaryChartRef}></canvas></div>
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                           {dashboardDateFilter.mode === 'month' ? 'داده‌ای برای نمایش وجود ندارد.' : 'برای مشاهده نمودار، یک ماه خاص را انتخاب کنید.'}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Dashboard;

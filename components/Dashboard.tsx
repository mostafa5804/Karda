import React, { useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useCompanyStore } from '../stores/useCompanyStore';
import { useEmployeeStore } from '../stores/useEmployeeStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useFinancialStore } from '../stores/useFinancialStore';
import { generateFullDashboardData } from '../utils/dashboard';
import { JALALI_MONTHS } from '../constants';

const StatCard: React.FC<{ title: string; value: string | number; description?: string, className?: string }> = ({ title, value, description, className = '' }) => (
    <div className={`bg-white p-4 rounded-lg shadow-md ${className}`}>
        <h3 className="text-gray-500 text-sm font-medium truncate">{title}</h3>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        {description && <p className="text-gray-400 text-xs mt-1">{description}</p>}
    </div>
);

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm">{message}</p>
    </div>
);


const Dashboard: React.FC = () => {
    const { currentProjectId, selectedYear, selectedMonth } = useAppStore();
    const { getProjectData } = useEmployeeStore();
    const { getSettings } = useSettingsStore();
    const { projectFinancials } = useFinancialStore();
    const { companyInfo } = useCompanyStore();

    const projectId = currentProjectId || 'default';
    const { employees, attendance } = getProjectData(projectId);
    const settings = getSettings(projectId);
    const financialData = projectFinancials[projectId] || {};
    
    const currentProjectName = companyInfo.projects.find(p => p.id === projectId)?.name || 'پروژه اصلی';
    const monthName = JALALI_MONTHS[selectedMonth - 1];

    const dashboardData = useMemo(() => {
        return generateFullDashboardData(employees, attendance, settings, financialData, selectedYear, selectedMonth);
    }, [employees, attendance, settings, financialData, selectedYear, selectedMonth]);

    const salaryChartRef = useRef<HTMLCanvasElement>(null);
    const trendChartRef = useRef<HTMLCanvasElement>(null);
    const salaryChartInstance = useRef<any>(null); // Using any for Chart.js instance from script tag
    const trendChartInstance = useRef<any>(null);

    // Effect for Salary Distribution Chart
    useEffect(() => {
        if (salaryChartInstance.current) {
            salaryChartInstance.current.destroy();
        }
        if (salaryChartRef.current && dashboardData.salaryDistribution.length > 0) {
            const ctx = salaryChartRef.current.getContext('2d');
            if (!ctx) return;
            salaryChartInstance.current = new (window as any).Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: dashboardData.salaryDistribution.map(d => d.employeeName),
                    datasets: [{
                        data: dashboardData.salaryDistribution.map(d => d.totalPay),
                        backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            bodyFont: { family: 'Vazirmatn' },
                            titleFont: { family: 'Vazirmatn' },
                            callbacks: {
                                label: (context: any) => {
                                    const value = context.parsed;
                                    const formattedValue = new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
                                    return `${context.label}: ${formattedValue}`;
                                }
                            }
                        }
                    }
                }
            });
        }
        return () => {
            salaryChartInstance.current?.destroy();
        };
    }, [dashboardData.salaryDistribution]);

    // Effect for Employee Trend Chart
    useEffect(() => {
        if (trendChartInstance.current) {
            trendChartInstance.current.destroy();
        }
        if (trendChartRef.current && dashboardData.employeeTrend.length > 0) {
            const ctx = trendChartRef.current.getContext('2d');
            if (!ctx) return;
            trendChartInstance.current = new (window as any).Chart(ctx, {
                type: 'line',
                data: {
                    labels: dashboardData.employeeTrend.map(d => d.label),
                    datasets: [{
                        label: 'تعداد کارمندان',
                        data: dashboardData.employeeTrend.map(d => d.count),
                        fill: true,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            bodyFont: { family: 'Vazirmatn' },
                            titleFont: { family: 'Vazirmatn' },
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }
        return () => {
             trendChartInstance.current?.destroy();
        };
    }, [dashboardData.employeeTrend]);

    if (!currentProjectId) {
         return (
            <div className="text-center p-8 bg-white rounded-lg shadow h-full flex flex-col justify-center items-center">
                <h2 className="text-2xl font-bold mb-4">به کارمند یار خوش آمدید!</h2>
                <p>برای شروع، لطفاً یک پروژه از منوی بالا انتخاب کنید یا در صفحه تنظیمات یک پروژه جدید بسازید.</p>
            </div>
         )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">داشبورد پروژه "{currentProjectName}"</h1>

            {/* Section 1: Daily Stats */}
            <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">خلاصه وضعیت امروز</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="کل فعال" value={dashboardData.dailyStats.totalActive} />
                    <StatCard title="حاضر" value={dashboardData.dailyStats.present} className="text-green-600"/>
                    <StatCard title="مرخصی" value={dashboardData.dailyStats.onLeave} className="text-yellow-600"/>
                    <StatCard title="غایب" value={dashboardData.dailyStats.absent} className="text-red-600"/>
                </div>
            </div>

            {/* Section 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold mb-4">توزیع حقوق ({monthName} {selectedYear})</h3>
                    <div className="relative h-64 md:h-80">
                         {dashboardData.salaryDistribution.length > 0 ? (
                            <canvas ref={salaryChartRef}></canvas>
                         ) : (
                            <EmptyState title="نمودار حقوق" message="اطلاعاتی برای نمایش در این ماه وجود ندارد." />
                         )}
                    </div>
                </div>
                <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-bold mb-4">روند تعداد کارمندان</h3>
                     <div className="relative h-64 md:h-80">
                        {dashboardData.employeeTrend.length > 0 ? (
                            <canvas ref={trendChartRef}></canvas>
                        ) : (
                            <EmptyState title="روند کارمندان" message="هیچ سابقه‌ای برای نمایش روند وجود ندارد." />
                        )}
                    </div>
                </div>
            </div>

            {/* Section 3: Overall Stats */}
            <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">آمار کلی پروژه (از ابتدا)</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard 
                        title="کل حقوق پرداختی" 
                        value={`${dashboardData.overallStats.totalSalaryPaid.toLocaleString('fa-IR')}`}
                        description="تومان"
                    />
                    <StatCard 
                        title="کل روزهای کاری" 
                        value={dashboardData.overallStats.totalWorkDays.toLocaleString('fa-IR')}
                        description="مجموع روزهای کاری ثبت شده"
                    />
                    <StatCard 
                        title="کل اضافه کاری" 
                        value={dashboardData.overallStats.totalOvertimeHours.toLocaleString('fa-IR')}
                        description="ساعت"
                    />
                 </div>
            </div>
        </div>
    );
};

export default Dashboard;
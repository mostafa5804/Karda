import { ReportData } from "./reports";
import { Project } from "../types";
import { JALALI_MONTHS } from "../constants";

export const exportReportToCSV = (
    reportData: ReportData[],
    projects: Project[],
    currentProjectId: string | null,
    year: number,
    month: number
) => {
    const headers = [
        'نام کارمند',
        'نرخ روزانه',
        'روزهای موثر',
        'روزهای غیبت',
        'روزهای مرخصی',
        'اضافه کاری (ساعت)',
        'جمع کل حقوق'
    ];
    
    const rows = reportData.map(item => [
        `"${item.employeeName}"`,
        Math.round(item.dailyRate),
        item.effectiveDays,
        item.absentDays,
        item.leaveDays,
        item.overtimeHours,
        Math.round(item.totalPay)
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for UTF-8 Excel compatibility
    csvContent += headers.join(',') + '\r\n';
    
    rows.forEach(rowArray => {
        const row = rowArray.join(',');
        csvContent += row + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const currentProject = projects.find(p => p.id === currentProjectId);
    const projectName = currentProject ? currentProject.name : 'پروژه';
    const fileName = `گزارش-حقوق-${projectName}-${JALALI_MONTHS[month - 1]}-${year}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
};

import * as XLSX from 'xlsx';
// FIX: Import 'Employee' and 'EmployeeAttendance' types to resolve missing type errors.
import { ParsedExcelRow, Attendance, Employee, EmployeeAttendance } from '../types';
import { getDaysInJalaliMonth, getFormattedDate } from './calendar';

// Type assertion for XLSX since it's loaded via script tag
declare var XLSX: any;

const normalizeHeader = (key: string) => key.trim()
    .replace(/ي/g, 'ی') // Arabic Yeh to Persian Yeh
    .replace(/ك/g, 'ک') // Arabic Kaf to Persian Kaf
    .toLowerCase()
    .replace(/\s+/g, '');

export const importUnifiedDataFromExcel = (file: File, year: number, month: number): Promise<ParsedExcelRow[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                const daysInMonth = getDaysInJalaliMonth(year, month);

                const employees = json.map((row, index) => {
                    const normalizedRow = Object.keys(row).reduce((acc, key) => {
                        acc[normalizeHeader(key)] = row[key];
                        return acc;
                    }, {} as any);

                    const lastName = normalizedRow['نامخانوادگی'];
                    const firstName = normalizedRow['نام'];
                    const position = normalizedRow['سمت'];
                    const salaryValue = normalizedRow['حقوقماهانه'];

                    // Heuristic to skip empty rows that xlsx parser might pick up
                    if (!lastName && !firstName && !position && (salaryValue === undefined || salaryValue === null || String(salaryValue).trim() === '')) {
                        return null;
                    }

                    let monthlySalary: number = NaN;
                    if (salaryValue !== undefined && salaryValue !== null) {
                        const salaryString = String(salaryValue)
                            .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))) // Persian/Arabic to Western digits
                            .replace(/[^0-9.]/g, ''); // Remove anything not a digit or dot
                        if (salaryString) {
                            monthlySalary = parseFloat(salaryString);
                        }
                    }
                    
                    const missingOrInvalidFields = [];
                    if (!lastName) missingOrInvalidFields.push('نام خانوادگی');
                    if (!firstName) missingOrInvalidFields.push('نام');
                    if (!position) missingOrInvalidFields.push('سمت');
                    if (isNaN(monthlySalary)) missingOrInvalidFields.push('حقوق ماهانه');

                    if (missingOrInvalidFields.length > 0) {
                        throw new Error(`ردیف ${index + 2}: فیلد(های) ${missingOrInvalidFields.map(f => `"${f}"`).join(', ')} اجباری است یا مقدار نامعتبر دارد.`);
                    }
                    
                    const attendance: Attendance = {};
                    for (let day = 1; day <= daysInMonth; day++) {
                        const dayKey = String(day);
                        const value = normalizedRow[dayKey];
                        if (value !== undefined && value !== null && String(value).trim() !== '') {
                            const date = getFormattedDate(year, month, day);
                            attendance[date] = String(value);
                        }
                    }

                    return { lastName, firstName, position, monthlySalary, attendance };
                }).filter(Boolean) as ParsedExcelRow[];
                
                resolve(employees);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'یک خطای ناشناخته در پردازش فایل رخ داد.';
                reject(new Error(message));
            }
        };
        reader.onerror = () => reject(new Error('خطا در خواندن فایل.'));
        reader.readAsArrayBuffer(file);
    });
};

export const exportUnifiedDataToExcel = (employees: Employee[], attendance: EmployeeAttendance, year: number, month: number, projectName: string) => {
    const daysInMonth = getDaysInJalaliMonth(year, month);
    const headers = ['نام خانوادگی', 'نام', 'سمت', 'حقوق ماهانه', ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    
    const activeEmployees = employees.filter(e => !e.isArchived);

    const data = activeEmployees.map(emp => {
        const row: (string | number)[] = [emp.lastName, emp.firstName, emp.position, emp.monthlySalary];
        const empAttendance = attendance[emp.id] || {};
        for(let day = 1; day <= daysInMonth; day++) {
            const date = getFormattedDate(year, month, day);
            row.push(empAttendance[date] || '');
        }
        return row;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'لیست کارکرد');

    const fileName = `خروجی-کامل-${projectName}-${year}-${month}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};

export const downloadUnifiedTemplate = (year: number, month: number) => {
    const daysInMonth = getDaysInJalaliMonth(year, month);
    const headers = ['نام خانوادگی', 'نام', 'سمت', 'حقوق ماهانه', ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    const exampleRow: (string | number)[] = ['رضایی', 'علی', 'کارشناس', 10000000, ...Array(daysInMonth).fill('')];
    exampleRow[4] = 10;
    exampleRow[5] = 10;
    exampleRow[6] = 'غ';
    exampleRow[7] = 'م';


    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب ورود اطلاعات');

    XLSX.writeFile(workbook, `قالب-ورود-اطلاعات-${year}-${month}.xlsx`);
};
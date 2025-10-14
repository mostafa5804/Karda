// A correct and standard implementation for Jalali calendar conversions.
// This is based on a widely-used algorithm to ensure accuracy
// and resolve previous issues with incorrect date calculations.

function toJalaali(g_y: number, g_m: number, g_d: number): { jy: number, jm: number, jd: number } {
    const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

    const gy = g_y - 1600;
    const gm = g_m - 1;
    const gd = g_d - 1;

    let g_day_no = 365 * gy + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);

    for (let i = 0; i < gm; ++i)
        g_day_no += g_days_in_month[i];
    if (gm > 1 && ((gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0)))
        g_day_no++;
    g_day_no += gd;

    let j_day_no = g_day_no - 79;

    const j_np = Math.floor(j_day_no / 12053);
    j_day_no %= 12053;

    let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);

    j_day_no %= 1461;

    if (j_day_no >= 366) {
        jy += Math.floor((j_day_no - 1) / 365);
        j_day_no = (j_day_no - 1) % 365;
    }

    let i = 0;
    for (; i < 11 && j_day_no >= j_days_in_month[i]; ++i)
        j_day_no -= j_days_in_month[i];
    const jm = i + 1;
    const jd = j_day_no + 1;

    return { jy, jm, jd };
}


function toGregorian(j_y: number, j_m: number, j_d: number): { gy: number, gm: number, gd: number } {
    const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

    const jy = j_y - 979;
    const jm = j_m - 1;
    const jd = j_d - 1;

    let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
    for (let i = 0; i < jm; ++i)
        j_day_no += j_days_in_month[i];

    j_day_no += jd;

    let g_day_no = j_day_no + 79;

    let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
    g_day_no = g_day_no % 146097;

    let leap = true;
    if (g_day_no >= 36525) {
        g_day_no--;
        gy += 100 * Math.floor(g_day_no / 36524);
        g_day_no = g_day_no % 36524;

        if (g_day_no >= 365)
            g_day_no++;
        else
            leap = false;
    }

    gy += 4 * Math.floor(g_day_no / 1461);
    g_day_no %= 1461;

    if (g_day_no >= 366) {
        leap = false;
        g_day_no--;
        gy += Math.floor(g_day_no / 365);
        g_day_no = g_day_no % 365;
    }
    
    let i = 0;
    for (; g_day_no >= g_days_in_month[i] + (i == 1 && leap ? 1 : 0); i++)
        g_day_no -= g_days_in_month[i] + (i == 1 && leap ? 1 : 0);
    const gm = i + 1;
    const gd = g_day_no + 1;

    return { gy, gm, gd };
}

export const isJalaliLeap = (year: number): boolean => {
    // A highly accurate approximation for leap years in the Jalali calendar.
    const r = (year - 474) % 2820;
    return (((r + 474 + 38) * 682) % 2816) < 682;
};

export const getDaysInJalaliMonth = (year: number, month: number): number => {
    if (month < 1 || month > 12) return 0;
    if (month < 7) return 31;
    if (month < 12) return 30;
    return isJalaliLeap(year) ? 30 : 29;
};

export const getCurrentJalaliDate = (): [number, number, number] => {
    const now = new Date();
    const { jy, jm, jd } = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return [jy, jm, jd];
};

export const getFirstDayOfMonthJalali = (year: number, month: number): number => {
    // Convert the first day of the Jalali month to Gregorian to find its day of the week.
    const { gy, gm, gd } = toGregorian(year, month, 1);
    // Use the local Date object to get the day of the week in the user's timezone.
    const date = new Date(gy, gm - 1, gd);
    // Adjust for Jalali week starting on Saturday (Shambe).
    // JavaScript's getDay(): Sunday=0, Monday=1, ..., Saturday=6.
    // We want: Saturday=0, Sunday=1, ..., Friday=6.
    return (date.getDay() + 1) % 7;
};

export const getFormattedDate = (year: number, month: number, day: number): string => {
    const y = String(year);
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const isValidJalaliDateString = (dateString: string): boolean => {
    // Check format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const [year, month, day] = dateString.split('-').map(Number);
    
    // Check for reasonable year/month values
    if (year < 1300 || year > 1500) return false;
    if (month < 1 || month > 12) return false;

    // Check if the day is valid for the given month and year
    if (day < 1 || day > getDaysInJalaliMonth(year, month)) return false;

    return true;
};
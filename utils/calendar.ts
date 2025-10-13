// A simplified set of functions for Jalali calendar calculations.
// This avoids needing an external library.

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * (Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * (Math.floor(days / 1461));
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
    let gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4);
    if (jm < 7) {
        days += (jm - 1) * 31;
    } else {
        days += ((jm - 7) * 30) + 186;
    }
    days += jd;
    gy += 400 * (Math.floor(days / 146097));
    days %= 146097;
    if (days > 36524) {
        days--;
        gy += 100 * (Math.floor(days / 36524));
        days %= 36524;
        if (days >= 365) days++;
    }
    gy += 4 * (Math.floor(days / 1461));
    days %= 1461;
    if (days > 365) {
        gy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let gd = days + 1;
    const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm;
    for (gm = 0; gm < 13; gm++) {
        const v = sal_a[gm];
        if (gd <= v) break;
        gd -= v;
    }
    return [gy, gm, gd];
}

const isJalaliLeap = (year: number): boolean => {
    // A simplified leap year calculation for Jalali calendar
    const r = year % 33;
    return [1, 5, 9, 13, 17, 22, 26, 30].includes(r);
};

export const getDaysInJalaliMonth = (year: number, month: number): number => {
    if (month >= 1 && month <= 6) {
        return 31;
    } else if (month >= 7 && month <= 11) {
        return 30;
    } else if (month === 12) {
        return isJalaliLeap(year) ? 30 : 29;
    }
    return 0;
};

export const getCurrentJalaliDate = (): [number, number, number] => {
    const now = new Date();
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

export const getFirstDayOfMonthJalali = (year: number, month: number): number => {
    const [gy, gm, gd] = jalaliToGregorian(year, month, 1);
    const date = new Date(gy, gm - 1, gd);
    // Jalali week starts on Saturday. JS getDay() has Sunday as 0.
    // (date.getDay() + 1) % 7 maps Saturday (6) -> 0, Sunday (0) -> 1, ..., Friday (5) -> 6.
    return (date.getDay() + 1) % 7;
};

export const getFormattedDate = (year: number, month: number, day: number): string => {
    const y = String(year);
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

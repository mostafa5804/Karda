import { Settings } from "../types";

export const formatCurrency = (
    value: number | undefined | null,
    currency: Settings['currency'] | undefined,
    withSymbol: boolean = false
): string => {
    if (value === undefined || value === null) {
        return '0';
    }

    const effectiveCurrency = currency || 'Toman';
    const numberToFormat = effectiveCurrency === 'Rial' ? value * 10 : value;
    
    const formattedNumber = Math.round(numberToFormat).toLocaleString('fa-IR');

    if (withSymbol) {
        return `${formattedNumber} ${effectiveCurrency === 'Rial' ? 'ریال' : 'تومان'}`;
    }

    return formattedNumber;
};

export function getContrastingTextColor(hexcolor: string): string {
    if (!hexcolor || typeof hexcolor !== 'string') return '#000000';
    
    hexcolor = hexcolor.replace('#', '');
    if (hexcolor.length === 3) {
        hexcolor = hexcolor.split('').map(char => char + char).join('');
    }

    if (hexcolor.length !== 6) {
        return '#000000'; // Return black for invalid hex
    }

    const r = parseInt(hexcolor.substring(0, 2), 16);
    const g = parseInt(hexcolor.substring(2, 4), 16);
    const b = parseInt(hexcolor.substring(4, 6), 16);
    
    // Formula for calculating luminance (YIQ)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

/**
 * Formats a number into a pretty scientific notation using Unicode superscripts.
 * e.g., 1.2 x 10³ or 5.4 x 10⁻²
 */
export const formatScientific = (value) => {
  if (value === 0 || Math.abs(value) < 1e-10) return '0';

  const absVal = Math.abs(value);
  
  // Use scientific notation for very large or very small numbers
  if (absVal >= 1e6 || absVal < 0.01) {
    const exponent = Math.floor(Math.log10(absVal));
    const base = value / Math.pow(10, exponent);
    
    // Map digits to Unicode superscripts
    const superscripts = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', 
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻'
    };
    
    const expStr = String(exponent).split('').map(char => superscripts[char] || char).join('');
    
    // Use the mathematical multiplication symbol (×)
    return `${base.toFixed(1)} × 10${expStr}`;
  }

  // Regular rounding for human-readable scales
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
};

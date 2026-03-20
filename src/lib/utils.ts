import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency?: string, locale: string = 'en-US') {
  const effectiveCurrency = (currency && typeof currency === 'string' && currency.trim() !== '') ? currency : 'USD';
  try {
    // Use specific locale for certain currencies for better symbol display
    let effectiveLocale = locale;
    if (effectiveCurrency === 'UGX') effectiveLocale = 'en-UG';
    else if (effectiveCurrency === 'NGN') effectiveLocale = 'en-NG';
    else if (effectiveCurrency === 'KES') effectiveLocale = 'en-KE';
    else if (effectiveCurrency === 'GHS') effectiveLocale = 'en-GH';
    else if (effectiveCurrency === 'ZAR') effectiveLocale = 'en-ZA';

    return new Intl.NumberFormat(effectiveLocale, {
      style: 'currency',
      currency: effectiveCurrency,
      minimumFractionDigits: effectiveCurrency === 'UGX' ? 0 : 2,
      maximumFractionDigits: effectiveCurrency === 'UGX' ? 0 : 2,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}

export function getCurrencySymbol(currency?: string) {
  const effectiveCurrency = (currency && typeof currency === 'string' && currency.trim() !== '') ? currency : 'USD';
  switch (effectiveCurrency) {
    case 'NGN': return '₦';
    case 'GBP': return '£';
    case 'EUR': return '€';
    case 'UGX': return 'USh';
    case 'KES': return 'KSh';
    case 'ZAR': return 'R';
    case 'GHS': return 'GH₵';
    default: return '$';
  }
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

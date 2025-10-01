import { useAuth } from '@/hooks/useAuth';

// --- Formatting Functions ---

export const formatDate = (date: Date, format: string = 'DD/MM/YYYY'): string => {
  if (!date) return '';
  if (date && typeof (date as any).toDate === 'function') {
    date = (date as any).toDate();
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const monthShort = date.toLocaleString('default', { month: 'short' });
  const weekdayShort = date.toLocaleString('default', { weekday: 'short' });

  return format
    .replace(/DD/g, day)
    .replace(/MM/g, month)
    .replace(/YYYY/g, year)
    .replace(/MMM/g, monthShort)
    .replace(/ddd/g, weekdayShort);
};

export const formatTime = (date: Date, format: string = '12-hour'): string => {
  if (!date) return '';
  if (date && typeof (date as any).toDate === 'function') {
    date = (date as any).toDate();
  }
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (format === '12-hour') {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } else {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
};

export const formatCurrency = (amount: number, currencyCode: string = 'USD'): string => {
    const symbols: { [key: string]: string } = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
    const symbol = symbols[currencyCode] || '$';
    return `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDateTime = (date: Date, dateFormat?: string, timeFormat?: string): string => {
  if (!date) return '';
  if (date && typeof (date as any).toDate === 'function') {
    date = (date as any).toDate();
  }
  return `${formatDate(date, dateFormat)} ${formatTime(date, timeFormat)}`;
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(h.toString());
  parts.push(m.toString().padStart(2, '0'));
  parts.push(s.toString().padStart(2, '0'));
  return parts.join(':');
};



// --- Formatting Hook ---

export const useFormatting = () => {
  const { user } = useAuth();

  const dateFormat = user?.hospitalDateFormat || 'DD/MM/YYYY';
  const timeFormat = user?.hospitalTimeFormat || '12-hour';
  const currency = user?.hospitalCurrency || 'USD';

  const formatDateWrapper = (date: Date) => formatDate(date, dateFormat);
  const formatTimeWrapper = (date: Date) => formatTime(date, timeFormat);
  const formatCurrencyWrapper = (amount: number) => formatCurrency(amount, currency);
  const formatDateTimeWrapper = (date: Date) => formatDateTime(date, dateFormat, timeFormat);
  const formatDurationWrapper = (seconds: number) => formatDuration(seconds);

  return {
    formatDate: formatDateWrapper,
    formatTime: formatTimeWrapper,
    formatCurrency: formatCurrencyWrapper,
    formatDateTime: formatDateTimeWrapper,
    formatDuration: formatDurationWrapper,
    dateFormat,
    timeFormat,
    currency,
  };
};
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  addDays,
  getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';

export const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const parseDateFromISO = (isoStr: string): Date => {
  return parseISO(isoStr);
};

export const formatDateLong = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'EEEE, d MMMM yyyy', { locale: es });
};

export const formatDateShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM yyyy', { locale: es });
};

export const formatDateNumeric = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: es });
};

export const getMinDateStr = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getMaxDateStr = (daysAhead = 30): string => {
  return format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
};

export const getDayOfWeek = (date: Date | string): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return getDay(d);
};

export const startOfDayDate = (date: Date): Date => {
  return startOfDay(date);
};

export const endOfDayDate = (date: Date): Date => {
  return endOfDay(date);
};

export const addDaysToDate = (date: Date, days: number): Date => {
  return addDays(date, days);
};

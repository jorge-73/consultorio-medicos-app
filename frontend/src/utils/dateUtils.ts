import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  addDays,
  getDay,
} from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';

export const TZ_ARgentina = 'America/Argentina/Buenos_Aires';

export const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return toZonedTime(new Date(year, month - 1, day, 12, 0, 0, 0), TZ_ARgentina);
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

export const toArgentinaTime = (date: Date): Date => {
  return toZonedTime(date, TZ_ARgentina);
};

export const fromArgentinaTime = (date: Date): Date => {
  return fromZonedTime(date, TZ_ARgentina);
};

export const formatDateInArgentina = (date: Date | string, formatStr: string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, TZ_ARgentina, formatStr, { locale: es });
};

export const formatDateForCalendar = (date: Date): string => {
  return formatInTimeZone(date, TZ_ARgentina, 'yyyy-MM-dd');
};

export const getNowInArgentina = (): Date => {
  return toArgentinaTime(new Date());
};

export const formatFullDateLong = (dateStr: string): string => {
  const parsed = parseDate(dateStr);
  return formatInTimeZone(parsed, TZ_ARgentina, 'EEEE d MMMM yyyy', { locale: es });
};

export const formatTimeOnly = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':');
  const date = new Date(2000, 0, 1, parseInt(hours), parseInt(minutes));
  return format(date, 'HH:mm');
};

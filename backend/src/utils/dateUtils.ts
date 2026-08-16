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

export const formatTime = (timeStr: string): string => {
  return timeStr;
};

export const getMinDateStr = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const getMaxDateStr = (daysAhead = 30): string => {
  return format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
};

export const getDayOfWeek = (date: Date): number => {
  return getDay(date);
};

export const startOfDayDate = (date: Date): Date => {
  return startOfDay(date);
};

export const endOfDayDate = (date: Date): Date => {
  return endOfDay(date);
};

export const APPOINTMENT_DURATION_MINUTES = 30;

export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  durationMinutes = APPOINTMENT_DURATION_MINUTES
): string[] => {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const endTotalMins = endHour * 60 + endMin;
  const startTotalMins = startHour * 60 + startMin;

  for (let mins = startTotalMins; mins < endTotalMins; mins += durationMinutes) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }

  return slots;
};

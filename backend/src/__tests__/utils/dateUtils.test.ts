import { describe, it, expect } from 'vitest';
import {
  parseDate,
  parseDateFromISO,
  formatDateLong,
  formatDateShort,
  formatDateNumeric,
  formatTime,
  getMinDateStr,
  getMaxDateStr,
  getDayOfWeek,
  startOfDayDate,
  endOfDayDate,
  generateTimeSlots,
} from '../../utils/dateUtils';

describe('dateUtils', () => {
  describe('parseDate', () => {
    it('should parse YYYY-MM-DD format correctly', () => {
      const result = parseDate('2026-05-10');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(4);
      expect(result.getDate()).toBe(10);
    });

    it('should set time to noon', () => {
      const result = parseDate('2026-05-10');
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(0);
    });

    it('should handle single digit month and day', () => {
      const result = parseDate('2026-01-05');
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(5);
    });
  });

  describe('parseDateFromISO', () => {
    it('should parse ISO date string', () => {
      const result = parseDateFromISO('2026-05-10T14:30:00');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(4);
      expect(result.getDate()).toBe(10);
    });
  });

  describe('formatDateLong', () => {
    it('should format date to long Spanish format', () => {
      const date = new Date(2026, 4, 10);
      const result = formatDateLong(date);
      expect(result).toContain('2026');
    });

    it('should handle string date input', () => {
      const result = formatDateLong('2026-05-10');
      expect(result).toBeTruthy();
    });
  });

  describe('formatDateShort', () => {
    it('should format date to short Spanish format', () => {
      const result = formatDateShort('2026-05-10');
      expect(result).toBeTruthy();
      expect(result).toContain('2026');
    });
  });

  describe('formatDateNumeric', () => {
    it('should format date to dd/MM/yyyy format', () => {
      const result = formatDateNumeric('2026-05-10');
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  describe('formatTime', () => {
    it('should return time string as-is', () => {
      expect(formatTime('09:30')).toBe('09:30');
    });
  });

  describe('getMinDateStr', () => {
    it('should return today in YYYY-MM-DD format', () => {
      const result = getMinDateStr();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const today = new Date().toISOString().split('T')[0];
      expect(result).toContain(today.split('-')[0]);
    });
  });

  describe('getMaxDateStr', () => {
    it('should return date N days ahead in YYYY-MM-DD format', () => {
      const result = getMaxDateStr(30);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should use default 30 days when no argument', () => {
      const result = getMaxDateStr();
      const expected = new Date();
      expected.setDate(expected.getDate() + 30);
      expect(result.split('-')[0]).toBe(String(expected.getFullYear()));
    });
  });

  describe('getDayOfWeek', () => {
    it('should return correct day of week number', () => {
      const sunday = new Date(2026, 4, 3);
      expect(getDayOfWeek(sunday)).toBe(0);

      const monday = new Date(2026, 4, 4);
      expect(getDayOfWeek(monday)).toBe(1);

      const saturday = new Date(2026, 4, 9);
      expect(getDayOfWeek(saturday)).toBe(6);
    });
  });

  describe('startOfDayDate', () => {
    it('should return date at start of day', () => {
      const date = new Date(2026, 4, 10, 15, 30, 45);
      const result = startOfDayDate(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('endOfDayDate', () => {
    it('should return date at end of day', () => {
      const date = new Date(2026, 4, 10, 15, 30, 45);
      const result = endOfDayDate(date);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });
  });

  describe('generateTimeSlots', () => {
    it('should generate 30-minute slots by default', () => {
      const slots = generateTimeSlots('09:00', '10:00');
      expect(slots).toEqual(['09:00', '09:30']);
      expect(slots.length).toBe(2);
    });

    it('should generate correct slots for longer window', () => {
      const slots = generateTimeSlots('09:00', '12:00');
      expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']);
      expect(slots.length).toBe(6);
    });

    it('should generate 15-minute slots when specified', () => {
      const slots = generateTimeSlots('09:00', '10:00', 15);
      expect(slots).toEqual(['09:00', '09:15', '09:30', '09:45']);
      expect(slots.length).toBe(4);
    });

    it('should return empty array when start equals end', () => {
      const slots = generateTimeSlots('09:00', '09:00');
      expect(slots).toEqual([]);
    });

    it('should handle single slot', () => {
      const slots = generateTimeSlots('09:00', '09:30');
      expect(slots).toEqual(['09:00']);
    });

    it('should pad single digit hours and minutes', () => {
      const slots = generateTimeSlots('08:05', '09:35');
      expect(slots).toEqual(['08:05', '08:35', '09:05']);
    });

    it('should handle end at 17:00', () => {
      const slots = generateTimeSlots('09:00', '17:00');
      expect(slots.length).toBe(16);
      expect(slots[0]).toBe('09:00');
      expect(slots[slots.length - 1]).toBe('16:30');
    });

    it('should return empty for start after end', () => {
      const slots = generateTimeSlots('17:00', '09:00');
      expect(slots).toEqual([]);
    });
  });
});

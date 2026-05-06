import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appointmentService } from '../services/appointmentService.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { scheduleRepository } from '../repositories/scheduleRepository.js';
import { doctorRepository } from '../repositories/doctorRepository.js';

vi.mock('../config/database.js', () => ({}));

vi.mock('../repositories/appointmentRepository.js', () => ({
  appointmentRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByPatient: vi.fn(),
    findByDoctor: vi.fn(),
    findAll: vi.fn(),
    findByDoctorAndDate: vi.fn(),
    checkConflict: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('../repositories/scheduleRepository.js', () => ({
  scheduleRepository: {
    findByDay: vi.fn(),
  },
}));

vi.mock('../repositories/doctorRepository.js', () => ({
  doctorRepository: {
    findById: vi.fn(),
  },
}));

describe('Appointment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should throw error if doctor not found', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue(null);

      await expect(
        appointmentService.create({
          patientId: 1,
          doctorId: 999,
          date: new Date(),
          startTime: '09:00',
          endTime: '10:00',
        })
      ).rejects.toThrow('Doctor not found');
    });

    it('should throw error if doctor is not active', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({
        id: 1,
        userId: 1,
        specialty: 'Cardiology',
        licenseNum: '12345',
        isActive: false,
        user: {} as any,
      } as any);

      await expect(
        appointmentService.create({
          patientId: 1,
          doctorId: 1,
          date: new Date(),
          startTime: '09:00',
          endTime: '10:00',
        })
      ).rejects.toThrow('Doctor is not active');
    });

    it('should throw error if no schedule for day', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({
        id: 1,
        userId: 1,
        specialty: 'Cardiology',
        licenseNum: '12345',
        isActive: true,
        user: {} as any,
      } as any);
      vi.mocked(scheduleRepository.findByDay).mockResolvedValue([]);

      await expect(
        appointmentService.create({
          patientId: 1,
          doctorId: 1,
          date: new Date('2024-01-01'),
          startTime: '09:00',
          endTime: '10:00',
        })
      ).rejects.toThrow('Doctor not available on this day');
    });

    it('should throw error if time slot is booked', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({
        id: 1,
        userId: 1,
        specialty: 'Cardiology',
        licenseNum: '12345',
        isActive: true,
        user: {} as any,
      } as any);
      vi.mocked(scheduleRepository.findByDay).mockResolvedValue([
        { id: 1, doctorId: 1, dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
      ]);
      vi.mocked(appointmentRepository.checkConflict).mockResolvedValue(true);

      await expect(
        appointmentService.create({
          patientId: 1,
          doctorId: 1,
          date: new Date('2024-01-01'),
          startTime: '09:00',
          endTime: '10:00',
        })
      ).rejects.toThrow('Time slot is already booked');
    });
  });

  describe('getAvailableSlots', () => {
    it('should return empty array if no schedule', async () => {
      vi.mocked(doctorRepository.findById).mockResolvedValue({
        id: 1,
        userId: 1,
        specialty: 'Cardiology',
        licenseNum: '12345',
        isActive: true,
        user: {} as any,
      } as any);
      vi.mocked(scheduleRepository.findByDay).mockResolvedValue([]);

      const slots = await appointmentService.getAvailableSlots(1, new Date());

      expect(slots).toEqual([]);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  appointmentRepo: {
    create: vi.fn(),
    findById: vi.fn(),
    findByDoctorAndDate: vi.fn(),
    updateStatus: vi.fn(),
  },
  scheduleRepo: {
    findByDay: vi.fn(),
    findById: vi.fn(),
    deleteManyByDoctorId: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  doctorRepo: {
    findById: vi.fn(),
  },
  prisma: {
    $transaction: vi.fn(),
    user: { findUnique: vi.fn() },
  },
  emailService: {
    sendAppointmentCreation: vi.fn(),
    sendAppointmentCancellation: vi.fn(),
    sendAppointmentConfirmation: vi.fn(),
  },
}));

vi.mock('../../config/database.js', () => ({ default: mocks.prisma }));
vi.mock('../../repositories/appointmentRepository.js', () => ({ appointmentRepository: mocks.appointmentRepo }));
vi.mock('../../repositories/scheduleRepository.js', () => ({ scheduleRepository: mocks.scheduleRepo }));
vi.mock('../../repositories/doctorRepository.js', () => ({ doctorRepository: mocks.doctorRepo }));
vi.mock('../../services/emailService.js', () => ({ emailService: mocks.emailService }));

import { appointmentService } from '../../services/appointmentService.js';
import { doctorService } from '../../services/doctorService.js';
import { AppointmentStatus } from '@prisma/client';

const futureDate = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const pastDate = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

const doctor = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  userId: 2,
  specialty: 'Cardiología',
  licenseNum: 'LIC-1',
  isActive: true,
  user: { id: 2, name: 'Dr. Test', email: 'dr@test.com' },
  ...overrides,
});

const schedule = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  doctorId: 1,
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '12:00',
  isActive: true,
  ...overrides,
});

const appointment = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  patientId: 10,
  doctorId: 1,
  date: futureDate(),
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.PENDING,
  ...overrides,
});

const expectAppError = async (promise: Promise<unknown>, status: number, message: string) => {
  await expect(promise).rejects.toMatchObject({ statusCode: status, message });
};

const patientActor = { id: 10, role: 'PATIENT' };
const doctorActor = { id: 2, role: 'DOCTOR', doctorId: 1 };
const adminActor = { id: 99, role: 'ADMIN' };

describe('appointmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.doctorRepo.findById.mockResolvedValue(doctor());
    mocks.scheduleRepo.findByDay.mockResolvedValue([schedule()]);
    mocks.appointmentRepo.findByDoctorAndDate.mockResolvedValue([]);
    mocks.appointmentRepo.create.mockResolvedValue(appointment());
    mocks.appointmentRepo.updateStatus.mockResolvedValue(appointment());
    mocks.prisma.user.findUnique.mockResolvedValue({ email: 'p@test.com', name: 'Paciente' });
    mocks.prisma.$transaction.mockImplementation(async (fn: () => Promise<unknown>) => fn());
    mocks.emailService.sendAppointmentCreation.mockResolvedValue(true);
    mocks.emailService.sendAppointmentCancellation.mockResolvedValue(true);
    mocks.emailService.sendAppointmentConfirmation.mockResolvedValue(true);
  });

  describe('create', () => {
    const data = { patientId: 10, doctorId: 1, date: futureDate(), startTime: '09:00', endTime: '09:30' };

    it('rejects when doctor does not exist', async () => {
      mocks.doctorRepo.findById.mockResolvedValue(null);
      await expectAppError(appointmentService.create(data), 404, 'Doctor not found');
    });

    it('rejects when doctor is inactive', async () => {
      mocks.doctorRepo.findById.mockResolvedValue(doctor({ isActive: false }));
      await expectAppError(appointmentService.create(data), 400, 'Doctor is not active');
    });

    it('rejects past dates', async () => {
      await expectAppError(appointmentService.create({ ...data, date: pastDate() }), 400, 'Cannot book appointments in the past');
    });

    it('rejects when doctor has no schedule that day', async () => {
      mocks.scheduleRepo.findByDay.mockResolvedValue([]);
      await expectAppError(appointmentService.create(data), 400, 'Doctor not available on this day');
    });

    it('rejects times outside the doctor schedule', async () => {
      await expectAppError(
        appointmentService.create({ ...data, startTime: '12:00', endTime: '12:30' }),
        400,
        'Appointment time is outside the doctor schedule'
      );
    });

    it('rejects start times not aligned to the 30-minute grid', async () => {
      await expectAppError(
        appointmentService.create({ ...data, startTime: '09:15', endTime: '09:45' }),
        400,
        'Appointments must start at 30-minute intervals'
      );
    });

    it('rejects when end time is before or equal to start time', async () => {
      await expectAppError(
        appointmentService.create({ ...data, startTime: '10:00', endTime: '10:00' }),
        400,
        'End time must be after start time'
      );
    });

    it('rejects when the slot is already booked', async () => {
      mocks.appointmentRepo.findByDoctorAndDate.mockResolvedValue([
        appointment({ startTime: '09:00', endTime: '10:00' }),
      ]);
      await expectAppError(appointmentService.create(data), 400, 'Time slot is already booked');
    });

    it('rejects with booked message when the unique constraint fires (race condition)', async () => {
      mocks.appointmentRepo.create.mockRejectedValueOnce({ code: 'P2002' });
      await expectAppError(appointmentService.create(data), 400, 'Time slot is already booked');
    });

    it('creates the appointment and sends the creation email', async () => {
      const result = await appointmentService.create({ ...data, notes: 'consulta' });
      expect(mocks.appointmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 10, doctorId: 1, startTime: '09:00', endTime: '09:30', notes: 'consulta' })
      );
      expect(mocks.emailService.sendAppointmentCreation).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ id: 1 });
    });
  });

  describe('getById', () => {
    it('rejects when appointment does not exist', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(null);
      await expectAppError(appointmentService.getById(1, patientActor), 404, 'Appointment not found');
    });

    it('allows the owning patient', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment());
      const result = await appointmentService.getById(1, patientActor);
      expect(result.id).toBe(1);
    });

    it('rejects a non-owning patient (IDOR)', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment());
      await expectAppError(appointmentService.getById(1, { id: 11, role: 'PATIENT' }), 403, 'Not authorized to modify this appointment');
    });

    it('rejects a doctor that does not own the appointment (IDOR)', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment({ doctorId: 5 }));
      await expectAppError(appointmentService.getById(1, doctorActor), 403, 'Not authorized to modify this appointment');
    });

    it('allows the owning doctor', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment());
      const result = await appointmentService.getById(1, doctorActor);
      expect(result.id).toBe(1);
    });

    it('allows admins', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment());
      const result = await appointmentService.getById(1, adminActor);
      expect(result.id).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('rejects when appointment does not exist', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(null);
      await expectAppError(appointmentService.updateStatus(1, AppointmentStatus.CANCELLED, patientActor), 404, 'Appointment not found');
    });

    it('rejects patients changing status other than CANCELLED', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment());
      await expectAppError(
        appointmentService.updateStatus(1, AppointmentStatus.CONFIRMED, patientActor),
        403,
        'Patients can only cancel their own appointments'
      );
    });

    it('rejects a patient canceling someone else appointment', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment({ patientId: 11 }));
      await expectAppError(
        appointmentService.updateStatus(1, AppointmentStatus.CANCELLED, patientActor),
        403,
        'Not authorized to modify this appointment'
      );
    });

    it('allows a patient canceling their own appointment', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment());
      mocks.appointmentRepo.updateStatus.mockResolvedValue(appointment({ status: AppointmentStatus.CANCELLED }));
      const result = await appointmentService.updateStatus(1, AppointmentStatus.CANCELLED, patientActor);
      expect(mocks.appointmentRepo.updateStatus).toHaveBeenCalledWith(1, AppointmentStatus.CANCELLED);
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('rejects a doctor modifying another doctor appointment', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment({ doctorId: 9 }));
      await expectAppError(
        appointmentService.updateStatus(1, AppointmentStatus.CONFIRMED, doctorActor),
        403,
        'Not authorized to modify this appointment'
      );
    });

    it('allows a doctor confirming their own appointment', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment());
      const result = await appointmentService.updateStatus(1, AppointmentStatus.CONFIRMED, doctorActor);
      expect(result.status).toBe(AppointmentStatus.PENDING);
    });

    it('allows admins to set any status', async () => {
      mocks.appointmentRepo.findById.mockResolvedValue(appointment());
      const result = await appointmentService.updateStatus(1, AppointmentStatus.COMPLETED, adminActor);
      expect(result.status).toBe(AppointmentStatus.PENDING);
    });
  });

  describe('getAvailableSlots', () => {
    it('returns empty when the doctor has no schedule that day', async () => {
      mocks.scheduleRepo.findByDay.mockResolvedValue([]);
      const slots = await appointmentService.getAvailableSlots(1, futureDate());
      expect(slots).toEqual([]);
    });

    it('excludes booked slots', async () => {
      mocks.scheduleRepo.findByDay.mockResolvedValue([schedule({ startTime: '09:00', endTime: '10:00' })]);
      mocks.appointmentRepo.findByDoctorAndDate.mockResolvedValue([
        appointment({ startTime: '09:00', endTime: '09:30' }),
      ]);
      const slots = await appointmentService.getAvailableSlots(1, futureDate());
      expect(slots).toEqual(['09:30']);
    });
  });
});

describe('doctorService', () => {
  const schedules = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.doctorRepo.findById.mockResolvedValue(doctor());
    mocks.scheduleRepo.findById.mockResolvedValue(schedule());
    mocks.scheduleRepo.deleteManyByDoctorId.mockResolvedValue({ count: 0 });
    mocks.scheduleRepo.create.mockImplementation(async (d: unknown) => ({ id: 1, ...(d as object) }));
    mocks.prisma.$transaction.mockImplementation(async (fn: () => Promise<unknown>) => fn());
  });

  describe('setSchedules', () => {
    it('rejects a doctor managing another doctor schedule (IDOR)', async () => {
      await expectAppError(
        doctorService.setSchedules(7, schedules, doctorActor),
        403,
        'Forbidden - You can only manage your own schedule'
      );
    });

    it('rejects when doctor does not exist', async () => {
      mocks.doctorRepo.findById.mockResolvedValue(null);
      await expectAppError(doctorService.setSchedules(1, schedules, adminActor), 404, 'Doctor not found');
    });

    it('rejects duplicate days', async () => {
      await expectAppError(
        doctorService.setSchedules(1, [schedules[0], schedules[0]], adminActor),
        400,
        'Duplicate day in schedule'
      );
    });

    it('rejects start time after end time', async () => {
      await expectAppError(
        doctorService.setSchedules(1, [{ dayOfWeek: 1, startTime: '12:00', endTime: '09:00' }], adminActor),
        400,
        'Start time must be before end time'
      );
    });

    it('replaces all schedules inside a transaction', async () => {
      const result = await doctorService.setSchedules(1, schedules, adminActor);
      expect(mocks.prisma.$transaction).toHaveBeenCalledOnce();
      expect(mocks.scheduleRepo.deleteManyByDoctorId).toHaveBeenCalledWith(1);
      expect(mocks.scheduleRepo.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });

  describe('removeSchedule', () => {
    it('rejects when schedule does not exist', async () => {
      mocks.scheduleRepo.findById.mockResolvedValue(null);
      await expectAppError(doctorService.removeSchedule(1, doctorActor), 404, 'Schedule not found');
    });

    it('rejects a doctor removing another doctor schedule (IDOR)', async () => {
      mocks.scheduleRepo.findById.mockResolvedValue(schedule({ doctorId: 7 }));
      await expectAppError(
        doctorService.removeSchedule(1, doctorActor),
        403,
        'Forbidden - You can only manage your own schedule'
      );
    });

    it('deletes the schedule when authorized', async () => {
      mocks.scheduleRepo.delete.mockResolvedValue(schedule());
      const result = await doctorService.removeSchedule(1, doctorActor);
      expect(mocks.scheduleRepo.delete).toHaveBeenCalledWith(1);
      expect(result).toBeTruthy();
    });
  });
});
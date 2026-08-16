import { doctorRepository } from '../repositories/doctorRepository.js';
import { scheduleRepository } from '../repositories/scheduleRepository.js';
import { AppError } from '../middleware/error.js';
import prisma from '../config/database.js';

interface CreateDoctorData {
  userId: number;
  specialty: string;
  licenseNum: string;
  description?: string;
}

interface ScheduleData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface DoctorActor {
  id: number;
  role: string;
  doctorId?: number;
}

const assertCanManageDoctor = (doctorId: number, actor?: DoctorActor) => {
  if (actor && actor.role === 'DOCTOR' && actor.doctorId !== doctorId) {
    throw new AppError('Forbidden - You can only manage your own schedule', 403);
  }
};

export const doctorService = {
  async create(data: CreateDoctorData) {
    const existingByUser = await doctorRepository.findByUserId(data.userId);
    if (existingByUser) {
      throw new AppError('User already has a doctor profile', 400);
    }

    const existingByLicense = await doctorRepository.findByLicense(data.licenseNum);
    if (existingByLicense) {
      throw new AppError('License number already registered', 400);
    }

    return doctorRepository.create(data);
  },

  async getAll(includeInactive = false) {
    return doctorRepository.findAll(includeInactive);
  },

  async getById(id: number) {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }
    return doctor;
  },

  async getByUserId(userId: number) {
    const doctor = await doctorRepository.findByUserId(userId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }
    return doctor;
  },

  async update(id: number, data: { specialty?: string; description?: string; isActive?: boolean }) {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }
    return doctorRepository.update(id, data);
  },

  async delete(id: number) {
    const doctor = await doctorRepository.findById(id);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }
    return doctorRepository.delete(id);
  },

  async getSchedules(doctorId: number) {
    return scheduleRepository.findByDoctorId(doctorId);
  },

  async setSchedules(doctorId: number, schedules: ScheduleData[], actor?: DoctorActor) {
    assertCanManageDoctor(doctorId, actor);

    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const seenDays = new Set<number>();
    for (const s of schedules) {
      if (seenDays.has(s.dayOfWeek)) {
        throw new AppError('Duplicate day in schedule', 400);
      }
      seenDays.add(s.dayOfWeek);

      if (s.startTime >= s.endTime) {
        throw new AppError('Start time must be before end time', 400);
      }
    }

    return prisma.$transaction(async () => {
      await scheduleRepository.deleteManyByDoctorId(doctorId);
      return Promise.all(
        schedules.map((s) => scheduleRepository.create({ doctorId, ...s }))
      );
    });
  },

  async addSchedule(doctorId: number, data: ScheduleData) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    if (data.startTime >= data.endTime) {
      throw new AppError('Start time must be before end time', 400);
    }

    const existing = await scheduleRepository.findByDay(doctorId, data.dayOfWeek);
    if (existing.length > 0) {
      throw new AppError('Schedule already exists for this day', 400);
    }

    return scheduleRepository.create({ doctorId, ...data });
  },

  async removeSchedule(scheduleId: number, actor?: DoctorActor) {
    const schedule = await scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new AppError('Schedule not found', 404);
    }

    assertCanManageDoctor(schedule.doctorId, actor);

    return scheduleRepository.delete(scheduleId);
  },
};
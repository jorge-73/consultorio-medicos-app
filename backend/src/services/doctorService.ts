import { doctorRepository } from '../repositories/doctorRepository.js';
import { scheduleRepository } from '../repositories/scheduleRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../middleware/error.js';

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

  async setSchedules(doctorId: number, schedules: ScheduleData[]) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    await scheduleRepository.deleteManyByDoctorId(doctorId);

    const createdSchedules = await Promise.all(
      schedules.map((s) => scheduleRepository.create({ doctorId, ...s }))
    );

    return createdSchedules;
  },

  async addSchedule(doctorId: number, data: ScheduleData) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }
    return scheduleRepository.create({ doctorId, ...data });
  },

  async removeSchedule(scheduleId: number) {
    return scheduleRepository.delete(scheduleId);
  },
};
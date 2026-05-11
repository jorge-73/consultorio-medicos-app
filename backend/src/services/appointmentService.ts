import { AppointmentStatus } from '@prisma/client';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { scheduleRepository } from '../repositories/scheduleRepository.js';
import { doctorRepository } from '../repositories/doctorRepository.js';
import { AppError } from '../middleware/error.js';
import { emailService } from './emailService.js';
import { parseDate, generateTimeSlots, getDayOfWeek, startOfDayDate, endOfDayDate, formatDateShort } from '../utils/dateUtils.js';
import prisma from '../config/database.js';

interface CreateAppointmentData {
  patientId: number;
  doctorId: number;
  date: Date;
  startTime: string;
  endTime: string;
  notes?: string;
}

export const appointmentService = {
  async create(data: CreateAppointmentData) {
    const doctor = await doctorRepository.findById(data.doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    if (!doctor.isActive) {
      throw new AppError('Doctor is not active', 400);
    }

    const schedule = await scheduleRepository.findByDay(data.doctorId, getDayOfWeek(data.date));
    if (schedule.length === 0) {
      throw new AppError('Doctor not available on this day', 400);
    }

    const appointments = await appointmentRepository.findByDoctorAndDate(
      data.doctorId,
      data.date
    );
    const hasConflict = appointments.some(
      (a) => data.startTime < a.endTime && data.endTime > a.startTime
    );
    if (hasConflict) {
      throw new AppError('Time slot is already booked', 400);
    }

    if (data.startTime >= data.endTime) {
      throw new AppError('End time must be after start time', 400);
    }

    const appointment = await appointmentRepository.create(data);

    const patient = await prisma.user.findUnique({ where: { id: data.patientId } });
    const doctorData = await doctorRepository.findById(data.doctorId);

    if (patient && doctorData) {
      const dateStr = formatDateShort(data.date);
      emailService.sendAppointmentCreation(
        patient.email,
        patient.name,
        doctorData.user.name,
        dateStr,
        data.startTime
      );
    }

    return appointment;
  },

  async getById(id: number) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }
    return appointment;
  },

  async getByPatient(patientId: number) {
    return appointmentRepository.findByPatient(patientId);
  },

  async getByDoctor(doctorId: number, startDate?: Date, endDate?: Date) {
    return appointmentRepository.findByDoctor(doctorId, startDate, endDate);
  },

  async getAll(startDate?: Date, endDate?: Date) {
    return appointmentRepository.findAll(startDate, endDate);
  },

  async getByDoctorAndDate(doctorId: number, date: Date) {
    return appointmentRepository.findByDoctorAndDate(doctorId, date);
  },

  async getAvailableSlots(doctorId: number, date: Date) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const daySchedules = await scheduleRepository.findByDay(doctorId, getDayOfWeek(date));
    if (daySchedules.length === 0) {
      return [];
    }

    const appointments = await appointmentRepository.findByDoctorAndDate(doctorId, date);

    const availableSlots: string[] = [];

    for (const schedule of daySchedules) {
      const slots = generateTimeSlots(schedule.startTime, schedule.endTime);
      for (const slot of slots) {
        const slotEndMins = (() => {
          const [h, m] = slot.split(':').map(Number);
          return h * 60 + m + 30;
        })();
        const isBooked = appointments.some((a) => {
          const [ah, am] = a.startTime.split(':').map(Number);
          const [aeh, aem] = a.endTime.split(':').map(Number);
          const aptStart = ah * 60 + am;
          const aptEnd = aeh * 60 + aem;
          return slotEndMins > aptStart && slotEndMins <= aptEnd;
        });
        if (!isBooked) {
          availableSlots.push(slot);
        }
      }
    }

    return availableSlots;
  },

  async updateStatus(id: number, status: AppointmentStatus, userId: number, userRole: string) {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (userRole !== 'ADMIN' && userRole !== 'DOCTOR') {
      if (appointment.patientId !== userId) {
        throw new AppError('Not authorized to modify this appointment', 403);
      }
    }

    if (userRole === 'DOCTOR' && appointment.doctorId !== userId) {
      throw new AppError('Not authorized to modify this appointment', 403);
    }

    return appointmentRepository.updateStatus(id, status);
  },

  async cancel(id: number, userId: number, userRole: string) {
    const appointment = await appointmentRepository.findById(id);
    const updated = await this.updateStatus(id, AppointmentStatus.CANCELLED, userId, userRole);

    if (appointment && updated) {
      const patient = await prisma.user.findUnique({ where: { id: appointment.patientId } });
      const doctorData = await doctorRepository.findById(appointment.doctorId);

      if (patient && doctorData) {
        const dateStr = formatDateShort(appointment.date);
        emailService.sendAppointmentCancellation(
          patient.email,
          patient.name,
          doctorData.user.name,
          dateStr,
          appointment.startTime
        );
      }
    }

    return updated;
  },

  async confirm(id: number, userId: number, userRole: string) {
    const appointment = await appointmentRepository.findById(id);
    const updated = await this.updateStatus(id, AppointmentStatus.CONFIRMED, userId, userRole);

    if (appointment && updated) {
      const patient = await prisma.user.findUnique({ where: { id: appointment.patientId } });
      const doctorData = await doctorRepository.findById(appointment.doctorId);

      if (patient && doctorData) {
        const dateStr = formatDateShort(appointment.date);
        emailService.sendAppointmentConfirmation(
          patient.email,
          patient.name,
          doctorData.user.name,
          dateStr,
          appointment.startTime
        );
      }
    }

    return updated;
  },

  async complete(id: number, userId: number, userRole: string) {
    return this.updateStatus(id, AppointmentStatus.COMPLETED, userId, userRole);
  },
};
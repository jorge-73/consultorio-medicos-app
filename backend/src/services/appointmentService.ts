import { AppointmentStatus } from '@prisma/client';
import { appointmentRepository } from '../repositories/appointmentRepository.js';
import { scheduleRepository } from '../repositories/scheduleRepository.js';
import { doctorRepository } from '../repositories/doctorRepository.js';
import { AppError } from '../middleware/error.js';
import { emailService } from './emailService.js';
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

    const schedule = await scheduleRepository.findByDay(data.doctorId, data.date.getDay());
    if (schedule.length === 0) {
      throw new AppError('Doctor not available on this day', 400);
    }

    const hasConflict = await appointmentRepository.checkConflict(
      data.doctorId,
      data.date,
      data.startTime,
      data.endTime
    );
    if (hasConflict) {
      throw new AppError('Time slot is already booked', 400);
    }

    const appointment = await appointmentRepository.create(data);

    const patient = await prisma.user.findUnique({ where: { id: data.patientId } });
    const doctorData = await doctorRepository.findById(data.doctorId);
    
    if (patient && doctorData) {
      const dateStr = data.date.toLocaleDateString('es-ES');
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

    const daySchedules = await scheduleRepository.findByDay(doctorId, date.getDay());
    if (daySchedules.length === 0) {
      return [];
    }

    const appointments = await appointmentRepository.findByDoctorAndDate(doctorId, date);

    const allSlots: string[] = [];
    const slotDuration = 30;

    for (const schedule of daySchedules) {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);

      let currentHour = startHour;
      let currentMin = startMin;

      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
        allSlots.push(timeString);

        currentMin += slotDuration;
        if (currentMin >= 60) {
          currentHour += 1;
          currentMin = currentMin % 60;
        }
      }
    }

    const bookedSlots = appointments.map((a) => a.startTime);
    const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));

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
        const dateStr = new Date(appointment.date).toLocaleDateString('es-ES');
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
        const dateStr = new Date(appointment.date).toLocaleDateString('es-ES');
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
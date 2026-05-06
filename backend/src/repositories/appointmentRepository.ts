import prisma from '../config/database.js';
import { AppointmentStatus } from '@prisma/client';

export const appointmentRepository = {
  async create(data: {
    patientId: number;
    doctorId: number;
    date: Date;
    startTime: string;
    endTime: string;
    notes?: string;
  }) {
    return prisma.appointment.create({
      data,
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true } },
        doctor: { include: { user: { select: { name: true } } } },
      },
    });
  },

  async findById(id: number) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true } },
        doctor: {
          include: { user: { select: { name: true } }, schedules: false },
        },
      },
    });
  },

  async findByDoctorAndDate(doctorId: number, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { not: AppointmentStatus.CANCELLED },
      },
      orderBy: { startTime: 'asc' },
    });
  },

  async findByPatient(patientId: number) {
    return prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
    });
  },

  async findByDoctor(doctorId: number, startDate?: Date, endDate?: Date) {
    const where: any = { doctorId };
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    }
    return prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true } },
        doctor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { date: 'asc' },
    });
  },

  async findAll(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    }
    return prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, email: true, phone: true } },
        doctor: { include: { user: { select: { name: true } }, schedules: false } },
      },
      orderBy: { date: 'asc' },
    });
  },

  async updateStatus(id: number, status: AppointmentStatus) {
    return prisma.appointment.update({
      where: { id },
      data: { status },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { include: { user: { select: { name: true } } } },
      },
    });
  },

  async update(id: number, data: { date?: Date; startTime?: string; endTime?: string; notes?: string }) {
    return prisma.appointment.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { include: { user: { select: { name: true } } } },
      },
    });
  },

  async checkConflict(doctorId: number, date: Date, startTime: string, endTime: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { not: AppointmentStatus.CANCELLED },
      },
    });

    for (const apt of appointments) {
      if (startTime < apt.endTime && endTime > apt.startTime) {
        return true;
      }
    }
    return false;
  },
};
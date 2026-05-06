import prisma from '../config/database.js';

export const scheduleRepository = {
  async create(data: { doctorId: number; dayOfWeek: number; startTime: string; endTime: string }) {
    return prisma.schedule.create({ data });
  },

  async findByDoctorId(doctorId: number) {
    return prisma.schedule.findMany({
      where: { doctorId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
    });
  },

  async findByDay(doctorId: number, dayOfWeek: number) {
    return prisma.schedule.findMany({
      where: { doctorId, dayOfWeek, isActive: true },
    });
  },

  async update(id: number, data: { dayOfWeek?: number; startTime?: string; endTime?: string; isActive?: boolean }) {
    return prisma.schedule.update({ where: { id }, data });
  },

  async delete(id: number) {
    return prisma.schedule.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async deleteManyByDoctorId(doctorId: number) {
    return prisma.schedule.updateMany({
      where: { doctorId },
      data: { isActive: false },
    });
  },
};
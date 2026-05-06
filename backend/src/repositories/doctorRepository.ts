import prisma from '../config/database.js';

export const doctorRepository = {
  async create(data: { userId: number; specialty: string; licenseNum: string; description?: string }) {
    return prisma.doctor.create({
      data,
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
      },
    });
  },

  async findById(id: number) {
    return prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
        schedules: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
      },
    });
  },

  async findByUserId(userId: number) {
    return prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
        schedules: { where: { isActive: true } },
      },
    });
  },

  async findAll(includeInactive = false) {
    return prisma.doctor.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
      },
      orderBy: { specialty: 'asc' },
    });
  },

  async update(id: number, data: { specialty?: string; description?: string; isActive?: boolean }) {
    return prisma.doctor.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
      },
    });
  },

  async delete(id: number) {
    return prisma.doctor.update({
      where: { id },
      data: { isActive: false },
    });
  },

  async findByLicense(licenseNum: string) {
    return prisma.doctor.findUnique({ where: { licenseNum } });
  },
};
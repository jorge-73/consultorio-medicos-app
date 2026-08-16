import prisma from '../config/database.js';
import { Role } from '@prisma/client';

export interface UserSelect {
  id?: boolean;
  email?: boolean;
  name?: boolean;
  role?: boolean;
  phone?: boolean;
  password?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
}

const defaultSelect: UserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
};

export const userRepository = {
  async create(data: { email: string; password: string; name: string; role: Role; phone?: string }) {
    return prisma.user.create({ data });
  },

  async findById(id: number, select: UserSelect = defaultSelect) {
    return prisma.user.findUnique({ where: { id }, select });
  },

  async findByEmail(email: string, select: UserSelect = defaultSelect) {
    return prisma.user.findUnique({ where: { email }, select });
  },

  async findAll(select: UserSelect = defaultSelect, orderBy: 'name' | 'createdAt' = 'name') {
    return prisma.user.findMany({
      select,
      orderBy: orderBy === 'createdAt' ? { createdAt: 'desc' } : { name: 'asc' },
    });
  },

  async update(id: number, data: { name?: string; phone?: string; password?: string }) {
    return prisma.user.update({ where: { id }, data, select: defaultSelect });
  },

  async delete(id: number) {
    return prisma.user.delete({ where: { id } });
  },
};
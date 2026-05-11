import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/database.js';
import { AppError } from '../middleware/error.js';

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: Role;
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  async register(data: RegisterData) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) {
        throw new AppError('Email already registered', 400);
      }

      const hashedPassword = await bcrypt.hash(data.password, 12);

      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: data.role,
          phone: data.phone,
        },
      });

      if (data.role === Role.DOCTOR) {
        await prisma.doctor.create({
          data: {
            userId: user.id,
            specialty: 'Medicina General',
            licenseNum: `DOC-${user.id}`,
            isActive: true,
          },
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' } as SignOptions
      );

      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('Email already registered', 400);
      }
      throw error;
    }
  },

  async login(data: LoginData) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' } as SignOptions
    );

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    };
  },

  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  },

  async updateProfile(userId: number, data: { name?: string; phone?: string }) {
    const user = await prisma.user.update({ where: { id: userId }, data });
    return user;
  },

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    return { message: 'Password updated successfully' };
  },

  async getPatients() {
    const patients = await prisma.user.findMany({
      where: { role: Role.PATIENT },
      orderBy: { createdAt: 'desc' },
    });
    return patients;
  },
};
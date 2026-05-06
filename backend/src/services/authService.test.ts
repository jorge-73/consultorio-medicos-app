import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../services/authService.js';
import prisma from '../config/database.js';

vi.mock('../config/database.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should throw error if email already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'PATIENT' as any,
      });

      await expect(
        authService.register({
          email: 'test@test.com',
          password: 'password123',
          name: 'Test',
          role: 'PATIENT' as any,
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should create user with hashed password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 1,
        email: 'new@test.com',
        password: 'hashed',
        name: 'New User',
        role: 'PATIENT' as any,
      });

      const result = await authService.register({
        email: 'new@test.com',
        password: 'password123',
        name: 'New User',
        role: 'PATIENT' as any,
      });

      expect(result).toHaveProperty('token');
      expect(result.user).toMatchObject({
        id: 1,
        email: 'new@test.com',
        name: 'New User',
        role: 'PATIENT',
      });
    });
  });

  describe('login', () => {
    it('should throw error if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        authService.login({ email: 'notfound@test.com', password: 'password' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should return token on successful login', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: '$2a$12$hashedpassword',
        name: 'Test User',
        role: 'PATIENT' as any,
      });

      const result = await authService.login({
        email: 'test@test.com',
        password: 'password',
      });

      expect(result).toHaveProperty('token');
      expect(result.user).toMatchObject({
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
      });
    });
  });

  describe('getProfile', () => {
    it('should return user by id', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: 'hashed',
        name: 'Test',
        role: 'PATIENT' as any,
      });

      const result = await authService.getProfile(1);

      expect(result).toMatchObject({
        id: 1,
        email: 'test@test.com',
      });
    });

    it('should throw error if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(authService.getProfile(999)).rejects.toThrow('User not found');
    });
  });
});
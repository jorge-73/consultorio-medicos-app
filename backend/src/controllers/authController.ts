import { Router, Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { authService } from '../services/authService.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum([Role.PATIENT, Role.DOCTOR]).default(Role.PATIENT),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

router.get('/profile', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await authService.getProfile(req.user!.id);
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

router.put('/profile', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, phone } = req.body;
    const user = await authService.updateProfile(req.user!.id, { name, phone });
    res.json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
});

router.put('/password', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user!.id, oldPassword, newPassword);
    res.json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

router.get('/patients', authenticate, authorize(Role.ADMIN), async (req: AuthRequest, res: Response, next) => {
  try {
    const patients = await authService.getPatients();
    res.json({ success: true, data: patients });
  } catch (error: any) {
    next(error);
  }
});

export default router;
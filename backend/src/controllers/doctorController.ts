import { Router, Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { doctorService } from '../services/doctorService.js';

const router = Router();

const createDoctorSchema = z.object({
  userId: z.number(),
  specialty: z.string().min(2),
  licenseNum: z.string().min(2),
  description: z.string().optional(),
});

const scheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

const updateDoctorSchema = z.object({
  specialty: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.post('/', authenticate, authorize(Role.ADMIN), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createDoctorSchema.parse(req.body);
    const doctor = await doctorService.create(data);
    res.status(201).json({ success: true, data: doctor });
  } catch (error: any) {
    next(error);
  }
});

router.get('/', async (_req, res: Response, next) => {
  try {
    const doctors = await doctorService.getAll();
    res.json({ success: true, data: doctors });
  } catch (error: any) {
    next(error);
  }
});

router.get('/:id', async (req, res: Response, next) => {
  try {
    const doctor = await doctorService.getById(Number(req.params.id));
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    next(error);
  }
});

router.put('/:id', authenticate, authorize(Role.ADMIN), async (req: AuthRequest, res: Response, next) => {
  try {
    const data = updateDoctorSchema.parse(req.body);
    const doctor = await doctorService.update(Number(req.params.id), data);
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize(Role.ADMIN), async (req: AuthRequest, res: Response, next) => {
  try {
    await doctorService.delete(Number(req.params.id));
    res.json({ success: true, message: 'Doctor deleted successfully' });
  } catch (error: any) {
    next(error);
  }
});

router.get('/:id/schedules', async (req, res: Response, next) => {
  try {
    const schedules = await doctorService.getSchedules(Number(req.params.id));
    res.json({ success: true, data: schedules });
  } catch (error: any) {
    next(error);
  }
});

router.post('/:id/schedules', authenticate, authorize(Role.ADMIN, Role.DOCTOR), async (req: AuthRequest, res: Response, next) => {
  try {
    const schedules = z.array(scheduleSchema).parse(req.body);
    const result = await doctorService.setSchedules(Number(req.params.id), schedules);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    next(error);
  }
});

router.delete('/schedules/:scheduleId', authenticate, authorize(Role.ADMIN, Role.DOCTOR), async (req: AuthRequest, res: Response, next) => {
  try {
    await doctorService.removeSchedule(Number(req.params.scheduleId));
    res.json({ success: true, message: 'Schedule removed successfully' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
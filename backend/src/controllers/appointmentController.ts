import { Router, Response } from 'express';
import { z } from 'zod';
import { AppointmentStatus, Role } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { appointmentService } from '../services/appointmentService.js';
import { parseDate } from '../utils/dateUtils.js';

const router = Router();

const createAppointmentSchema = z.object({
  doctorId: z.number(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createAppointmentSchema.parse(req.body);
    const appointment = await appointmentService.create({
      ...data,
      date: parseDate(data.date),
      patientId: req.user!.id,
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (error: any) {
    next(error);
  }
});

router.get('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { startDate, endDate } = req.query;
    let appointments;

    if (req.user!.role === Role.ADMIN) {
      appointments = await appointmentService.getAll(
        startDate ? parseDate(startDate as string) : undefined,
        endDate ? parseDate(endDate as string) : undefined
      );
    } else if (req.user!.role === Role.DOCTOR) {
      appointments = await appointmentService.getByDoctor(
        req.user!.id,
        startDate ? parseDate(startDate as string) : undefined,
        endDate ? parseDate(endDate as string) : undefined
      );
    } else {
      appointments = await appointmentService.getByPatient(req.user!.id);
    }

    res.json({ success: true, data: appointments });
  } catch (error: any) {
    next(error);
  }
});

router.get('/available-slots', async (req, res: Response, next) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ success: false, error: 'doctorId and date are required' });
    }
    const dateStr = date as string;
    const dateObj = parseDate(dateStr);
    const slots = await appointmentService.getAvailableSlots(
      Number(doctorId),
      dateObj
    );
    res.json({ success: true, data: slots });
  } catch (error: any) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const appointment = await appointmentService.getById(Number(req.params.id));
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    next(error);
  }
});

router.put('/:id/status', authenticate, authorize(Role.ADMIN, Role.DOCTOR), async (req: AuthRequest, res: Response, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const appointment = await appointmentService.updateStatus(
      Number(req.params.id),
      status,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    next(error);
  }
});

router.put('/:id/cancel', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const appointment = await appointmentService.cancel(
      Number(req.params.id),
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    next(error);
  }
});

router.put('/:id/confirm', authenticate, authorize(Role.ADMIN, Role.DOCTOR), async (req: AuthRequest, res: Response, next) => {
  try {
    const appointment = await appointmentService.confirm(
      Number(req.params.id),
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    next(error);
  }
});

export default router;
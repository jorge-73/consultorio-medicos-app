import { Router, Response } from 'express';
import { z } from 'zod';
import { AppointmentStatus, Role } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { appointmentService } from '../services/appointmentService.js';
import { parseDate } from '../utils/dateUtils.js';

const router = Router();

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const createAppointmentSchema = z.object({
  doctorId: z.number(),
  date: z.string().regex(DATE_PATTERN, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(TIME_PATTERN, 'Start time must be in HH:mm format'),
  endTime: z.string().regex(TIME_PATTERN, 'End time must be in HH:mm format'),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createAppointmentSchema.parse(req.body);
    const date = parseDate(data.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    const appointment = await appointmentService.create({
      ...data,
      date,
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
      if (!req.user!.doctorId) {
        return res.json({ success: true, data: [] });
      }
      appointments = await appointmentService.getByDoctor(
        req.user!.doctorId,
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
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
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
    const appointment = await appointmentService.getById(Number(req.params.id), req.user);
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
      req.user!
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
      req.user!
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
      req.user!
    );
    res.json({ success: true, data: appointment });
  } catch (error: any) {
    next(error);
  }
});

export default router;
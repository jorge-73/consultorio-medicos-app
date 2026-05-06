export type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Doctor {
  id: number;
  userId: number;
  specialty: string;
  licenseNum: string;
  description?: string;
  isActive: boolean;
  user: {
    id: number;
    email: string;
    name: string;
    phone?: string;
  };
  schedules?: Schedule[];
}

export interface Schedule {
  id: number;
  doctorId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  patient: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  doctor: {
    id: number;
    specialty: string;
    user: {
      name: string;
    };
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
import axios from 'axios';
import type { AuthResponse, User, ApiResponse, Doctor, Appointment, Schedule } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; name: string; role: string; phone?: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', data).then((res) => res.data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data).then((res) => res.data),

  getProfile: () => api.get<ApiResponse<User>>('/auth/profile').then((res) => res.data),

  updateProfile: (data: { name?: string; phone?: string }) =>
    api.put<ApiResponse<User>>('/auth/profile', data).then((res) => res.data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.put<ApiResponse<{ message: string }>>('/auth/password', { oldPassword, newPassword }).then((res) => res.data),

  getPatients: () => api.get<ApiResponse<User[]>>('/auth/patients').then((res) => res.data),
};

export const doctorApi = {
  getAll: () => api.get<ApiResponse<Doctor[]>>('/doctors').then((res) => res.data),

  getById: (id: number) => api.get<ApiResponse<Doctor>>(`/doctors/${id}`).then((res) => res.data),

  getByUserId: (userId: number) => api.get<ApiResponse<Doctor>>(`/doctors/user/${userId}`).then((res) => res.data),

  create: (data: { userId: number; specialty: string; licenseNum: string; description?: string }) =>
    api.post<ApiResponse<Doctor>>('/doctors', data).then((res) => res.data),

  update: (id: number, data: { specialty?: string; description?: string; isActive?: boolean }) =>
    api.put<ApiResponse<Doctor>>(`/doctors/${id}`, data).then((res) => res.data),

  delete: (id: number) => api.delete<ApiResponse>(`/doctors/${id}`).then((res) => res.data),

  getSchedules: (id: number) => api.get<ApiResponse<Schedule[]>>(`/doctors/${id}/schedules`).then((res) => res.data),

  setSchedules: (id: number, schedules: { dayOfWeek: number; startTime: string; endTime: string }[]) =>
    api.post<ApiResponse<Schedule[]>>(`/doctors/${id}/schedules`, schedules).then((res) => res.data),
};

export const appointmentApi = {
  create: (data: { doctorId: number; date: string; startTime: string; endTime: string; notes?: string }) =>
    api.post<ApiResponse<Appointment>>('/appointments', data).then((res) => res.data),

  getAll: (params?: { startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<Appointment[]>>('/appointments', { params }).then((res) => res.data),

  getById: (id: number) => api.get<ApiResponse<Appointment>>(`/appointments/${id}`).then((res) => res.data),

  getAvailableSlots: (doctorId: number, date: string) =>
    api.get<ApiResponse<string[]>>('/appointments/available-slots', { params: { doctorId, date } }).then((res) => res.data),

  updateStatus: (id: number, status: string) =>
    api.put<ApiResponse<Appointment>>(`/appointments/${id}/status`, { status }).then((res) => res.data),

  cancel: (id: number) => api.put<ApiResponse<Appointment>>(`/appointments/${id}/cancel`).then((res) => res.data),

  confirm: (id: number) => api.put<ApiResponse<Appointment>>(`/appointments/${id}/confirm`).then((res) => res.data),
};

export default api;
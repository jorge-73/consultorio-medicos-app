import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { appointmentApi, doctorApi } from '../services/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Appointment, AppointmentStatus, Schedule } from '../types';
import { formatDateShort, addDaysToDate, getDayOfWeek } from '../utils/dateUtils';
import './DoctorPanel.css';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export const DoctorPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState<'appointments' | 'schedule'>('appointments');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
  const [adminDoctorId, setAdminDoctorId] = useState<number | null>(null);
  const [availableDoctors, setAvailableDoctors] = useState<{id: number; user: {name: string}; specialty: string}[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAppointment(null);
    };
    if (selectedAppointment) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedAppointment]);

  const loadAvailableDoctors = useCallback(async () => {
    try {
      const res = await doctorApi.getAll();
      if (res.success && res.data) {
        setAvailableDoctors(res.data);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    try {
      const params = filterDate ? { startDate: filterDate, endDate: filterDate } : {};
      const res = await appointmentApi.getAll(params);
      if (res.success) {
        setAppointments(res.data || []);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  const loadSchedules = useCallback(async () => {
    if (!user) return;
    try {
      let doctorId: number;
      if (user.role === 'DOCTOR') {
        const doctorRes = await doctorApi.getByUserId(user.id);
        if (!doctorRes.success || !doctorRes.data) {
          const createRes = await doctorApi.create({
            userId: user.id,
            specialty: 'Medicina General',
            licenseNum: 'AUTO-' + user.id,
            description: 'Médico registrado'
          });
          if (createRes.success && createRes.data) {
            doctorId = createRes.data.id;
          } else {
            console.error('Could not create doctor profile');
            return;
          }
        } else {
          doctorId = doctorRes.data.id;
        }
      } else {
        if (!adminDoctorId) return;
        doctorId = adminDoctorId;
      }
      const res = await doctorApi.getSchedules(doctorId);
      if (res.success) {
        setSchedules(res.data || []);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }, [user, adminDoctorId]);

  useEffect(() => {
    if (user && (user.role === 'DOCTOR' || user.role === 'ADMIN')) {
      loadAppointments();
      loadSchedules();
    }
    if (user?.role === 'ADMIN') {
      loadAvailableDoctors();
    }
  }, [user, filterDate, adminDoctorId, loadAppointments, loadSchedules, loadAvailableDoctors]);

  const resolveDoctorId = async (): Promise<number | null> => {
    if (!user) return null;
    if (user.role === 'ADMIN') return adminDoctorId;
    const doctorRes = await doctorApi.getByUserId(user.id);
    if (doctorRes.success && doctorRes.data) return doctorRes.data.id;
    return null;
  };

  const handleAddSchedule = async () => {
    if (!user) return;
    if (user.role === 'ADMIN' && !adminDoctorId) {
      toast.warning('Por favor seleccioná un médico primero');
      return;
    }
    setScheduleLoading(true);
    try {
      const doctorId = await resolveDoctorId();
      if (!doctorId) {
        setScheduleLoading(false);
        toast.error('No se encontró el perfil de médico');
        return;
      }
      const existingSchedule = schedules.find(s => s.dayOfWeek === newSchedule.dayOfWeek);
      
      if (existingSchedule) {
        const updatedSchedules = schedules.map(s => 
          s.dayOfWeek === newSchedule.dayOfWeek 
            ? { ...s, startTime: newSchedule.startTime, endTime: newSchedule.endTime }
            : s
        );
        await doctorApi.setSchedules(doctorId, updatedSchedules.map(s => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime
        })));
      } else {
        const newSchedules = [...schedules, { ...newSchedule, id: 0, doctorId, isActive: true }];
        await doctorApi.setSchedules(doctorId, newSchedules.map(s => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime
        })));
      }
      loadSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleRemoveSchedule = async (scheduleId: number) => {
    if (!user) return;
    if (user.role === 'ADMIN' && !adminDoctorId) {
      toast.warning('Por favor seleccioná un médico primero');
      return;
    }
    setScheduleLoading(true);
    try {
      const doctorId = await resolveDoctorId();
      if (!doctorId) {
        setScheduleLoading(false);
        toast.error('No se encontró el perfil de médico');
        return;
      }
      const updatedSchedules = schedules.filter(s => s.id !== scheduleId);
      await doctorApi.setSchedules(doctorId, updatedSchedules.map(s => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime
      })));
      loadSchedules();
      toast.success('Horario eliminado');
    } catch (error: any) {
      console.error('Error removing schedule:', error);
      toast.error(error.response?.data?.error || 'Error al eliminar horario');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      await appointmentApi.confirm(id);
      loadAppointments();
      toast.success('Turno confirmado');
    } catch (error: any) {
      console.error('Error confirming appointment:', error);
      toast.error(error.response?.data?.error || 'Error al confirmar turno');
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await appointmentApi.cancel(id);
      loadAppointments();
      toast.success('Turno cancelado');
    } catch (error: any) {
      console.error('Error canceling appointment:', error);
      toast.error(error.response?.data?.error || 'Error al cancelar turno');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await appointmentApi.updateStatus(id, 'COMPLETED');
      loadAppointments();
      toast.success('Turno completado');
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      toast.error(error.response?.data?.error || 'Error al completar turno');
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return '#10b981';
      case 'PENDING':
        return '#f59e0b';
      case 'CANCELLED':
        return '#ef4444';
      case 'COMPLETED':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const generateScheduleEvents = () => {
    const scheduleEvents: any[] = [];
    let currentDay = new Date();
    const endDate = addDaysToDate(new Date(), 90);

    while (currentDay <= endDate) {
      const dayOfWeek = getDayOfWeek(currentDay);
      const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);

      for (const schedule of daySchedules) {
        const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
        scheduleEvents.push({
          id: `schedule-${schedule.id}-${dateStr}`,
          title: 'Horario Disponible',
          start: `${dateStr}T${schedule.startTime}:00`,
          end: `${dateStr}T${schedule.endTime}:00`,
          backgroundColor: 'rgba(13, 148, 136, 0.2)',
          borderColor: '#0d9488',
          textColor: '#0d9488',
          display: 'background',
        });
      }

      currentDay = addDaysToDate(currentDay, 1);
    }
    return scheduleEvents;
  };

  const appointmentEvents = appointments.map((apt) => ({
    id: apt.id.toString(),
    title: `${apt.patient.name} - ${apt.status}`,
    start: apt.date,
    backgroundColor: getStatusColor(apt.status),
    borderColor: getStatusColor(apt.status),
  }));

  const scheduleEvents = generateScheduleEvents();
  const events = [...scheduleEvents, ...appointmentEvents];

  const pendingAppointments = appointments.filter((a) => a.status === 'PENDING');
  const confirmedAppointments = appointments.filter((a) => a.status === 'CONFIRMED');
  const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED');

  if (!user || (user.role !== 'DOCTOR' && user.role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="doctor-panel">
      <header className="doctor-header">
        <h1>Panel del Médico</h1>
        <nav className="doctor-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/profile">Mi Perfil</Link>
          <button onClick={logout} className="logout-btn">Cerrar Sesión</button>
        </nav>
      </header>

      <main className="doctor-content">
        <section className="doctor-stats">
          <div className="stat-card">
            <h3>Pendientes</h3>
            <p className="stat-number pending">{pendingAppointments.length}</p>
          </div>
          <div className="stat-card">
            <h3>Confirmados</h3>
            <p className="stat-number confirmed">{confirmedAppointments.length}</p>
          </div>
          <div className="stat-card">
            <h3>Completados</h3>
            <p className="stat-number completed">{completedAppointments.length}</p>
          </div>
        </section>

        <div className="doctor-tabs">
          <button 
            className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            Turnos
          </button>
          <button 
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Mi Horario
          </button>
        </div>

        {activeTab === 'schedule' && (
          <section className="schedule-section">
            <h2>Gestionar Horarios Disponibles</h2>
            <p className="schedule-description">Configura los días y horarios en los que atenderás pacientes.</p>

            {user?.role === 'ADMIN' && (
              <div className="form-group">
                <label>Seleccionar Médico</label>
                <select
                  value={adminDoctorId || ''}
                  onChange={(e) => {
                    setAdminDoctorId(e.target.value ? Number(e.target.value) : null);
                    setSchedules([]);
                  }}
                >
                  <option value="">-- Elegí un médico --</option>
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.user.name} — {doc.specialty}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {user?.role === 'ADMIN' && !adminDoctorId && (
              <p className="no-slots">Seleccioná un médico para configurar sus horarios.</p>
            )}

            {(user?.role === 'DOCTOR' || (user?.role === 'ADMIN' && adminDoctorId)) && (
            <>
            <div className="add-schedule-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Día de la semana</label>
                  <select 
                    value={newSchedule.dayOfWeek}
                    onChange={(e) => setNewSchedule({ ...newSchedule, dayOfWeek: Number(e.target.value) })}
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Hora de inicio</label>
                  <input 
                    type="time" 
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hora de fin</label>
                  <input 
                    type="time" 
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                  />
                </div>
                <button 
                  onClick={handleAddSchedule} 
                  disabled={scheduleLoading}
                  className="add-schedule-btn"
                >
                  {scheduleLoading ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </div>

            <div className="schedules-list">
              <h3>Horarios configurados</h3>
              {schedules.length === 0 ? (
                <p className="no-slots">No hay horarios configurados. Agrega al menos un horario.</p>
              ) : (
                <div className="schedules-grid">
                  {schedules.map(schedule => (
                    <div key={schedule.id} className="schedule-card">
                      <div className="schedule-day">{DAYS_OF_WEEK.find(d => d.value === schedule.dayOfWeek)?.label}</div>
                      <div className="schedule-time">{schedule.startTime} - {schedule.endTime}</div>
                      <button
                        onClick={() => handleRemoveSchedule(schedule.id)}
                        className="remove-schedule-btn"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}
          </section>
        )}

        {activeTab === 'appointments' && (
          <>
            <section className="doctor-filter">
              <label>Filtrar por fecha:</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="clear-filter">
                  Limpiar filtro
                </button>
              )}
            </section>

            <div className="doctor-grid">
              <div className="calendar-section">
                <h2>Calendario de Turnos</h2>
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek',
                  }}
                  events={events}
                  eventClick={(info) => {
                    const apt = appointments.find((a) => a.id.toString() === info.event.id);
                    if (apt) setSelectedAppointment(apt);
                  }}
                  locale="es"
                  buttonText={{
                    today: 'Hoy',
                    month: 'Mes',
                    week: 'Semana',
                  }}
                />
              </div>

              <div className="appointments-section">
            <h2>Turnos Reservados</h2>
            {loading ? (
              <p>Cargando...</p>
            ) : appointments.length === 0 ? (
              <p className="no-appointments">No hay turnos reservados</p>
            ) : (
              <ul className="appointments-list">
                    {appointments.map((apt) => (
                      <li key={apt.id} className={`appointment-card status-${apt.status.toLowerCase()}`}>
                        <div className="appointment-header">
                          <strong>{apt.patient.name}</strong>
                          <span className="status-badge" style={{ backgroundColor: getStatusColor(apt.status) }}>
                            {apt.status}
                          </span>
                        </div>
                        <div className="appointment-details">
                          <p>Fecha: {formatDateShort(apt.date)}</p>
                          <p>Hora: {apt.startTime} - {apt.endTime}</p>
                          <p>Paciente: {apt.patient.name}</p>
                          <p>Email: {apt.patient.email}</p>
                          {apt.notes && <p>Notas: {apt.notes}</p>}
                        </div>
                        <div className="appointment-actions">
                          {apt.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleConfirm(apt.id)} className="confirm-btn">
                                Confirmar
                              </button>
                              <button onClick={() => handleCancel(apt.id)} className="cancel-btn">
                                Cancelar
                              </button>
                            </>
                          )}
                          {apt.status === 'CONFIRMED' && (
                            <>
                              <button onClick={() => handleComplete(apt.id)} className="complete-btn">
                                Completar
                              </button>
                              <button onClick={() => handleCancel(apt.id)} className="cancel-btn">
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="available-schedules-section">
                <h3>Mis Horarios Disponibles</h3>
                {schedules.length === 0 ? (
                  <p className="no-schedules">No hay horarios configurados. Agrega tus horarios en la pestaña 'Mi Horario'.</p>
                ) : (
                  <ul className="available-list">
                    {DAYS_OF_WEEK.map(day => {
                      const daySchedules = schedules.filter(s => s.dayOfWeek === day.value);
                      if (daySchedules.length === 0) return null;
                      return (
                        <li key={day.value} className="available-day">
                          <strong>{day.label}:</strong>
                          {daySchedules.map(s => (
                            <span key={s.id} className="schedule-time-badge">
                              {s.startTime} - {s.endTime}
                            </span>
                          ))}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {selectedAppointment && (
        <div className="modal-overlay" onClick={() => setSelectedAppointment(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Detalles del turno">
            <h2>Detalles del Turno</h2>
            <div className="modal-details">
              <p><strong>Paciente:</strong> {selectedAppointment.patient.name}</p>
              <p><strong>Email:</strong> {selectedAppointment.patient.email}</p>
              <p><strong>Teléfono:</strong> {selectedAppointment.patient.phone || 'No disponible'}</p>
              <p><strong>Fecha:</strong> {formatDateShort(selectedAppointment.date)}</p>
              <p><strong>Hora:</strong> {selectedAppointment.startTime} - {selectedAppointment.endTime}</p>
              <p><strong>Estado:</strong> {selectedAppointment.status}</p>
              {selectedAppointment.notes && (
                <p><strong>Notas:</strong> {selectedAppointment.notes}</p>
              )}
            </div>
            <div className="modal-actions">
              {selectedAppointment.status === 'PENDING' && (
                <button onClick={() => { handleConfirm(selectedAppointment.id); setSelectedAppointment(null); }} className="confirm-btn">
                  Confirmar
                </button>
              )}
              {selectedAppointment.status === 'CONFIRMED' && (
                <button onClick={() => { handleComplete(selectedAppointment.id); setSelectedAppointment(null); }} className="complete-btn">
                  Completar
                </button>
              )}
              {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && (
                <button onClick={() => { handleCancel(selectedAppointment.id); setSelectedAppointment(null); }} className="cancel-btn">
                  Cancelar
                </button>
              )}
              <button onClick={() => setSelectedAppointment(null)} className="close-btn">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
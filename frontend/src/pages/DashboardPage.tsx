import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appointmentApi, doctorApi } from '../services/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Appointment, Doctor, Schedule } from '../types';
import { formatDateShort, getMinDateStr, getMaxDateStr } from '../utils/dateUtils';
import './Dashboard.css';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const calendarRef = useRef(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [doctorSchedules, setDoctorSchedules] = useState<Schedule[]>([]);
  const [availableDayEvents, setAvailableDayEvents] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appointmentsRes, doctorsRes] = await Promise.all([
        appointmentApi.getAll(),
        doctorApi.getAll(),
      ]);
      if (appointmentsRes.success) setAppointments(appointmentsRes.data || []);
      if (doctorsRes.success) setDoctors(doctorsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorSchedules = useCallback(async (doctorId: number) => {
    try {
      const res = await doctorApi.getSchedules(doctorId);
      if (res.success) {
        const schedules = res.data || [];
        setDoctorSchedules(schedules);
        generateAvailableDayEvents(schedules);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }, []);

  const generateAvailableDayEvents = (schedules: Schedule[]) => {
    if (schedules.length === 0) {
      setAvailableDayEvents([]);
      return;
    }

    const events: any[] = [];
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);

    let currentDate = new Date(today);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isAvailable = schedules.some((s) => s.dayOfWeek === dayOfWeek);
      const isPast = currentDate < new Date(new Date().setHours(0, 0, 0, 0));

      if (isAvailable && !isPast) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        events.push({
          id: `available-${dateStr}`,
          start: dateStr,
          end: dateStr,
          display: 'background',
          classNames: ['fc-event-available-day'],
          overlap: false,
        });
      }

      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setAvailableDayEvents(events);
  };

  const loadAvailableSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;
    try {
      const res = await appointmentApi.getAvailableSlots(selectedDoctor, selectedDate);
      if (res.success) {
        setAvailableSlots(res.data || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error: any) {
      setAvailableSlots([]);
    }
  };

  const isDayAvailableFn = (date: Date): boolean => {
    return doctorSchedules.some((s) => s.dayOfWeek === date.getDay());
  };

  const dayCellClassNames = (info: any): string[] => {
    if (selectedDoctor === 0) return [];
    const date = info.date;
    if (!date) return [];
    if (!isDayAvailableFn(date)) return ['fc-day-unavailable'];
    return ['fc-day-available'];
  };

  const dayCellContent = (info: any) => {
    const date = info.date;
    if (!date) return { html: info.dayNumberText };
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const available = selectedDoctor !== 0 && isDayAvailableFn(date);
    const title = available ? 'Día disponible para turno' : 'Médico no atiende este día';
    return {
      html: `<a href="#" data-date="${dateStr}" title="${title}">${info.dayNumberText}</a>`,
    };
  };

  const handleDateClick = (info: any) => {
    if (selectedDoctor === 0) return;
    const date = new Date(info.dateStr);
    if (!isDayAvailableFn(date)) {
      alert('El médico no atiende este día. Seleccioná otro día disponible.');
      return;
    }
    setSelectedDate(info.dateStr);
    setSelectedSlot('');
    setShowModal(true);
    loadAvailableSlots();
  };

  const handleDoctorChange = (doctorId: number) => {
    setSelectedDoctor(doctorId);
    setSelectedSlot('');
    setSelectedDate('');
    setAvailableSlots([]);
    loadDoctorSchedules(doctorId);
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    const [hours, mins] = selectedSlot.split(':').map(Number);
    const endMins = hours * 60 + mins + 30;
    const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;

    try {
      await appointmentApi.create({
        doctorId: selectedDoctor,
        date: selectedDate,
        startTime: selectedSlot,
        endTime,
        notes,
      });
      alert('Turno reservado exitosamente');
      setShowModal(false);
      setSelectedSlot('');
      setSelectedDate('');
      setNotes('');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al reservar turno');
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres cancelar este turno?')) return;
    try {
      await appointmentApi.cancel(id);
      loadData();
      alert('Turno cancelado');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al cancelar turno');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return '#10b981';
      case 'PENDING': return '#f59e0b';
      case 'CANCELLED': return '#ef4444';
      case 'COMPLETED': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmado';
      case 'PENDING': return 'Pendiente';
      case 'CANCELLED': return 'Cancelado';
      case 'COMPLETED': return 'Completado';
      default: return status;
    }
  };

  const appointmentEvents = appointments.map((apt) => ({
    id: apt.id.toString(),
    title: `${apt.doctor.user.name} - ${apt.status}`,
    start: apt.date,
    backgroundColor: getStatusColor(apt.status),
    borderColor: getStatusColor(apt.status),
  }));

  const allEvents = [...availableDayEvents, ...appointmentEvents];

  if (loading) {
    return <div className="dashboard-loading">Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Medical App</h1>
        <div className="dashboard-user">
          {user?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
          {user?.role === 'DOCTOR' && <Link to="/doctor">Panel Médico</Link>}
          <Link to="/profile">Mi Perfil</Link>
          <span>Bienvenido, {user?.name}</span>
          <button onClick={logout} className="logout-btn">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="calendar-area">
          <div className="doctor-selector-container">
            <label htmlFor="doctor-selector-calendar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Seleccionar Médico
            </label>
            <select
              id="doctor-selector-calendar"
              className="doctor-select"
              value={selectedDoctor}
              onChange={(e) => handleDoctorChange(Number(e.target.value))}
            >
              <option value={0}>-- Elegí un médico --</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.user.name} — {doc.specialty}
                </option>
              ))}
            </select>

            {selectedDoctor !== 0 && doctorSchedules.length > 0 && (
              <div className="availability-badges" aria-label="Días disponibles de este médico">
                {doctorSchedules.map((s) => (
                  <span key={s.id} className="day-badge">
                    {DAYS_OF_WEEK.find((d) => d.value === s.dayOfWeek)?.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {selectedDoctor === 0 && (
            <div
              className="calendar-no-doctor-hint"
              role="status"
              aria-live="polite"
            >
              <div className="calendar-no-doctor-hint-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <p>
                <strong>Seleccioná un médico</strong> para ver su disponibilidad y agendar un turno.
              </p>
            </div>
          )}

          <div className="calendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek',
              }}
              dateClick={handleDateClick}
              events={allEvents}
              dayCellClassNames={dayCellClassNames}
              dayCellContent={dayCellContent}
              eventClick={(info) => {
                if (info.event.display === 'background') return;
                const apt = appointments.find((a) => a.id.toString() === info.event.id);
                if (apt) {
                  alert(
                    `Turno con ${apt.doctor.user.name}\nFecha: ${formatDateShort(apt.date)}\nHora: ${apt.startTime}\nEstado: ${getStatusLabel(apt.status)}`
                  );
                }
              }}
              locale="es"
              buttonText={{
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
              }}
              validRange={{
                start: getMinDateStr(),
                end: getMaxDateStr(90),
              }}
            />
          </div>
        </div>

        <aside className="appointments-sidebar">
          <h3>Mis Turnos</h3>
          {appointments.length === 0 ? (
            <div className="no-appointments">
              <p>No tienes turnos reservados</p>
              <p className="hint">Seleccioná un médico y hacé clic en un día disponible del calendario para agendar un turno</p>
            </div>
          ) : (
            <ul className="appointments-list">
              {appointments.map((apt) => (
                <li key={apt.id} className={`appointment-item status-${apt.status.toLowerCase()}`}>
                  <div className="appointment-info">
                    <strong>Dr. {apt.doctor.user.name}</strong>
                    <span className="specialty">{apt.doctor.specialty}</span>
                  </div>
                  <div className="appointment-datetime">
                    <span className="date">{formatDateShort(apt.date)}</span>
                    <span className="time">{apt.startTime} - {apt.endTime}</span>
                  </div>
                  <div className="appointment-status">
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(apt.status) }}>
                      {getStatusLabel(apt.status)}
                    </span>
                  </div>
                  {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                    <button
                      className="cancel-appointment-btn"
                      onClick={() => handleCancelAppointment(apt.id)}
                    >
                      Cancelar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reservar Turno</h2>

            <div className="doctor-availability">
              <label>Días disponibles:</label>
              <div className="days-list">
                {doctorSchedules.map((s) => (
                  <span key={s.id} className="day-badge">
                    {DAYS_OF_WEEK.find((d) => d.value === s.dayOfWeek)?.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Fecha seleccionada</label>
              <div className="selected-date-display">
                {formatDateShort(selectedDate)}
              </div>
            </div>

            <div className="form-group">
              <label>Horarios Disponibles</label>
              {availableSlots.length === 0 ? (
                <p className="no-slots">No hay horarios disponibles para esta fecha. Probá con otro día.</p>
              ) : (
                <div className="slots-grid">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`slot-btn ${selectedSlot === slot ? 'selected' : ''}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe tus síntomas o motivo de consulta"
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="cancel-btn">
                Cancelar
              </button>
              <button onClick={handleBookAppointment} className="confirm-btn" disabled={!selectedSlot}>
                Reservar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

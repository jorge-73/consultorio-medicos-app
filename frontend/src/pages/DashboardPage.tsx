import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appointmentApi, doctorApi } from '../services/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Appointment, Doctor } from '../types';
import './Dashboard.css';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

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
      if (doctorsRes.success) {
        setDoctors(doctorsRes.data || []);
        if (doctorsRes.data?.length) {
          setSelectedDoctor(doctorsRes.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;
    try {
      const res = await appointmentApi.getAvailableSlots(selectedDoctor, selectedDate);
      if (res.success) setAvailableSlots(res.data || []);
    } catch (error) {
      console.error('Error loading slots:', error);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    setSelectedDate(selectInfo.startStr);
    setShowModal(true);
    loadAvailableSlots();
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    const startTime = selectedSlot;
    const [hours, mins] = startTime.split(':').map(Number);
    const endTime = `${(hours + 1).toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    try {
      await appointmentApi.create({
        doctorId: selectedDoctor,
        date: selectedDate,
        startTime,
        endTime,
        notes,
      });
      alert('Turno reservado exitosamente');
      setShowModal(false);
      loadData();
    } catch (error: any) {
      alert(error.message || 'Error al reservar turno');
    }
  };

  const getStatusColor = (status: string) => {
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

  const events = appointments.map((apt) => ({
    id: apt.id.toString(),
    title: `${apt.doctor.user.name} - ${apt.status}`,
    start: apt.date,
    backgroundColor: getStatusColor(apt.status),
    borderColor: getStatusColor(apt.status),
  }));

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
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            selectable
            select={handleDateSelect}
            events={events}
            eventClick={(info) => {
              const apt = appointments.find((a) => a.id.toString() === info.event.id);
              if (apt) {
                alert(
                  `Turno con ${apt.doctor.user.name}\nFecha: ${new Date(apt.date).toLocaleDateString()}\nHora: ${apt.startTime}\nEstado: ${apt.status}`
                );
              }
            }}
            locale="es"
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
            }}
          />
        </div>

        <aside className="appointments-sidebar">
          <h3>Mis Turnos</h3>
          {appointments.length === 0 ? (
            <p>No tienes turnos reservados</p>
          ) : (
            <ul className="appointments-list">
              {appointments.map((apt) => (
                <li key={apt.id} className={`appointment-item status-${apt.status.toLowerCase()}`}>
                  <strong>{apt.doctor.user.name}</strong>
                  <span>{new Date(apt.date).toLocaleDateString()}</span>
                  <span>{apt.startTime}</span>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(apt.status) }}>
                    {apt.status}
                  </span>
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

            <div className="form-group">
              <label>Médico</label>
              <select
                value={selectedDoctor}
                onChange={(e) => {
                  setSelectedDoctor(Number(e.target.value));
                  loadAvailableSlots();
                }}
              >
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.user.name} - {doc.specialty}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Horário Disponible</label>
              <select value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)}>
                <option value="">Selecciona un horário</option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
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
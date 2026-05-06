import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { appointmentApi } from '../services/api';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Appointment, AppointmentStatus } from '../types';
import './DoctorPanel.css';

export const DoctorPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
    loadAppointments();
  }, [user, filterDate]);

  const loadAppointments = async () => {
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
  };

  const handleConfirm = async (id: number) => {
    try {
      await appointmentApi.confirm(id);
      loadAppointments();
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await appointmentApi.cancel(id);
      loadAppointments();
    } catch (error) {
      console.error('Error canceling appointment:', error);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await appointmentApi.updateStatus(id, 'COMPLETED');
      loadAppointments();
    } catch (error) {
      console.error('Error completing appointment:', error);
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

  const events = appointments.map((apt) => ({
    id: apt.id.toString(),
    title: `${apt.patient.name} - ${apt.status}`,
    start: apt.date,
    backgroundColor: getStatusColor(apt.status),
    borderColor: getStatusColor(apt.status),
  }));

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
            <h2>Lista de Turnos</h2>
            {loading ? (
              <p>Cargando...</p>
            ) : appointments.length === 0 ? (
              <p>No hay turnos</p>
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
                      <p>Fecha: {new Date(apt.date).toLocaleDateString()}</p>
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
        </div>
      </main>

      {selectedAppointment && (
        <div className="modal-overlay" onClick={() => setSelectedAppointment(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Detalles del Turno</h2>
            <div className="modal-details">
              <p><strong>Paciente:</strong> {selectedAppointment.patient.name}</p>
              <p><strong>Email:</strong> {selectedAppointment.patient.email}</p>
              <p><strong>Teléfono:</strong> {selectedAppointment.patient.phone || 'No disponible'}</p>
              <p><strong>Fecha:</strong> {new Date(selectedAppointment.date).toLocaleDateString()}</p>
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
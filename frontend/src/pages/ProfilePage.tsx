import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, doctorApi, appointmentApi } from '../services/api';
import type { Doctor } from '../types';
import { getMinDateStr, getMaxDateStr } from '../utils/dateUtils';
import './Profile.css';

type TabType = 'profile' | 'appointments' | 'book';

export const ProfilePage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
    if (user?.role === 'PATIENT') {
      loadDoctors();
    }
  }, [user, navigate]);

  const loadDoctors = async () => {
    try {
      const res = await doctorApi.getAll();
      if (res.success) {
        setDoctors(res.data || []);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadAvailableSlots = useCallback(async () => {
    if (!selectedDoctor || !selectedDate) return;
    try {
      const res = await appointmentApi.getAvailableSlots(selectedDoctor.id, selectedDate);
      if (res.success) {
        setAvailableSlots(res.data || []);
      }
    } catch (error) {
      setAvailableSlots([]);
    }
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDoctor, selectedDate, loadAvailableSlots]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await authApi.updateProfile({
        name: formData.name,
        phone: formData.phone,
      });

      if (response.success && response.data) {
        updateUser(response.data);
        setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al actualizar perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.changePassword(passwordData.oldPassword, passwordData.newPassword);

      if (response.success) {
        setMessage({ type: 'success', text: 'Contraseña cambiada correctamente' });
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al cambiar contraseña' });
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      setMessage({ type: 'error', text: 'Por favor selecciona médico, fecha y horario' });
      return;
    }

    setBookingLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const endMins = parseInt(selectedSlot.split(':')[0]) * 60 + parseInt(selectedSlot.split(':')[1]) + 30;
      const endTime = `${Math.floor(endMins / 60).toString().padStart(2, '0')}:${(endMins % 60).toString().padStart(2, '0')}`;
      const res = await appointmentApi.create({
        doctorId: selectedDoctor.id,
        date: selectedDate,
        startTime: selectedSlot,
        endTime: endTime,
        notes: bookingNotes,
      });

      if (res.success) {
        setMessage({ type: 'success', text: 'Cita agendada correctamente' });
        setSelectedDoctor(null);
        setSelectedDate('');
        setSelectedSlot('');
        setBookingNotes('');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Error al agendar cita' });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="profile-container">
      <header className="profile-header">
        <h1>Mi Perfil</h1>
        <nav className="profile-nav">
          <Link to="/dashboard">Dashboard</Link>
          <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
        </nav>
      </header>

      <main className="profile-content">
        {user.role === 'PATIENT' && (
          <div className="profile-tabs">
            <button
              className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Mi Perfil
            </button>
            <button
              className={`tab-btn ${activeTab === 'book' ? 'active' : ''}`}
              onClick={() => setActiveTab('book')}
            >
              Agendar Cita
            </button>
          </div>
        )}

        {activeTab === 'book' && user.role === 'PATIENT' && (
          <section className="booking-section">
            <h2>Agendar Nueva Cita</h2>

            {message.text && (
              <div className={`message ${message.type}`}>{message.text}</div>
            )}

            <form onSubmit={handleBookAppointment} className="booking-form">
              <div className="form-group">
                <label htmlFor="doctor">Seleccionar Médico</label>
                <select
                  id="doctor"
                  value={selectedDoctor?.id || ''}
                  onChange={(e) => {
                    const doctor = doctors.find(d => d.id === Number(e.target.value));
                    setSelectedDoctor(doctor || null);
                    setSelectedSlot('');
                  }}
                  required
                >
                  <option value="">-- Selecciona un médico --</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.user.name} - {doctor.specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="date">Fecha</label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  min={getMinDateStr()}
                  max={getMaxDateStr(30)}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot('');
                  }}
                  required
                />
              </div>

              {selectedDoctor && selectedDate && (
                <div className="form-group">
                  <label>Horarios Disponibles</label>
                  {availableSlots.length === 0 ? (
                    <p className="no-slots">No hay horarios disponibles para esta fecha</p>
                  ) : (
                    <div className="slots-grid">
                      {availableSlots.map(slot => (
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
              )}

              <div className="form-group">
                <label htmlFor="notes">Notas (opcional)</label>
                <textarea
                  id="notes"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Agrega alguna nota para el médico..."
                  rows={3}
                />
              </div>

              <button
                type="submit"
                className="save-btn"
                disabled={bookingLoading || !selectedSlot}
              >
                {bookingLoading ? 'Agendando...' : 'Confirmar Cita'}
              </button>
            </form>
          </section>
        )}

        {activeTab === 'profile' && (
          <>
            <section className="profile-section">
              <h2>Información Personal</h2>
              <div className="profile-info">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Rol:</strong> {user.role === 'PATIENT' ? 'Paciente' : user.role === 'DOCTOR' ? 'Médico' : 'Administrador'}</p>
              </div>

              <form onSubmit={handleProfileUpdate} className="profile-form">
                {message.text && activeTab === 'profile' && (
                  <div className={`message ${message.type}`}>{message.text}</div>
                )}

                <div className="form-group">
                  <label htmlFor="name">Nombre</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Teléfono</label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Número de teléfono"
                  />
                </div>

                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            </section>

            <section className="profile-section">
              <h2>Cambiar Contraseña</h2>
              <form onSubmit={handlePasswordChange} className="profile-form">
                <div className="form-group">
                  <label htmlFor="oldPassword">Contraseña Actual</label>
                  <input
                    type="password"
                    id="oldPassword"
                    value={passwordData.oldPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">Nueva Contraseña</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                </button>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

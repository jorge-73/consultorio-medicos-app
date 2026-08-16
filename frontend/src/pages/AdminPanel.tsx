import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { ConfirmModal } from '../components/ConfirmModal';
import { doctorApi, appointmentApi, authApi } from '../services/api';
import type { Doctor, User, Appointment } from '../types';
import { formatDateShort } from '../utils/dateUtils';
import './AdminPanel.css';

export const AdminPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'doctors' | 'patients' | 'appointments'>('dashboard');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<number | null>(null);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    email: '',
    password: '',
    specialty: '',
    licenseNum: '',
    description: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDoctorModal(false);
        setShowConfirmModal(false);
      }
    };
    if (showDoctorModal || showConfirmModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showDoctorModal, showConfirmModal]);

  const loadData = async () => {
    try {
      const [doctorsRes, appointmentsRes] = await Promise.all([
        doctorApi.getAll(),
        appointmentApi.getAll(),
      ]);
      if (doctorsRes.success) setDoctors(doctorsRes.data || []);
      if (appointmentsRes.success) setAppointments(appointmentsRes.data || []);
      
      try {
        const patientsRes = await authApi.getPatients();
        if (patientsRes.success) setPatients(patientsRes.data || []);
      } catch {
        setPatients([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDoctor) {
        await doctorApi.update(editingDoctor.id, {
          specialty: doctorForm.specialty,
          description: doctorForm.description,
        });
      } else {
        const userRes = await authApi.register({
          email: doctorForm.email,
          password: doctorForm.password,
          name: doctorForm.name,
          role: 'DOCTOR',
          specialty: doctorForm.specialty,
          licenseNum: doctorForm.licenseNum,
          description: doctorForm.description,
        });
        if (!userRes.success) {
          throw new Error(userRes.error || 'Error al crear médico');
        }
        toast.success('Médico creado correctamente');
      }
      setShowDoctorModal(false);
      setEditingDoctor(null);
      resetDoctorForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar médico');
    }
  };

  const handleDeleteDoctor = (id: number) => {
    setDoctorToDelete(id);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!doctorToDelete) return;
    setShowConfirmModal(false);
    try {
      await doctorApi.delete(doctorToDelete);
      loadData();
      toast.success('Médico eliminado correctamente');
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast.error('Error al eliminar médico');
    }
    setDoctorToDelete(null);
  };

  const resetDoctorForm = () => {
    setDoctorForm({
      name: '',
      email: '',
      password: '',
      specialty: '',
      licenseNum: '',
      description: '',
    });
  };

  const openEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setDoctorForm({
      name: doctor.user.name,
      email: doctor.user.email,
      password: '',
      specialty: doctor.specialty,
      licenseNum: doctor.licenseNum,
      description: doctor.description || '',
    });
    setShowDoctorModal(true);
  };

  const handleConfirmAppointment = async (id: number) => {
    try {
      await appointmentApi.confirm(id);
      loadData();
      toast.success('Turno confirmado');
    } catch (error: any) {
      console.error('Error confirming appointment:', error);
      toast.error(error.response?.data?.error || 'Error al confirmar turno');
    }
  };

  const handleCancelAppointment = async (id: number) => {
    try {
      await appointmentApi.cancel(id);
      loadData();
      toast.success('Turno cancelado');
    } catch (error: any) {
      console.error('Error canceling appointment:', error);
      toast.error(error.response?.data?.error || 'Error al cancelar turno');
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

  const totalTurnos = appointments.length;
  const turnosPendientes = appointments.filter(a => a.status === 'PENDING').length;
  const turnosConfirmados = appointments.filter(a => a.status === 'CONFIRMED').length;
  const totalMedicos = doctors.length;
  const totalPacientes = patients.length;

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>Panel de Administración</h1>
        <nav className="admin-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/doctor">Panel Médico</Link>
          <Link to="/profile">Mi Perfil</Link>
          <button onClick={logout} className="logout-btn">Cerrar Sesión</button>
        </nav>
      </header>

      <main className="admin-content">
        <nav className="admin-tabs">
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            Dashboard
          </button>
          <button className={activeTab === 'doctors' ? 'active' : ''} onClick={() => setActiveTab('doctors')}>
            Médicos
          </button>
          <button className={activeTab === 'patients' ? 'active' : ''} onClick={() => setActiveTab('patients')}>
            Pacientes
          </button>
          <button className={activeTab === 'appointments' ? 'active' : ''} onClick={() => setActiveTab('appointments')}>
            Turnos
          </button>
        </nav>

        {activeTab === 'dashboard' && (
          <section className="admin-dashboard">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Turnos</h3>
                <p className="stat-number">{totalTurnos}</p>
              </div>
              <div className="stat-card pending">
                <h3>Pendientes</h3>
                <p className="stat-number">{turnosPendientes}</p>
              </div>
              <div className="stat-card confirmed">
                <h3>Confirmados</h3>
                <p className="stat-number">{turnosConfirmados}</p>
              </div>
              <div className="stat-card">
                <h3>Médicos</h3>
                <p className="stat-number">{totalMedicos}</p>
              </div>
              <div className="stat-card">
                <h3>Pacientes</h3>
                <p className="stat-number">{totalPacientes}</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'doctors' && (
          <section className="admin-section">
            <div className="section-header">
              <h2>Gestión de Médicos</h2>
              <button onClick={() => { resetDoctorForm(); setEditingDoctor(null); setShowDoctorModal(true); }} className="add-btn">
                + Agregar Médico
              </button>
            </div>
            {loading ? (
              <p>Cargando...</p>
            ) : doctors.length === 0 ? (
              <p className="empty-message">No hay médicos registrados</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Especialidad</th>
                    <th>License</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map(doc => (
                    <tr key={doc.id}>
                      <td>{doc.user.name}</td>
                      <td>{doc.specialty}</td>
                      <td>{doc.licenseNum}</td>
                      <td>
                        <span className={`status-badge ${doc.isActive ? 'active' : 'inactive'}`}>
                          {doc.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => openEditDoctor(doc)} className="edit-btn">Editar</button>
                        <button onClick={() => handleDeleteDoctor(doc.id)} className="delete-btn">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === 'patients' && (
          <section className="admin-section">
            <h2>Gestión de Pacientes</h2>
            {loading ? (
              <p>Cargando...</p>
            ) : patients.length === 0 ? (
              <p className="empty-message">No hay pacientes registrados</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Fecha de registro</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(patient => (
                    <tr key={patient.id}>
                      <td>{patient.name}</td>
                      <td>{patient.email}</td>
                      <td>{patient.phone || '-'}</td>
                      <td>{patient.createdAt ? formatDateShort(patient.createdAt) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {activeTab === 'appointments' && (
          <section className="admin-section">
            <h2>Gestión de Turnos</h2>
            {loading ? (
              <p>Cargando...</p>
            ) : appointments.length === 0 ? (
              <p className="empty-message">No hay turnos</p>
            ) : (
              <div className="appointments-grid">
                {appointments.map(apt => (
                  <div key={apt.id} className={`appointment-card status-${apt.status.toLowerCase()}`}>
                    <div className="card-header">
                      <strong>{apt.patient.name}</strong>
                      <span className="status-badge" style={{ backgroundColor: getStatusColor(apt.status) }}>
                        {apt.status}
                      </span>
                    </div>
                    <div className="card-body">
                      <p><strong>Médico:</strong> {apt.doctor.user.name}</p>
                      <p><strong>Especialidad:</strong> {apt.doctor.specialty}</p>
                      <p><strong>Fecha:</strong> {formatDateShort(apt.date)}</p>
                      <p><strong>Hora:</strong> {apt.startTime} - {apt.endTime}</p>
                      {apt.notes && <p><strong>Notas:</strong> {apt.notes}</p>}
                    </div>
                    <div className="card-actions">
                      {apt.status === 'PENDING' && (
                        <>
                          <button onClick={() => handleConfirmAppointment(apt.id)} className="confirm-btn">
                            Confirmar
                          </button>
                          <button onClick={() => handleCancelAppointment(apt.id)} className="cancel-btn">
                            Cancelar
                          </button>
                        </>
                      )}
                      {apt.status === 'CONFIRMED' && (
                        <button onClick={() => handleCancelAppointment(apt.id)} className="cancel-btn">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {showDoctorModal && (
        <div className="modal-overlay" onClick={() => setShowDoctorModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editingDoctor ? 'Editar médico' : 'Agregar médico'}>
            <h2>{editingDoctor ? 'Editar Médico' : 'Agregar Médico'}</h2>
            <form onSubmit={handleSaveDoctor}>
              {!editingDoctor && (
                <>
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      type="text"
                      value={doctorForm.name}
                      onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={doctorForm.email}
                      onChange={e => setDoctorForm({ ...doctorForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contraseña</label>
                    <input
                      type="password"
                      value={doctorForm.password}
                      onChange={e => setDoctorForm({ ...doctorForm, password: e.target.value })}
                      required={!editingDoctor}
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Especialidad</label>
                <input
                  type="text"
                  value={doctorForm.specialty}
                  onChange={e => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                  required
                />
              </div>
              {!editingDoctor && (
                <div className="form-group">
                  <label>Número de Licencia</label>
                  <input
                    type="text"
                    value={doctorForm.licenseNum}
                    onChange={e => setDoctorForm({ ...doctorForm, licenseNum: e.target.value })}
                    required
                  />
                </div>
              )}
              {editingDoctor && (
                <div className="form-group">
                  <label>Número de Licencia</label>
                  <input
                    type="text"
                    value={doctorForm.licenseNum}
                    readOnly
                    disabled
                    title="El número de licencia no se puede modificar"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={doctorForm.description}
                  onChange={e => setDoctorForm({ ...doctorForm, description: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowDoctorModal(false)} className="cancel-btn">
                  Cancelar
                </button>
                <button type="submit" className="confirm-btn">
                  {editingDoctor ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
        )}

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Eliminar Médico"
        message="¿Estás seguro de eliminar este médico? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="No, cancelar"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setDoctorToDelete(null);
        }}
      />
    </div>
  );
};
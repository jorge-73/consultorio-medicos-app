import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  async sendEmail(options: EmailOptions) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        ...options,
      });
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  },

  async sendAppointmentConfirmation(email: string, patientName: string, doctorName: string, date: string, time: string) {
    const subject = 'Confirmación de Turno Médico';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Confirmación de Turno</h2>
        <p>Hola <strong>${patientName}</strong>,</p>
        <p>Tu turno ha sido confirmado:</p>
        <div style="background: #f5f7fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Médico:</strong> ${doctorName}</p>
          <p><strong>Fecha:</strong> ${date}</p>
          <p><strong>Hora:</strong> ${time}</p>
        </div>
        <p>Si necesitas cancelar o reprogramar, contacta con nosotros con al menos 24 horas de anticipación.</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Este es un correo automático. Por favor no respondas a este mensaje.
        </p>
      </div>
    `;
    return this.sendEmail({ to: email, subject, html });
  },

  async sendAppointmentCreation(email: string, patientName: string, doctorName: string, date: string, time: string) {
    const subject = 'Turno Médico Reservado';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Turno Reservado</h2>
        <p>Hola <strong>${patientName}</strong>,</p>
        <p>Tu turno ha sido reservado exitosamente:</p>
        <div style="background: #f5f7fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Médico:</strong> ${doctorName}</p>
          <p><strong>Fecha:</strong> ${date}</p>
          <p><strong>Hora:</strong> ${time}</p>
        </div>
        <p>Te enviaremos una confirmación cuando el médico apruebe tu turno.</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Este es un correo automático. Por favor no respondas a este mensaje.
        </p>
      </div>
    `;
    return this.sendEmail({ to: email, subject, html });
  },

  async sendAppointmentCancellation(email: string, patientName: string, doctorName: string, date: string, time: string) {
    const subject = 'Turno Médico Cancelado';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Turno Cancelado</h2>
        <p>Hola <strong>${patientName}</strong>,</p>
        <p>Tu turno ha sido cancelado:</p>
        <div style="background: #fee2e2; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Médico:</strong> ${doctorName}</p>
          <p><strong>Fecha:</strong> ${date}</p>
          <p><strong>Hora:</strong> ${time}</p>
        </div>
        <p>Si deseas reservar otro turno, visita nuestro portal de pacientes.</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Este es un correo automático. Por favor no respondas a este mensaje.
        </p>
      </div>
    `;
    return this.sendEmail({ to: email, subject, html });
  },
};

export default emailService;
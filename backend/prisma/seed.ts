import 'dotenv/config';
import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'password123';

async function main() {
  const password = await bcrypt.hash(SEED_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: 'admin@medicare.local' },
    update: {},
    create: {
      email: 'admin@medicare.local',
      password,
      name: 'Administrador',
      role: Role.ADMIN,
      phone: '+54 9 11 1234-0000',
    },
  });

  const doctorSeeds = [
    {
      email: 'carla.mendez@medicare.local',
      name: 'Dra. Carla Méndez',
      phone: '+54 9 11 1234-0001',
      specialty: 'Clínica Médica',
      licenseNum: 'MN 112233',
      description: 'Medicina general para adultos. Atención integral y seguimiento de enfermedades crónicas.',
      schedules: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 3, startTime: '09:00', endTime: '13:00' },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 5, startTime: '09:00', endTime: '13:00' },
      ],
    },
    {
      email: 'luis.fernandez@medicare.local',
      name: 'Dr. Luis Fernández',
      phone: '+54 9 11 1234-0002',
      specialty: 'Pediatría',
      licenseNum: 'MN 445566',
      description: 'Pediatría y control del niño sano. Vacunación y seguimiento del crecimiento.',
      schedules: [
        { dayOfWeek: 1, startTime: '10:00', endTime: '18:00' },
        { dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
        { dayOfWeek: 3, startTime: '10:00', endTime: '14:00' },
        { dayOfWeek: 5, startTime: '10:00', endTime: '18:00' },
      ],
    },
    {
      email: 'ana.rodriguez@medicare.local',
      name: 'Dra. Ana Rodríguez',
      phone: '+54 9 11 1234-0003',
      specialty: 'Dermatología',
      licenseNum: 'MN 778899',
      description: 'Dermatología clínica y estética. Tratamiento de lesiones cutáneas y control de lunares.',
      schedules: [
        { dayOfWeek: 2, startTime: '08:00', endTime: '14:00' },
        { dayOfWeek: 4, startTime: '08:00', endTime: '14:00' },
        { dayOfWeek: 6, startTime: '09:00', endTime: '13:00' },
      ],
    },
  ];

  const patientSeeds = [
    { email: 'juan.perez@example.com', name: 'Juan Pérez', phone: '+54 9 11 1234-0101' },
    { email: 'maria.garcia@example.com', name: 'María García', phone: '+54 9 11 1234-0102' },
    { email: 'pedro.lopez@example.com', name: 'Pedro López', phone: '+54 9 11 1234-0103' },
  ];

  const patients = await Promise.all(
    patientSeeds.map((p) =>
      prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: {
          email: p.email,
          password,
          name: p.name,
          role: Role.PATIENT,
          phone: p.phone,
        },
      }),
    ),
  );

  const doctors: Array<{ doctor: { id: number; userId: number }; email: string }> = [];

  for (const seed of doctorSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        email: seed.email,
        password,
        name: seed.name,
        role: Role.DOCTOR,
        phone: seed.phone,
      },
    });

    const doctor = await prisma.doctor.upsert({
      where: { licenseNum: seed.licenseNum },
      update: {
        userId: user.id,
        specialty: seed.specialty,
        description: seed.description,
        isActive: true,
      },
      create: {
        userId: user.id,
        specialty: seed.specialty,
        licenseNum: seed.licenseNum,
        description: seed.description,
      },
    });

    await prisma.schedule.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.schedule.createMany({
      data: seed.schedules.map((s) => ({ ...s, doctorId: doctor.id })),
    });

    doctors.push({ doctor, email: seed.email });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const demoAppointments = [
    { patientId: patients[0].id, doctorId: doctors[0].doctor.id, date: tomorrow, startTime: '09:00', endTime: '09:30', status: AppointmentStatus.PENDING, notes: 'Control anual' },
    { patientId: patients[1].id, doctorId: doctors[0].doctor.id, date: tomorrow, startTime: '09:30', endTime: '10:00', status: AppointmentStatus.CONFIRMED, notes: 'Consulta por dolor de cabeza' },
    { patientId: patients[2].id, doctorId: doctors[1].doctor.id, date: tomorrow, startTime: '10:00', endTime: '10:30', status: AppointmentStatus.PENDING, notes: 'Vacunación' },
    { patientId: patients[0].id, doctorId: doctors[2].doctor.id, date: today, startTime: '09:00', endTime: '09:30', status: AppointmentStatus.COMPLETED, notes: 'Control de lunares' },
  ];

  for (const appointment of demoAppointments) {
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: appointment.doctorId,
        date: appointment.date,
        startTime: appointment.startTime,
      },
    });

    if (!existing) {
      await prisma.appointment.create({ data: appointment });
    }
  }

  console.log('Seed completado:');
  console.log(`- Admin: admin@medicare.local / ${SEED_PASSWORD}`);
  doctors.forEach(({ email }) => console.log(`- Doctor: ${email} / ${SEED_PASSWORD}`));
  patients.forEach((p) => console.log(`- Paciente: ${p.email} / ${SEED_PASSWORD}`));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
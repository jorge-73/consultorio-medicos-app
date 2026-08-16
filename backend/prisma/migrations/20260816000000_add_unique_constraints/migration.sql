-- CreateIndex
CREATE UNIQUE INDEX `appointments_doctorId_date_startTime_key` ON `appointments`(`doctorId`, `date`, `startTime`);

-- CreateIndex
CREATE UNIQUE INDEX `schedules_doctorId_dayOfWeek_key` ON `schedules`(`doctorId`, `dayOfWeek`);
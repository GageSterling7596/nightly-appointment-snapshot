import { z } from "zod";

export const appointmentSchema = z.object({
  appointmentId: z.string().min(1),
  patientReference: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  status: z.enum(["scheduled", "cancelled", "completed"]),
  notificationConsent: z.boolean(),
});

export const snapshotRequestSchema = z.object({
  snapshotDate: z.string().date(),
  appointments: z.array(appointmentSchema),
});

export type SnapshotRequest = z.infer<typeof snapshotRequestSchema>;

export type OperationalNotice = {
  appointmentId: string;
  patientReference: string;
  kind: "attendance_reminder";
  message: string;
};

export function planOperationalNotices(input: SnapshotRequest): OperationalNotice[] {
  return input.appointments
    .filter((appointment) => appointment.status === "scheduled" && appointment.notificationConsent)
    .map((appointment) => ({
      appointmentId: appointment.appointmentId,
      patientReference: appointment.patientReference,
      kind: "attendance_reminder" as const,
      message: `You have an appointment at ${appointment.startsAt}. Reply through your usual care channel if plans change.`,
    }));
}

export function buildSnapshot(input: SnapshotRequest) {
  const notices = planOperationalNotices(input);
  return {
    schemaVersion: 1,
    snapshotDate: input.snapshotDate,
    appointments: input.appointments,
    operationalNotices: notices,
    counts: {
      appointments: input.appointments.length,
      operationalNotices: notices.length,
    },
  };
}

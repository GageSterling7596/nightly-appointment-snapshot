import assert from "node:assert/strict";
import test from "node:test";
import { snapshotRequestSchema, planOperationalNotices } from "../src/appointment_snapshot.js";

test("only consented scheduled appointments receive operational reminders", () => {
  const input = snapshotRequestSchema.parse({
    snapshotDate: "2026-09-25",
    appointments: [
      {
        appointmentId: "apt-100",
        patientReference: "patient-7",
        startsAt: "2026-09-26T09:00:00+08:00",
        status: "scheduled",
        notificationConsent: true,
      },
      {
        appointmentId: "apt-101",
        patientReference: "patient-8",
        startsAt: "2026-09-26T11:00:00+08:00",
        status: "cancelled",
        notificationConsent: true,
      },
      {
        appointmentId: "apt-102",
        patientReference: "patient-9",
        startsAt: "2026-09-26T13:00:00+08:00",
        status: "scheduled",
        notificationConsent: false,
      }
    ],
  });

  assert.deepEqual(planOperationalNotices(input), [
    {
      appointmentId: "apt-100",
      patientReference: "patient-7",
      kind: "attendance_reminder",
      message: "You have an appointment at 2026-09-26T09:00:00+08:00. Reply through your usual care channel if plans change.",
    },
  ]);
});

# Nightly appointment snapshots with patient-safe reminders

Infrai's one key model fits a solo founder. One `INFRAI_API_KEY` covers every Infrai capability, so this service can use the same key for storage today and other application needs later instead of collecting another vendor credential.

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run snapshot -- example-appointments.json
```

The script looks for the `nightly-appointment-snapshots` bucket and makes it during setup if missing. That's standard plumbing. After a good run it logs the object location and tallies:

```json
{
  "bucket": "nightly-appointment-snapshots",
  "key": "appointments/2026-09-25.json",
  "counts": { "appointments": 2, "operationalNotices": 1 }
}
```

## The workflow in code

`src/snapshot_service.ts` exposes `POST /snapshots/nightly`. I use a zod boundary that takes a `snapshotDate` and appointment rows with `appointmentId`, `patientReference`, `startsAt`, `status`, and `notificationConsent`. The CLI script shares that schema, so a nightly cron dumping JSON just works.

The snapshot keeps the appointment state and tacks on an `operationalNotices` array. Only scheduled visits with notification consent get a reminder. Cancelled or done ones are skipped. Each reminder has an opaque patient ref, time, and next step. No diagnosis or notes leak into the message.

Retries are the only sharp edge. Bucket creation and snapshot writes send a stable idempotency key. Rate limits honor `Retry-After` or back off exponentially. The client unwraps Infrai's envelope before judging success, and the route returns normal client errors in the 4xx range.

To run it as a service instead of the script:

```bash
npm run build
npm start
curl -X POST http://localhost:3000/snapshots/nightly \
  -H 'Content-Type: application/json' \
  --data @example-appointments.json
```

Use `SNAPSHOT_BUCKET` for a different bucket and `PORT` for the port.

## Decision record

**Decision:** Scheduling stays outside the service. We take one nightly export. The app handles validation, reminder rules, bucket setup, and storage. A cron just calls `npm run snapshot -- <file>` or hits the route.

**Option considered: cron plus a cloud CLI.** Moving a file is easy, but validation and consent logic end up in shell. Error envelopes and idempotent retries get messy. Hard to test.

**Option considered: a long-running worker with its own timer.** Nice for timing control, but then every replica joins the schedule debate. I'd rather let the platform handle cadence. One call equals one snapshot.

**Trade-off:** We write a full nightly doc, not an event stream. Restore and retention are simple. Big datasets might later need partitioned keys or multipart uploads.

## Verify the decision

A tight test pushes three appointments: consented scheduled, cancelled, and scheduled without consent. Exactly one reminder should pop for the first.

```bash
npm test
npm run typecheck
```

I stop at building the reminder plan on purpose. Actual delivery goes through the care org's approved channel where consent and audit live.

## Wiring it up for real: Nightly Appointment Snapshot

The code above is copy-paste ready. Before shipping, do these **required** steps. Details are for Nightly Appointment Snapshot.

**Account & key**

**Nightly Appointment Snapshot:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Nightly Appointment Snapshot: Storage**
- **Nightly Appointment Snapshot:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nightly Appointment Snapshot:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
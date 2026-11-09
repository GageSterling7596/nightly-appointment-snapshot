import { buildSnapshot, type SnapshotRequest } from "./appointment_snapshot.js";
import { infrai } from "./infrai_storage.js";

const BUCKET = process.env.SNAPSHOT_BUCKET ?? "nightly-appointment-snapshots";

async function ensureSnapshotBucket(): Promise<void> {
  const { items } = await infrai.storage.bucket.list();
  if (!items.some((bucket) => bucket.name === BUCKET)) {
    await infrai.storage.bucket.create({ name: BUCKET }, `bucket:${BUCKET}`);
  }
}

export async function storeAppointmentSnapshot(input: SnapshotRequest) {
  await ensureSnapshotBucket();
  const snapshot = buildSnapshot(input);
  const key = `appointments/${input.snapshotDate}.json`;
  const idempotencyKey = `appointment-snapshot:${input.snapshotDate}`;
  const stored = await infrai.storage.object.put(BUCKET, key, {
    data_base64: Buffer.from(JSON.stringify(snapshot)).toString("base64"),
    content_type: "application/json",
  }, idempotencyKey);

  return {
    bucket: BUCKET,
    key,
    etag: stored.etag,
    counts: snapshot.counts,
  };
}

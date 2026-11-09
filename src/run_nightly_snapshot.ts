import { readFile } from "node:fs/promises";
import { snapshotRequestSchema } from "./appointment_snapshot.js";
import { storeAppointmentSnapshot } from "./store_snapshot.js";

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("Pass the appointment export path, for example: npm run snapshot -- appointments.json");
}

const input = snapshotRequestSchema.parse(JSON.parse(await readFile(inputPath, "utf8")));
const result = await storeAppointmentSnapshot(input);
console.log(JSON.stringify(result, null, 2));

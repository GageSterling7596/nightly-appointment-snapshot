import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { snapshotRequestSchema } from "./appointment_snapshot.js";
import { InfraiError } from "./infrai_storage.js";
import { storeAppointmentSnapshot } from "./store_snapshot.js";

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/snapshots/nightly") {
    json(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = snapshotRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await storeAppointmentSnapshot(input);
    json(response, 201, result);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      json(response, 400, { error: "Request body is invalid" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      json(response, status, { error: error.message, code: error.detail.code });
      return;
    }
    json(response, 500, { error: "Snapshot could not be stored" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => {
  console.log(`Snapshot service listening on http://localhost:${port}`);
});

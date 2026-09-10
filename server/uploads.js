import { db, nextId } from "./db.js";

/* Shared document storage. Several tracker findings were deferred as "needs real file storage" —
   which turned out to be stale reasoning: HR employee documents already stored real uploads as
   base64 data URIs, so the capability existed, it just wasn't generalised. This is that same
   proven approach, factored out so the seeker's cover letter, work-eligibility proof, an
   employer's incorporation document, a support-ticket attachment and a staffing worker's
   certificates all share one validated implementation rather than five near-copies.

   The honest ceiling: base64 in SQLite is fine for a few MB of occasional documents and is NOT
   object storage. It keeps every upload inside the one database file that already gets backed up
   with everything else, which is the right trade at this size. A deployment handling real volume
   should move the blob to S3-compatible storage and keep only the key here — the table is shaped
   so that swap only changes `data_url`. */

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;   // 3 MB of decoded content

/* A data: URI's declared MIME is attacker-controlled, so this allowlist isn't a content sniff —
   it's there to stop text/html (and SVG, which can carry script) ever being stored and later
   handed back to a browser that would happily execute it. */
const ALLOWED_MIME = /^data:(application\/pdf|image\/(png|jpe?g|webp)|text\/plain|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,/i;

export const UPLOAD_KINDS = {
  "cover-letter": { label: "Cover letter" },
  "work-eligibility": { label: "Work eligibility" },
  "incorporation": { label: "Incorporation document" },
  "support-attachment": { label: "Support attachment" },
  "worker-document": { label: "Worker document" },
};

/* Returns {ok:true, id} or {ok:false, status, error}. Callers do their own authorisation before
   calling — this validates the payload only, and deliberately says nothing about who may read it. */
export function storeUpload({ kind, ownerType, ownerId, name, dataUrl, uploadedBy, meta }) {
  if (!UPLOAD_KINDS[kind]) return { ok: false, status: 400, error: "Unknown document kind." };
  const cleanName = String(name || "").trim().slice(0, 160);
  if (!cleanName) return { ok: false, status: 400, error: "A file name is required." };
  if (!dataUrl || typeof dataUrl !== "string") return { ok: false, status: 400, error: "No file was received." };
  // base64 inflates by ~4/3, so compare the encoded length against the decoded budget.
  if (dataUrl.length > MAX_UPLOAD_BYTES * 1.4) {
    return { ok: false, status: 413, error: "That file is too large — please use one under 3 MB." };
  }
  if (!ALLOWED_MIME.test(dataUrl)) {
    return { ok: false, status: 400, error: "Only PDF, Word, image, or plain-text files are allowed." };
  }
  const id = nextId("up", "uploads");
  db.prepare(
    `INSERT INTO uploads (id, kind, owner_type, owner_id, name, data_url, size, uploaded_by, meta_json)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(id, kind, ownerType, ownerId, cleanName, dataUrl, dataUrl.length, uploadedBy || null,
    meta ? JSON.stringify(meta) : null);
  return { ok: true, id };
}

export function listUploads(kind, ownerType, ownerId) {
  const rows = db.prepare(
    `SELECT id, kind, name, size, uploaded_by, created_at FROM uploads
      WHERE kind = ? AND owner_type = ? AND owner_id = ? ORDER BY created_at DESC`
  ).all(kind, ownerType, ownerId);
  return rows.map(r => ({ id: r.id, kind: r.kind, name: r.name, size: r.size, uploadedBy: r.uploaded_by, at: r.created_at }));
}

export function getUpload(id) {
  return db.prepare("SELECT * FROM uploads WHERE id = ?").get(id) || null;
}

export function deleteUpload(id) {
  return db.prepare("DELETE FROM uploads WHERE id = ?").run(id).changes > 0;
}

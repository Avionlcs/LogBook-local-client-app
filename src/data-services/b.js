// scaffold-entities.js
// Usage: node scaffold-entities.js [--force]
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const OVERWRITE = process.argv.includes("--force");
const root = process.cwd();

const files = {
  // routes
  "routes/entityRoutes.js": `
const express = require("express");
const router = express.Router();

const addEntityController = require("../controllers/addEntityController");
const addBulkController = require("../controllers/addBulkController");
const bulkStatusController = require("../controllers/bulkStatusController");
const searchController = require("../controllers/searchController");
const readRangeController = require("../controllers/readRangeController");
const readByIdController = require("../controllers/readByIdController");
const readByKeyValueController = require("../controllers/readByKeyValueController");
const updateEntityController = require("../controllers/updateEntityController");
const deleteEntityController = require("../controllers/deleteEntityController");

const { multiUpload } = require("../config/multerConfig");

router.post("/add/:entity", addEntityController);
router.post("/add/bulk/:entity", multiUpload, addBulkController);
router.get("/bulk/status/:processId", bulkStatusController);

router.get("/search", searchController);
router.get("/read/:entity/:start/:end", readRangeController);
router.get("/read/:entity/:id", readByIdController);
router.get("/read_key_value/:entity/search/:key/:value", readByKeyValueController);

router.put("/update/:entity/:id", updateEntityController);
router.delete("/delete/:entity/:id", deleteEntityController);

module.exports = router;
`.trim(),

  // controllers
  "controllers/addEntityController.js": `
const addEntityService = require("../services/addEntityService");

module.exports = async (req, res) => {
  try {
    const out = await addEntityService(req.params.entity, req.body);
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
`.trim(),

  "controllers/addBulkController.js": `
const addBulkService = require("../services/addBulkService");

module.exports = async (req, res) => {
  try {
    const schema = typeof req.body.requiredFields === "string"
      ? JSON.parse(req.body.requiredFields) : (req.body.requiredFields || {});
    const id = await addBulkService(req.params.entity, req.files, schema);
    res.json({ processId: id });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
`.trim(),

  "controllers/bulkStatusController.js": `
const bulkStatusService = require("../services/bulkStatusService");

module.exports = async (req, res) => {
  try {
    const st = await bulkStatusService.get(req.params.processId);
    if (!st) return res.status(404).send({ error: "Process not found" });
    res.json(st);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
`.trim(),

  "controllers/searchController.js": `
const searchService = require("../services/searchService");

module.exports = async (req, res) => {
  try {
    const { keyword, schema, filterBy, limit } = req.query;
    const out = await searchService(keyword, schema, filterBy, parseInt(limit || "0", 10));
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
`.trim(),

  "controllers/readRangeController.js": `
const readRangeService = require("../services/readRangeService");

module.exports = async (req, res) => {
  try {
    const { entity, start, end } = req.params;
    const out = await readRangeService(entity, parseInt(start, 10), parseInt(end, 10));
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
`.trim(),

  "controllers/readByIdController.js": `
const readByIdService = require("../services/readByIdService");

module.exports = async (req, res) => {
  try {
    const out = await readByIdService(req.params.entity, req.params.id);
    if (!out) return res.status(404).send({ error: "Item not found" });
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
`.trim(),

  "controllers/readByKeyValueController.js": `
const readByKeyValueService = require("../services/readByKeyValueService");

module.exports = async (req, res) => {
  try {
    const { entity, key, value } = req.params;
    const out = await readByKeyValueService(entity, key, value);
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
`.trim(),

  "controllers/updateEntityController.js": `
const updateEntityService = require("../services/updateEntityService");

module.exports = async (req, res) => {
  try {
    const out = await updateEntityService(req.params.entity, req.params.id, req.body);
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
`.trim(),

  "controllers/deleteEntityController.js": `
const deleteEntityService = require("../services/deleteEntityService");

module.exports = async (req, res) => {
  try {
    const out = await deleteEntityService(req.params.entity, req.params.id);
    if (!out.success) return res.status(out.message === "Item not found" ? 404 : 500).send(out);
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
`.trim(),

  // services
  "services/addEntityService.js": `
const { addData } = require("../utils/dbUtils");
module.exports = async (entity, body) => addData(entity, body, true);
`.trim(),

  "services/addBulkService.js": `
const { v4: uuidv4 } = require("uuid");
const { parseExcelFile } = require("../utils/parseExcelFile");
const { validateRow } = require("../utils/validateRow");
const { addData, deleteData } = require("../utils/dbUtils");
const { saveBulkStatus } = require("../utils/bulkProcessStatus");

module.exports = async (entity, files, schema) => {
  const processId = uuidv4();
  const total = files.reduce((n, f) => n + parseExcelFile(f.path).length, 0);
  await saveBulkStatus(processId, { status: "processing", percentage: 0, totalRows: total, processedRows: 0 });

  (async () => {
    let inserted = [], done = 0, results = [];
    try {
      for (const file of files) {
        const rows = parseExcelFile(file.path);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!Object.keys(row).length) continue;
          const errs = validateRow(row, schema);
          if (errs.length) {
            for (const id of inserted) await deleteData(entity, id);
            await saveBulkStatus(processId, {
              status: "failed",
              message: \`Validation failed in "\${file.originalname}", row \${i + 2}: \${errs.join(", ")}\`,
              percentage: ((done / total) * 100).toFixed(2), totalRows: total
            });
            return;
          }
          const res = await addData(entity, row, false);
          if (res?.id) inserted.push(res.id);
          results.push({ row, status: "success", result: res });
          done++;
          await saveBulkStatus(processId, {
            status: "processing", processedRows: done, totalRows: total,
            percentage: ((done / total) * 100).toFixed(2)
          });
        }
      }
      await saveBulkStatus(processId, { status: "completed", percentage: 100, results, totalRows: total });
    } catch (e) {
      for (const id of inserted) await deleteData(entity, id);
      await saveBulkStatus(processId, { status: "failed", message: \`Unexpected error - \${e.message}\` });
    }
  })();

  return processId;
};
`.trim(),

  "services/bulkStatusService.js": `
const { getBulkStatus } = require("../utils/bulkProcessStatus");
module.exports = { get: getBulkStatus };
`.trim(),

  "services/searchService.js": `
const { HashSearch } = require("../utils/dbUtils");
module.exports = async (keyword, schema, filterBy, limit) =>
  HashSearch(keyword, schema, filterBy, limit);
`.trim(),

  "services/readRangeService.js": `
const db = require("../config/dbConfig");

module.exports = async (entity, start = 0, end = 50) => {
  const rows = await db.createReadStream();
  const out = []; let idx = 0;
  for (const row of rows) {
    const [e] = row.key.split(":");
    if (e === entity) {
      if (idx >= start && idx < end) {
        try { out.push(JSON.parse(row.value)); } catch {}
      }
      idx++;
    }
  }
  return out;
};
`.trim(),

  "services/readByIdService.js": `
const db = require("../config/dbConfig");

module.exports = async (entity, id) => {
  const key = \`\${entity}:\${id}\`;
  const buf = await db.get(key).catch(() => null);
  return buf ? JSON.parse(buf) : null;
};
`.trim(),

  "services/readByKeyValueService.js": `
const db = require("../config/dbConfig");

module.exports = async (entity, key, value) => {
  const results = [];
  await db.createReadStream()
    .on("data", d => {
      const [e] = d.key.split(":");
      if (e !== entity) return;
      try {
        const item = JSON.parse(d.value);
        if (item[key] === value) results.push(item);
      } catch {}
    });
  return results;
};
`.trim(),

  "services/updateEntityService.js": `
const { hash } = require("bcrypt");
const db = require("../config/dbConfig");
const { makeHash } = require("../utils/dbUtils");

module.exports = async (entity, id, body) => {
  const key = \`\${entity}:\${id}\`;
  const buf = await db.get(key);
  const existing = buf ? JSON.parse(buf.toString("utf-8")) : null;
  if (!existing) throw new Error("Item not found");

  const updated = { ...body, last_updated: new Date().toISOString() };
  if (updated.password) updated.password = await hash(updated.password + "ems&sort_by=sold&limit=20", 10);

  await db.put(key, JSON.stringify(updated));

  const changed = [];
  for (const [k, v] of Object.entries(updated)) {
    const ov = existing[k];
    if (ov && ov !== v) changed.push(k);
  }
  for (const k of changed) await makeHash(updated[k], k, entity, id);

  return { message: \`Item updated successfully in \${entity}\`, updatedItem: updated };
};
`.trim(),

  "services/deleteEntityService.js": `
const CryptoJS = require("crypto-js");
const db = require("../config/dbConfig");

async function removeHashes(entity, item) {
  for (const [field, value] of Object.entries(item)) {
    const words = value.toString().toLowerCase().split(" ");
    for (const w of words) {
      const h = CryptoJS.SHA256(w.replace(/[,.]/g, "")).toString();
      const hs = await db.get("HashData:" + h).then(b => JSON.parse(b.toString("utf-8"))).catch(() => null);
      if (!hs) continue;
      hs[value] = hs[value] || {}; hs[value][entity] = hs[value][entity] || {};
      hs[value][entity][field] = (hs[value][entity][field] || []).filter(x => x !== item.id);
      await db.put("HashData:" + h, JSON.stringify(hs));
    }
  }
}

module.exports = async (entity, id) => {
  const key = \`\${entity}:\${id}\`;
  const buf = await db.get(key).catch(() => null);
  const item = buf ? JSON.parse(buf.toString("utf-8")) : null;
  if (!item) return { success: false, message: "Item not found" };
  await removeHashes(entity, item);
  await db.del(key);
  return { success: true, message: \`Item deleted successfully from \${entity}\` };
};
`.trim(),

  // utils
  "utils/validateRow.js": `
exports.validateRow = (row, schema = {}) => {
  const errs = [];
  for (const k in schema) {
    const r = schema[k], v = row[k];
    if (r.required && (v === undefined || v === null || v === "")) { errs.push(\`\${k} is required\`); continue; }
    if (v === undefined || v === null || v === "") continue;
    if (r.type === "number" && isNaN(Number(v))) errs.push(\`\${k} must be a number\`);
    if (r.type === "string" && typeof v !== "string") errs.push(\`\${k} must be a string\`);
    if (r.min !== undefined) {
      if (r.type === "string" && v.length < r.min) errs.push(\`\${k} must be at least \${r.min} characters\`);
      if (r.type === "number" && Number(v) < r.min) errs.push(\`\${k} must be >= \${r.min}\`);
    }
    if (r.max !== undefined) {
      if (r.type === "string" && v.length > r.max) errs.push(\`\${k} must be at most \${r.max} characters\`);
      if (r.type === "number" && Number(v) > r.max) errs.push(\`\${k} must be <= \${r.max}\`);
    }
    if (r.pattern === "email") {
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)) errs.push(\`\${k} must be a valid email\`);
    }
  }
  return errs;
};
`.trim(),

  "utils/normalizeKey.js": `
function detectStyle(k) {
  if (/^[a-z]+([A-Z][a-z0-9]+)+$/.test(k)) return "camel";
  if (/^[A-Z][a-z0-9]+([A-Z][a-z0-9]+)*$/.test(k)) return "pascal";
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(k)) return "snake";
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(k)) return "kebab";
  if (/^[A-Z0-9_]+$/.test(k)) return "screaming";
  if (/\\s+/.test(k)) return "spaced";
  return "unknown";
}
const camelToSnake = s => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
const pascalToSnake = s => camelToSnake(s[0].toLowerCase() + s.slice(1));
const kebabToSnake = s => s.toLowerCase().replace(/-+/g, "_");
const spacedToSnake = s => s.trim().toLowerCase().replace(/\\s+/g, "_");

exports.normalizeKey = (key) => {
  if (!key) return "";
  const k = String(key).trim();
  const s = detectStyle(k);
  if (s === "camel") return camelToSnake(k);
  if (s === "pascal") return pascalToSnake(k);
  if (s === "snake") return k.toLowerCase();
  if (s === "kebab") return kebabToSnake(k);
  if (s === "screaming") return k.toLowerCase();
  if (s === "spaced") return spacedToSnake(k);
  return k.toLowerCase();
};
`.trim(),

  "utils/normalizeRow.js": `
const { normalizeKey } = require("./normalizeKey");
exports.normalizeRow = (row) => {
  const out = {}; for (const k in row) out[normalizeKey(k)] = row[k]; return out;
};
`.trim(),

  "utils/parseExcelFile.js": `
const XLSX = require("xlsx");
const { normalizeKey } = require("./normalizeKey");

exports.parseExcelFile = (filePath) => {
  const wb = XLSX.readFile(filePath);
  const sh = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1 });
  if (!rows.length) return [];
  const headers = rows[0].map(h => normalizeKey(String(h)));
  return rows.slice(1).map(r => {
    const o = {}; headers.forEach((k, i) => o[k] = r[i]); return o;
  });
};
`.trim(),

  "utils/bulkProcessStatus.js": `
// Replace with your real persistence. This is a stub using an in-memory Map.
const m = new Map();
exports.saveBulkStatus = async (id, payload) => { m.set(id, { ...(m.get(id)||{}), ...payload }); };
exports.getBulkStatus = async (id) => m.get(id) || null;
`.trim(),

  "utils/dbUtils.js": `
// Adapter: re-export your existing db utils if they live elsewhere.
// If your project already has '../utils/dbUtils', update this path or remove this file.
module.exports = require("../utils/dbUtils");
`.trim(),
};

// ensure dirs exist
const dirs = [
  "routes",
  "controllers",
  "services",
  "utils",
];

async function ensureDirs() {
  await Promise.all(dirs.map(d => fsp.mkdir(path.join(root, d), { recursive: true })));
}

async function writeFileSafe(filePath, content) {
  const abs = path.join(root, filePath);
  const exists = fs.existsSync(abs);
  if (exists && !OVERWRITE) {
    console.log(`skip (exists): ${filePath}`);
    return;
  }
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.writeFile(abs, content.trimStart() + "\n");
  console.log(`${exists ? "overwrote" : "created"}: ${filePath}`);
}

(async () => {
  try {
    await ensureDirs();
    for (const [fp, content] of Object.entries(files)) {
      await writeFileSafe(fp, content);
    }
    console.log(`\n✅ Done. ${OVERWRITE ? "Overwrote" : "Created"} files in: ${root}`);
  } catch (err) {
    console.error("Error scaffolding files:", err);
    process.exit(1);
  }
})();

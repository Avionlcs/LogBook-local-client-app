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
              message: `Validation failed in "${file.originalname}", row ${i + 2}: ${errs.join(", ")}`,
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
      await saveBulkStatus(processId, { status: "failed", message: `Unexpected error - ${e.message}` });
    }
  })();

  return processId;
};

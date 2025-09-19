const addBulkData = async (req, res) => {
  try {
    const { entity } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).send({ error: "No file uploaded" });
    }

    // required fields schema
    let requiredFields = {};
    if (req.body.requiredFields) {
      requiredFields =
        typeof req.body.requiredFields === "string"
          ? JSON.parse(req.body.requiredFields)
          : req.body.requiredFields;
    }

    // unique process id
    const processId = uuidv4();
    res.json({ processId }); // respond immediately

    // async process
    (async () => {
      let allResults = [];
      let insertedIds = [];

      try {
        // count total rows
        const totalRows = req.files.reduce(
          (sum, file) => sum + parseExcelFile(file.path).length,
          0
        );

        await saveBulkStatus(processId, {
          percentage: 0,
          status: "processing",
          totalRows,
          processedRows: 0,
        });

        let processedRows = 0;

        for (const file of req.files) {
          const dataArray = parseExcelFile(file.path);

          let rowIndex = 0;
          for (const rawRow of dataArray) {
            rowIndex++;
            const row = rawRow; 

            if (Object.keys(row).length === 0) continue;

            // validate row
            const validationErrors = validateRow(row, requiredFields);
            if (validationErrors.length > 0) {
              await saveBulkStatus(processId, {
                status: "failed",
                message: `Validation failed in file "${file.originalname}", row ${
                  rowIndex + 1
                }: ${validationErrors.join(", ")}`,
                percentage: ((processedRows / totalRows) * 100).toFixed(2),
                totalRows,
              });

              // rollback
              for (const id of insertedIds) {
                await deleteItem(entity, id);
              }
              return;
            }

            // insert row
            try {
              const result = await addData(entity, row, true);
              if (result && result.id) insertedIds.push(result.id);

              allResults.push({ row, status: "success", result });
            } catch (err) {
              await saveBulkStatus(processId, {
                status: "failed",
                message: `Insert failed in file "${file.originalname}", row ${
                  rowIndex + 1
                }: ${err.message}`,
                percentage: ((processedRows / totalRows) * 100).toFixed(2),
                totalRows,
              });

              for (const id of insertedIds) {
                await deleteItem(entity, id);
              }
              return;
            }

            processedRows++;
            await saveBulkStatus(processId, {
              status: "processing",
              percentage: ((processedRows / totalRows) * 100).toFixed(2),
              processedRows,
              totalRows,
            });
          }
        }

        await saveBulkStatus(processId, {
          status: "completed",
          percentage: 100,
          results: allResults,
          totalRows,
        });
      } catch (err) {
        await saveBulkStatus(processId, {
          status: "failed",
          message: `Unexpected error - ${err.message}`,
        });

        for (const id of insertedIds) {
          await deleteItem(entity, id);
        }
      }
    })();
  } catch (error) {
    res.status(500).send("Error: " + error.message);
  }
}

module.exports = addBulkData;
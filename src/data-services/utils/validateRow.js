exports.validateRow = (row, schema = {}) => {
  const errs = [];
  for (const k in schema) {
    const r = schema[k], v = row[k];
    if (r.required && (v === undefined || v === null || v === "")) { errs.push(`${k} is required`); continue; }
    if (v === undefined || v === null || v === "") continue;
    if (r.type === "number" && isNaN(Number(v))) errs.push(`${k} must be a number`);
    if (r.type === "string" && typeof v !== "string") errs.push(`${k} must be a string`);
    if (r.min !== undefined) {
      if (r.type === "string" && v.length < r.min) errs.push(`${k} must be at least ${r.min} characters`);
      if (r.type === "number" && Number(v) < r.min) errs.push(`${k} must be >= ${r.min}`);
    }
    if (r.max !== undefined) {
      if (r.type === "string" && v.length > r.max) errs.push(`${k} must be at most ${r.max} characters`);
      if (r.type === "number" && Number(v) > r.max) errs.push(`${k} must be <= ${r.max}`);
    }
    if (r.pattern === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errs.push(`${k} must be a valid email`);
    }
  }
  return errs;
};

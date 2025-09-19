function detectStyle(k) {
  if (/^[a-z]+([A-Z][a-z0-9]+)+$/.test(k)) return "camel";
  if (/^[A-Z][a-z0-9]+([A-Z][a-z0-9]+)*$/.test(k)) return "pascal";
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(k)) return "snake";
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(k)) return "kebab";
  if (/^[A-Z0-9_]+$/.test(k)) return "screaming";
  if (/\s+/.test(k)) return "spaced";
  return "unknown";
}
const camelToSnake = s => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
const pascalToSnake = s => camelToSnake(s[0].toLowerCase() + s.slice(1));
const kebabToSnake = s => s.toLowerCase().replace(/-+/g, "_");
const spacedToSnake = s => s.trim().toLowerCase().replace(/\s+/g, "_");

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

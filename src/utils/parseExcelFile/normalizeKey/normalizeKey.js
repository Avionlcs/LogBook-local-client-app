const camelToSnake = require("./camelToSnake");
const detectStyle = require("./detectStyle");
const kebabToSnake = require("./kebabToSnake");
const screamingToSnake = require("./screamingToSnake");
const spacedToSnake = require("./spacedToSnake");
const pascalToSnake = require("./pascalToSnake");


function normalizeKey(key) {
  if (!key) return "";

  const style = detectStyle(key);
  switch (style) {
    case "camel": return camelToSnake(key);
    case "pascal": return pascalToSnake(key);
    case "snake": return key.toLowerCase();
    case "kebab": return kebabToSnake(key);
    case "screaming": return screamingToSnake(key);
    case "spaced": return spacedToSnake(key);
    default:
      // Fallback: replace non-alphanumeric with underscores
      return key.trim().replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
  }
}

module.exports = normalizeKey;
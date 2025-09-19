function spacedToSnake(str) {
  return str.trim().replace(/\s+/g, "_").toLowerCase();
}

module.exports = spacedToSnake;
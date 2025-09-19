function kebabToSnake(str) {
  return str.replace(/-+/g, "_").toLowerCase();
}

module.exports = kebabToSnake;
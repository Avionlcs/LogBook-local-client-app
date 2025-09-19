function pascalToSnake(str) {
  return camelToSnake(str[0].toLowerCase() + str.slice(1));
}
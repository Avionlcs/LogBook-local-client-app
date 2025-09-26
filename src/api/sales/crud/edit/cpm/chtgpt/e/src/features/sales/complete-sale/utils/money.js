const MONEY_REGEX = /^\d+(\.\d{1,2})?$/;

function isValidMoney(value) {
  if (typeof value === 'number' && value < 0) return false;
  if (typeof value === 'string' && !MONEY_REGEX.test(value)) return false;
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

function toNumeric(value) {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

module.exports = {
  isValidMoney,
  toNumeric,
};

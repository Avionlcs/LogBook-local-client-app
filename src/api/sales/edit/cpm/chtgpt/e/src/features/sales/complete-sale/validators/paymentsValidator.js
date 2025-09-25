const { ValidationError } = require('../utils/errors');
const { isValidMoney, toNumeric } = require('../utils/money');

const ALLOWED_METHODS = new Set(['cash', 'card', 'qr']);

function validatePayments(payments, totalAmount) {
  if (payments.length > 10) {
    throw new ValidationError('Maximum of 10 payments allowed per transaction.');
  }

  let totalPaid = 0;
  for (const p of payments) {
    if (!ALLOWED_METHODS.has(p.method)) {
      throw new ValidationError(`Invalid payment method: ${p.method}`);
    }
    if (p.currency && p.currency !== 'LKR') {
      throw new ValidationError('Only LKR currency is supported.');
    }
    if (!isValidMoney(p.amount)) {
      throw new ValidationError(`Invalid payment amount: ${p.amount}`);
    }
    totalPaid += toNumeric(p.amount);
  }

  if (toNumeric(totalPaid) < toNumeric(totalAmount)) {
    throw new ValidationError(
      `Total paid (${totalPaid}) is less than total amount due (${totalAmount}).`
    );
  }

  return { totalPaid: totalPaid.toFixed(2) };
}

module.exports = validatePayments;

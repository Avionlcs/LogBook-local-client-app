const { ValidationError } = require('../utils/errors');

function validateRequest(body) {
  if (!body.sale_public_id || typeof body.sale_public_id !== 'string') {
    throw new ValidationError('Missing or invalid "sale_public_id".');
  }

  if (!Array.isArray(body.payments) || body.payments.length === 0) {
    throw new ValidationError('Missing or empty "payments" array.');
  }

  if (body.idempotency_key && typeof body.idempotency_key !== 'string') {
    throw new ValidationError('Invalid "idempotency_key".');
  }
}

module.exports = validateRequest;

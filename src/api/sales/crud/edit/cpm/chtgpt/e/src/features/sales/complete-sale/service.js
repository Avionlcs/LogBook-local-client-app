const { getPool } = require('../../../config/dbConfig');
const transaction = require('./utils/transaction');
const saleRepo = require('./repositories/saleRepository');
const paymentRepo = require('./repositories/paymentRepository');
const idemRepo = require('./repositories/idempotencyRepository');
const validateRequest = require('./validators/requestValidator');
const validatePayments = require('./validators/paymentsValidator');
const { toNumeric } = require('./utils/money');
const { NotFoundError, ConflictError } = require('./utils/errors');

async function execute(body) {
  validateRequest(body);
  const { sale_public_id, payments, idempotency_key } = body;

  if (idempotency_key) {
    const cached = await idemRepo.findByKey(idempotency_key);
    if (cached) return { isCached: true, ...cached };
  }

  const result = await transaction.execute(getPool(), async (client) => {
    const sale = await saleRepo.lockByPublicId(client, sale_public_id);
    if (!sale) throw new NotFoundError('Sale not found.');
    if (sale.status !== 'processing') {
      throw new ConflictError(`Sale status is "${sale.status}", not "processing".`);
    }

    const { totalAmount } = await saleRepo.calculateItemTotal(client, sale_public_id);
    const { totalPaid } = validatePayments(payments, totalAmount);
    await paymentRepo.insertMany(client, sale.id, payments);

    const finalSale = await saleRepo.finalize(client, sale.id, totalPaid, totalAmount);
    const saleItems = await saleRepo.getSaleItems(client, sale_public_id);
    const salePayments = await paymentRepo.listBySaleId(client, sale.id);

    return { sale: { ...finalSale, items: saleItems, payments: salePayments }, change_due: toNumeric(totalPaid) - toNumeric(totalAmount) };
  });

  const response = { success: true, message: 'Sale completed successfully', ...result };
  if (idempotency_key) {
    await idemRepo.save(idempotency_key, { statusCode: 200, body: response });
  }

  return response;
}

module.exports = { execute };

#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const fileMap = {
  'migrations/create_inventory_schema.js': `
module.exports = {
  async create(pool) {
    // Enable pgcrypto extension for gen_random_uuid()
    await pool.query(\`CREATE EXTENSION IF NOT EXISTS "pgcrypto";\`);

    // Main table for inventory items (core fields)
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        buy_price NUMERIC(12, 2) DEFAULT 0,
        sale_price NUMERIC(12, 2) DEFAULT 0,
        barcode TEXT,
        hash TEXT UNIQUE,
        sold INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    \`);

    // Flexible field metadata table (for user-added custom fields)
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS inventory_item_metadata (
        item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        field_name TEXT NOT NULL,
        field_value TEXT,
        PRIMARY KEY (item_id, field_name)
      );
    \`);

    // Indexes
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items(name);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(barcode);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory_items(stock);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_metadata_field_name ON inventory_item_metadata(field_name);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_metadata_field_value ON inventory_item_metadata(field_value);\`);
  }
};
  `.trim(),

  'migrations/create_sales_schema.js': `
module.exports = {
  async create(pool) {
    // 0) Extensions (safe if rerun)
    await pool.query(\`CREATE EXTENSION IF NOT EXISTS "pgcrypto";\`);

    // 1) Helper: bigint → BASE-36 (UPPER) ✅ cast to INT for substr()
    await pool.query(\`
      CREATE OR REPLACE FUNCTION to_base36_upper(n BIGINT) RETURNS TEXT AS $$
      DECLARE
        chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        result TEXT := '';
        x BIGINT := n;
      BEGIN
        IF x = 0 THEN
          RETURN '0';
        END IF;
        WHILE x > 0 LOOP
          result := substr(chars, ((x % 36)::INT) + 1, 1) || result;
          x := x / 36;
        END LOOP;
        RETURN result;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    \`);

    // 2) sales (public_id generated from numeric PK)
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED,
        CONSTRAINT uq_sales_public_id UNIQUE (public_id),

        seller_user_id TEXT NOT NULL,
        customer_user_id TEXT NOT NULL DEFAULT 'anonymous',

        card_payment_amount NUMERIC(12, 2) DEFAULT 0,
        card_payment_reference TEXT,

        cash_payment_amount NUMERIC(12, 2) DEFAULT 0,

        qr_payment_amount NUMERIC(12, 2) DEFAULT 0,
        qr_payment_reference TEXT,

        loyalty_claimed_amount NUMERIC(12, 2) DEFAULT 0,
        loyalty_reference TEXT,

        total_paid_amount NUMERIC(12, 2) DEFAULT 0,
        total_offer_discount NUMERIC(12, 2) DEFAULT 0,

        total_amount NUMERIC(12, 2) DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('sold','processing','paused','cancelled')) DEFAULT 'processing',

        payment_method TEXT,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    \`);

    // 3) sale_items — FK → sales.public_id and inventory_items.id
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED,
        CONSTRAINT uq_sale_items_public_id UNIQUE (public_id),

        sale_public_id TEXT NOT NULL,
        CONSTRAINT fk_sale_items_sale_public
          FOREIGN KEY (sale_public_id)
          REFERENCES sales(public_id)
          ON DELETE CASCADE,

        item_id UUID NOT NULL,
        CONSTRAINT fk_sale_items_inventory_item
          FOREIGN KEY (item_id)
          REFERENCES inventory_items(id)
          ON DELETE RESTRICT,

        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(12, 2) NOT NULL,
        total_price NUMERIC(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    \`);

    // 4) sale_offers — FK → sales.public_id
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS sale_offers (
        id SERIAL PRIMARY KEY,
        public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED,
        CONSTRAINT uq_sale_offers_public_id UNIQUE (public_id),

        sale_public_id TEXT NOT NULL,
        CONSTRAINT fk_sale_offers_sale_public
          FOREIGN KEY (sale_public_id)
          REFERENCES sales(public_id)
          ON DELETE CASCADE,

        offer_code TEXT NOT NULL,
        offer_description TEXT,
        discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    \`);

    // 5) Indexes (idempotent)
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_user_id);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_user_id);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sales_public_id ON sales(public_id);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_items_sale_public_id ON sale_items(sale_public_id);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_offers_sale_public_id ON sale_offers(sale_public_id);\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_offers_offer_code ON sale_offers(offer_code);\`);
  }
};
  `.trim(),

  'migrations/create_payment_tracking_schema.js': `
module.exports = {
  async create(pool) {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS idempotency_cache (
        key TEXT PRIMARY KEY,
        response_body JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    \`);

    await pool.query(\`
      CREATE TABLE IF NOT EXISTS sale_payments (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        CONSTRAINT fk_sale_payments_sale_id
          FOREIGN KEY (sale_id)
          REFERENCES sales(id)
          ON DELETE CASCADE,
        method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'qr')),
        amount NUMERIC(12, 2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'LKR',
        reference TEXT,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    \`);

    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);\`);
  },
};
  `.trim(),

  'src/features/sales/complete-sale/controller.js': `
const completeSaleService = require('./service');
const { sendSuccess, sendError } = require('./utils/responseHandler');
const { NotFoundError, ConflictError, ValidationError } = require('./utils/errors');

async function completeSale(req, res) {
  try {
    const result = await completeSaleService.execute(req.body);
    if (result.isCached) {
      res.status(result.statusCode).json(result.body);
    } else {
      sendSuccess(res, result, 'Sale completed successfully');
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendError(res, 400, error.message);
    }
    if (error instanceof NotFoundError) {
      return sendError(res, 404, error.message);
    }
    if (error instanceof ConflictError) {
      return sendError(res, 409, error.message);
    }
    console.error('Unhandled error in completeSale controller:', error);
    sendError(res, 500, 'An unexpected server error occurred.');
  }
}

module.exports = { completeSale };
  `.trim(),

  'src/features/sales/complete-sale/service.js': `
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
      throw new ConflictError(\`Sale status is "\${sale.status}", not "processing".\`);
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
  `.trim(),

  'src/features/sales/complete-sale/repositories/idempotencyRepository.js': `
const { getPool } = require('../../../config/dbConfig');

async function findByKey(key) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT response_body FROM idempotency_cache WHERE key = $1',
    [key]
  );
  return res.rows[0] ? JSON.parse(res.rows[0].response_body) : null;
}

async function save(key, response) {
  const pool = getPool();
  // Using a separate client to not interfere with any ongoing transaction
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO idempotency_cache (key, response_body) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [key, JSON.stringify(response)]
    );
  } finally {
    client.release();
  }
}

module.exports = { findByKey, save };
  `.trim(),

  'src/features/sales/complete-sale/repositories/paymentRepository.js': `
async function insertMany(client, saleId, payments) {
  const insertPromises = payments.map((p) => {
    const query = \`
      INSERT INTO sale_payments (sale_id, method, amount, currency, reference, meta)
      VALUES ($1, $2, $3, $4, $5, $6)
    \`;
    const values = [
      saleId,
      p.method,
      p.amount,
      p.currency || 'LKR',
      p.reference,
      p.meta,
    ];
    return client.query(query, values);
  });
  await Promise.all(insertPromises);
}

async function listBySaleId(client, saleId) {
  const res = await client.query('SELECT * FROM sale_payments WHERE sale_id = $1', [
    saleId,
  ]);
  return res.rows;
}

module.exports = { insertMany, listBySaleId };
  `.trim(),

  'src/features/sales/complete-sale/repositories/saleRepository.js': `
async function lockByPublicId(client, publicId) {
  const res = await client.query(
    'SELECT * FROM sales WHERE public_id = $1 FOR UPDATE',
    [publicId]
  );
  return res.rows[0] || null;
}

async function getSaleItems(client, publicId) {
  const res = await client.query(
    'SELECT * FROM sale_items WHERE sale_public_id = $1',
    [publicId]
  );
  return res.rows;
}

async function calculateItemTotal(client, publicId) {
  const res = await client.query(
    'SELECT COALESCE(SUM(total_price), 0)::NUMERIC(12,2) as "totalAmount" FROM sale_items WHERE sale_public_id = $1',
    [publicId]
  );
  return res.rows[0];
}

async function finalize(client, saleId, totalPaid, totalAmount) {
  const res = await client.query(
    \`UPDATE sales SET status = 'sold', total_paid_amount = $1, total_amount = $2, updated_at = NOW() WHERE id = $3 RETURNING *\`,
    [totalPaid, totalAmount, saleId]
  );
  return res.rows[0];
}

module.exports = { lockByPublicId, getSaleItems, calculateItemTotal, finalize };
  `.trim(),

  'src/features/sales/complete-sale/validators/paymentsValidator.js': `
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
      throw new ValidationError(\`Invalid payment method: \${p.method}\`);
    }
    if (p.currency && p.currency !== 'LKR') {
      throw new ValidationError('Only LKR currency is supported.');
    }
    if (!isValidMoney(p.amount)) {
      throw new ValidationError(\`Invalid payment amount: \${p.amount}\`);
    }
    totalPaid += toNumeric(p.amount);
  }

  if (toNumeric(totalPaid) < toNumeric(totalAmount)) {
    throw new ValidationError(
      \`Total paid (\${totalPaid}) is less than total amount due (\${totalAmount}).\`
    );
  }

  return { totalPaid: totalPaid.toFixed(2) };
}

module.exports = validatePayments;
  `.trim(),

  'src/features/sales/complete-sale/validators/requestValidator.js': `
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
  `.trim(),

  'src/features/sales/complete-sale/utils/errors.js': `
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

module.exports = {
  ValidationError,
  NotFoundError,
  ConflictError,
};
  `.trim(),

  'src/features/sales/complete-sale/utils/money.js': `
const MONEY_REGEX = /^\\d+(\\.\\d{1,2})?$/;

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
  `.trim(),

  'src/features/sales/complete-sale/utils/responseHandler.js': `
function sendSuccess(res, data, message = 'Operation successful') {
  const response = {
    success: true,
    message,
    ...data,
  };
  res.status(200).json(response);
}

function sendError(res, statusCode, message, errors = []) {
  const response = {
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
  };
  res.status(statusCode).json(response);
}

module.exports = {
  sendSuccess,
  sendError,
};
  `.trim(),

  'src/features/sales/complete-sale/utils/transaction.js': `
async function execute(pool, callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { execute };
  `.trim(),
};

async function main() {
  const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      acc[key.substring(2)] = value === undefined ? true : value;
    }
    return acc;
  }, {});

  const config = {
    root: args.root || process.cwd(),
    overwrite: !!args.overwrite,
    dryRun: !!args['dry-run'],
    silent: !!args.silent,
  };

  const log = (...messages) => {
    if (!config.silent) {
      console.log(...messages);
    }
  };

  const resolvedRoot = path.resolve(config.root);
  const stats = { created: 0, overwritten: 0, skipped: 0, errors: 0 };

  log(`Scaffolding into: ${resolvedRoot}\n`);

  for (const [relativePath, content] of Object.entries(fileMap)) {
    try {
      const finalPath = path.resolve(resolvedRoot, relativePath);

      if (!finalPath.startsWith(resolvedRoot)) {
        throw new Error(`Path escape detected: ${finalPath}`);
      }

      const dirName = path.dirname(finalPath);

      if (config.dryRun) {
        log(`[DRY RUN] Plan to create: ${finalPath}`);
        continue;
      }

      await fs.mkdir(dirName, { recursive: true });

      let fileExists = false;
      try {
        await fs.access(finalPath);
        fileExists = true;
      } catch {
        // file does not exist
      }

      if (fileExists && !config.overwrite) {
        log(`[SKIP]      ${relativePath} (already exists)`);
        stats.skipped++;
      } else {
        await fs.writeFile(finalPath, content.trim() + '\n');
        const action = fileExists ? 'OVERWRITE' : 'CREATE';
        log(`[${action}]   ${relativePath}`);
        stats[action.toLowerCase()]++;
      }
    } catch (error) {
      console.error(`[ERROR] Failed to write ${relativePath}:`, error.message);
      stats.errors++;
    }
  }

  if (!config.silent) {
    console.log(
      `\nDONE. Created: ${stats.created}, Overwritten: ${
        stats.overwritten
      }, Skipped: ${stats.skipped}, Errors: ${stats.errors}`
    );
  }

  if (stats.errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('A fatal error occurred:', err);
  process.exit(1);
});
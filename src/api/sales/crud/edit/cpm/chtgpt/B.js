const fs = require('fs/promises');
const path = require('path');

(async () => {
  let root = process.cwd();
  let overwrite = false;
  let dryRun = false;
  let silent = false;

  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--root=')) root = arg.slice(7);
    else if (arg === '--overwrite') overwrite = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--silent') silent = true;
    else {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
  });

  root = path.resolve(root);

  const fileMap = {
    'migrations/create_sales_schema.js': `module.exports = {
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
};`,
    'migrations/create_inventory_schema.js': `module.exports = {
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

        // Indexes for standard inventory fields
        await pool.query(\`CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items(name);\`);
        await pool.query(\`CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(barcode);\`);
        await pool.query(\`CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory_items(stock);\`);

        // Indexes for metadata searching
        await pool.query(\`CREATE INDEX IF NOT EXISTS idx_metadata_field_name ON inventory_item_metadata(field_name);\`);
        await pool.query(\`CREATE INDEX IF NOT EXISTS idx_metadata_field_value ON inventory_item_metadata(field_value);\`);
    }
};`,
    'migrations/create_additional_sales_tables.js': `module.exports = {
  async create(pool) {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS sale_payments (
        id SERIAL PRIMARY KEY,
        public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED,
        CONSTRAINT uq_sale_payments_public_id UNIQUE (public_id),
        sale_public_id TEXT NOT NULL,
        CONSTRAINT fk_sale_payments_sale_public
          FOREIGN KEY (sale_public_id)
          REFERENCES sales(public_id)
          ON DELETE CASCADE,
        method TEXT NOT NULL CHECK (method IN ('cash','card','qr')),
        amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
        currency TEXT NOT NULL DEFAULT 'LKR',
        reference TEXT,
        meta JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    \`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_public_id ON sale_payments(sale_public_id);\`);
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL,
        sale_public_id TEXT NOT NULL,
        response JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT uq_idempotency_key_sale UNIQUE (key, sale_public_id)
      );
    \`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_idempotency_sale_public_id ON idempotency_keys(sale_public_id);\`);
  }
};`,
    'app/utils/moneyUtils.js': `const isValidMoney = (value) => {
  if (typeof value === 'number') value = value.toString();
  if (typeof value !== 'string') return false;
  const regex = /^\\d+(\\.\\d{1,2})?$/;
  return regex.test(value) && parseFloat(value) > 0;
};

const toNum = (value) => parseFloat(parseFloat(value).toFixed(2));

module.exports = { isValidMoney, toNum };`,
    'app/utils/transactionHelper.js': `const dbConfig = require("../../../config/dbConfig");

const withTransaction = async (callback) => {
  const pool = dbConfig.getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = withTransaction;`,
    'app/validators/completeSaleValidator.js': `const validateRequest = (body) => {
  if (!body.sale_public_id || typeof body.sale_public_id !== 'string') throw new Error('validation_error');
  if (!Array.isArray(body.payments) || body.payments.length === 0 || body.payments.length > 10) throw new Error('validation_error');
  if (body.idempotency_key && typeof body.idempotency_key !== 'string') throw new Error('validation_error');
};

module.exports = validateRequest;`,
    'app/validators/paymentValidator.js': `const { isValidMoney } = require('../utils/moneyUtils');

const validatePayment = (p) => {
  if (!['cash', 'card', 'qr'].includes(p.method)) throw new Error('validation_error');
  if (!isValidMoney(p.amount)) throw new Error('validation_error');
  if (p.currency && p.currency !== 'LKR') throw new Error('validation_error');
  if (p.reference && typeof p.reference !== 'string') throw new Error('validation_error');
  if (p.meta && typeof p.meta !== 'object') throw new Error('validation_error');
};

module.exports = validatePayment;`,
    'app/repositories/checkSaleExistsRepo.js': `const checkSaleExists = async (client, salePublicId) => {
  const { rowCount } = await client.query('SELECT 1 FROM sales WHERE public_id = $1;', [salePublicId]);
  return rowCount > 0;
};

module.exports = checkSaleExists;`,
    'app/repositories/finalizeSaleRepo.js': `const finalizeSale = async (client, salePublicId, totalAmount, totalDiscount, totalPaid, status) => {
  const query = \`
    UPDATE sales 
    SET total_amount = $2, 
    total_offer_discount = $3, 
    total_paid_amount = $4, 
    status = $5, 
    updated_at = NOW() 
    WHERE public_id = $1;
  \`;
  await client.query(query, [salePublicId, totalAmount, totalDiscount, totalPaid, status]);
};

module.exports = finalizeSale;`,
    'app/repositories/getSaleItemsRepo.js': `const getSaleItems = async (client, salePublicId) => {
  const query = 'SELECT * FROM sale_items WHERE sale_public_id = $1;';
  const { rows } = await client.query(query, [salePublicId]);
  return rows;
};

module.exports = getSaleItems;`,
    'app/repositories/getSaleRepo.js': `const getSale = async (client, salePublicId) => {
  const query = 'SELECT * FROM sales WHERE public_id = $1;';
  const { rows } = await client.query(query, [salePublicId]);
  return rows[0];
};

module.exports = getSale;`,
    'app/repositories/lockSaleRepo.js': `const lockSale = async (client, salePublicId) => {
  const query = 'SELECT * FROM sales WHERE public_id = $1 AND status = \\'processing\\' FOR UPDATE;';
  const { rows } = await client.query(query, [salePublicId]);
  return rows[0] || null;
};

module.exports = lockSale;`,
    'app/repositories/sumSaleDiscountsRepo.js': `const sumSaleDiscounts = async (client, salePublicId) => {
  const query = 'SELECT SUM(discount_amount) AS total_discount FROM sale_offers WHERE sale_public_id = $1;';
  const { rows } = await client.query(query, [salePublicId]);
  return parseFloat(rows[0].total_discount || 0);
};

module.exports = sumSaleDiscounts;`,
    'app/repositories/sumSaleItemsRepo.js': `const sumSaleItems = async (client, salePublicId) => {
  const query = 'SELECT SUM(total_price) AS total FROM sale_items WHERE sale_public_id = $1;';
  const { rows } = await client.query(query, [salePublicId]);
  return parseFloat(rows[0].total || 0);
};

module.exports = sumSaleItems;`,
    'app/repositories/insertPaymentRepo.js': `const { toNum } = require('../utils/moneyUtils');

const insertPayment = async (client, salePublicId, payment) => {
  const query = \`
    INSERT INTO sale_payments (sale_public_id, method, amount, currency, reference, meta) 
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
  \`;
  const values = [salePublicId, payment.method, toNum(payment.amount), payment.currency || 'LKR', payment.reference, JSON.stringify(payment.meta || {})];
  const { rows } = await client.query(query, values);
  return rows[0];
};

module.exports = insertPayment;`,
    'app/repositories/listPaymentsRepo.js': `const listPayments = async (client, salePublicId) => {
  const query = 'SELECT * FROM sale_payments WHERE sale_public_id = $1 ORDER BY created_at;';
  const { rows } = await client.query(query, [salePublicId]);
  return rows;
};

module.exports = listPayments;`,
    'app/repositories/sumPaymentsRepo.js': `const { toNum } = require('../utils/moneyUtils');

const sumPayments = async (client, payments) => {
  if (payments.length === 0) return 0;
  const valuesClause = payments.map((_, i) => \`($\${i+1}::NUMERIC(12,2))\`).join(',');
  const query = \`SELECT SUM(value) AS total FROM (VALUES \${valuesClause}) AS t(value);\`;
  const values = payments.map(p => toNum(p.amount));
  const { rows } = await client.query(query, values);
  return parseFloat(rows[0].total || 0);
};

module.exports = sumPayments;`,
    'app/repositories/findIdempotencyRepo.js': `const findIdempotency = async (client, salePublicId, key) => {
  if (!key) return null;
  const query = 'SELECT response FROM idempotency_keys WHERE sale_public_id = $1 AND key = $2;';
  const { rows } = await client.query(query, [salePublicId, key]);
  return rows[0] ? rows[0].response : null;
};

module.exports = findIdempotency;`,
    'app/repositories/saveIdempotencyRepo.js': `const saveIdempotency = async (client, salePublicId, key, response) => {
  if (!key) return;
  const query = \`
    INSERT INTO idempotency_keys (key, sale_public_id, response) 
    VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;
  \`;
  await client.query(query, [key, salePublicId, response]);
};

module.exports = saveIdempotency;`,
    'app/services/completeSaleService.js': `const withTransaction = require('../utils/transactionHelper');
const validateRequest = require('../validators/completeSaleValidator');
const validatePayment = require('../validators/paymentValidator');
const checkSaleExists = require('../repositories/checkSaleExistsRepo');
const finalizeSale = require('../repositories/finalizeSaleRepo');
const getSaleItems = require('../repositories/getSaleItemsRepo');
const getSale = require('../repositories/getSaleRepo');
const lockSale = require('../repositories/lockSaleRepo');
const sumSaleDiscounts = require('../repositories/sumSaleDiscountsRepo');
const sumSaleItems = require('../repositories/sumSaleItemsRepo');
const insertPayment = require('../repositories/insertPaymentRepo');
const listPayments = require('../repositories/listPaymentsRepo');
const sumPayments = require('../repositories/sumPaymentsRepo');
const findIdempotency = require('../repositories/findIdempotencyRepo');
const saveIdempotency = require('../repositories/saveIdempotencyRepo');

const completeSale = async (body) => {
  validateRequest(body);
  body.payments.forEach(validatePayment);
  return await withTransaction(async (client) => {
    const { sale_public_id, payments, idempotency_key } = body;
    const cached = await findIdempotency(client, sale_public_id, idempotency_key);
    if (cached) return cached;
    const sale = await lockSale(client, sale_public_id);
    if (!sale) {
      const exists = await checkSaleExists(client, sale_public_id);
      if (!exists) throw new Error('sale_not_found');
      throw new Error('sale_wrong_state');
    }
    const items = await getSaleItems(client, sale_public_id);
    const sumItems = await sumSaleItems(client, sale_public_id);
    const sumDiscounts = await sumSaleDiscounts(client, sale_public_id);
    const totalAmount = sumItems - sumDiscounts;
    const sumPaid = await sumPayments(client, payments);
    const changeDue = sumPaid - totalAmount;
    if (changeDue < 0) throw new Error('insufficient_payment');
    const insertedPayments = [];
    for (const p of payments) {
      const inserted = await insertPayment(client, sale_public_id, p);
      insertedPayments.push(inserted);
    }
    await finalizeSale(client, sale_public_id, totalAmount, sumDiscounts, sumPaid, 'sold');
    const updatedSale = await getSale(client, sale_public_id);
    const response = {
      success: true,
      message: 'Sale completed successfully',
      sale: {
        ...updatedSale,
        change_due: changeDue.toFixed(2),
        items,
        payments: insertedPayments
      }
    };
    await saveIdempotency(client, sale_public_id, idempotency_key, response);
    return response;
  });
};

module.exports = completeSale;`,
    'app/controllers/completeSaleController.js': `const completeSaleService = require('../services/completeSaleService');

module.exports = async (req, res) => {
  try {
    const result = await completeSaleService(req.body);
    res.json(result);
  } catch (err) {
    let status = 500;
    let errorMsg = 'Server error';
    if (err.message === 'sale_not_found') {
      status = 404;
      errorMsg = 'Sale not found';
    } else if (err.message === 'sale_wrong_state') {
      status = 409;
      errorMsg = 'Sale in wrong state';
    } else if (err.message === 'insufficient_payment' || err.message === 'validation_error') {
      status = 400;
      errorMsg = err.message === 'insufficient_payment' ? 'Insufficient payment' : 'Validation error';
    }
    res.status(status).json({ success: false, error: errorMsg });
  }
};`
  };

  let created = 0;
  let overwritten = 0;
  let skipped = 0;

  try {
    for (const [relPath, content] of Object.entries(fileMap)) {
      const fullPath = path.normalize(path.join(root, relPath));
      if (!fullPath.startsWith(root + path.sep) && !fullPath.startsWith(root)) {
        console.error(`Path escaping: ${relPath}`);
        process.exit(1);
      }
      const dir = path.dirname(fullPath);
      if (!dryRun) await fs.mkdir(dir, { recursive: true });
      let exists = true;
      try {
        await fs.access(fullPath);
      } catch {
        exists = false;
      }
      if (exists && !overwrite) {
        if (!silent) console.log(`SKIP ${relPath}`);
        skipped++;
        continue;
      }
      if (!dryRun) {
        await fs.writeFile(fullPath, content + '\\n');
      }
      if (!silent) console.log(`${exists ? 'OVERWRITE' : 'CREATE'} ${relPath}`);
      exists ? overwritten++ : created++;
    }
    if (!silent) console.log(`DONE: created ${created}, overwritten ${overwritten}, skipped ${skipped}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
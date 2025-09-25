#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');

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
};
`,

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
};
`,

  'features/complete-sale/controller/completeSaleController.js': `const completeSaleService = require('../service/completeSaleService');

async function completeSale(req, res) {
  try {
    const result = await completeSaleService.execute(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

module.exports = { completeSale };
`,

  'features/complete-sale/service/completeSaleService.js': `const validateRequest = require('../validators/validateRequest');
const idempotencyRepo = require('../repositories/idempotencyRepository');
const saleRepo = require('../repositories/saleRepository');
const paymentRepo = require('../repositories/paymentRepository');
const withTransaction = require('../helpers/transactionHelper');
const { toNum } = require('../utils/moneyUtils');

async function execute(body) {
  validateRequest(body);
  const { sale_public_id, payments, idempotency_key } = body;
  
  if (idempotency_key) {
    const cached = await idempotencyRepo.find(idempotency_key);
    if (cached) return cached;
  }
  
  const result = await withTransaction(async (client) => {
    const sale = await saleRepo.lockForUpdate(client, sale_public_id);
    if (!sale) throw { statusCode: 404, message: 'Sale not found' };
    if (sale.status !== 'processing') throw { statusCode: 409, message: 'Sale not in processing state' };
    
    const [items, itemTotal, totalPaid] = await Promise.all([
      saleRepo.getItems(client, sale_public_id),
      saleRepo.sumItems(client, sale_public_id),
      paymentRepo.sumPayments(client, payments)
    ]);
    
    if (toNum(totalPaid) < toNum(itemTotal)) throw { statusCode: 400, message: 'Insufficient payment' };
    
    await paymentRepo.insertMultiple(client, sale_public_id, payments);
    const updatedSale = await saleRepo.finalizeSale(client, sale_public_id, totalPaid, itemTotal);
    const allPayments = await paymentRepo.listBySale(client, sale_public_id);
    
    return { success: true, message: 'Sale completed successfully', 
             sale: { ...updatedSale, items, payments: allPayments } };
  });
  
  if (idempotency_key) await idempotencyRepo.save(idempotency_key, result);
  return result;
}

module.exports = { execute };
`,

  'features/complete-sale/validators/validateRequest.js': `const validatePayment = require('./validatePayment');

function validateRequest(body) {
  if (!body || typeof body !== 'object') {
    throw { statusCode: 400, message: 'Invalid request body' };
  }
  
  const { sale_public_id, payments } = body;
  
  if (!sale_public_id || typeof sale_public_id !== 'string') {
    throw { statusCode: 400, message: 'Invalid sale_public_id' };
  }
  
  if (!Array.isArray(payments) || payments.length === 0) {
    throw { statusCode: 400, message: 'Payments array is required' };
  }
  
  if (payments.length > 10) {
    throw { statusCode: 400, message: 'Maximum 10 payments allowed' };
  }
  
  payments.forEach((payment, index) => {
    try {
      validatePayment(payment);
    } catch (error) {
      throw { statusCode: 400, message: \`Payment[\${index}]: \${error.message}\` };
    }
  });
}

module.exports = validateRequest;
`,

  'features/complete-sale/validators/validatePayment.js': `const { isValidMoney } = require('../utils/moneyUtils');

function validatePayment(payment) {
  if (!payment || typeof payment !== 'object') {
    throw new Error('Invalid payment object');
  }
  
  const { method, amount, currency } = payment;
  
  if (!['cash', 'card', 'qr'].includes(method)) {
    throw new Error('Invalid payment method');
  }
  
  if (!isValidMoney(amount)) {
    throw new Error('Invalid payment amount');
  }
  
  if (currency && currency !== 'LKR') {
    throw new Error('Only LKR currency is supported');
  }
  
  if (payment.reference && typeof payment.reference !== 'string') {
    throw new Error('Invalid reference');
  }
  
  if (payment.meta && typeof payment.meta !== 'object') {
    throw new Error('Invalid meta data');
  }
}

module.exports = validatePayment;
`,

  'features/complete-sale/utils/moneyUtils.js': `function isValidMoney(value) {
  if (value === null || value === undefined) return false;
  const num = toNum(value);
  if (isNaN(num) || num <= 0) return false;
  const str = value.toString();
  const parts = str.split('.');
  if (parts.length === 2 && parts[1].length > 2) return false;
  return true;
}

function toNum(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return NaN;
}

function round2dp(value) {
  return Math.round(toNum(value) * 100) / 100;
}

module.exports = { isValidMoney, toNum, round2dp };
`,

  'features/complete-sale/helpers/transactionHelper.js': `const { getPool } = require('../../../config/dbConfig');

async function withTransaction(callback) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
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

module.exports = withTransaction;
`,

  'features/complete-sale/repositories/saleRepository.js': `async function lockForUpdate(client, salePublicId) {
  const query = 'SELECT * FROM sales WHERE public_id = $1 FOR UPDATE';
  const result = await client.query(query, [salePublicId]);
  return result.rows[0];
}

async function finalizeSale(client, salePublicId, totalPaid, totalAmount) {
  const query = \`UPDATE sales SET status = 'sold', total_paid_amount = $2,
    total_amount = $3, updated_at = NOW() WHERE public_id = $1 RETURNING *\`;
  const result = await client.query(query, [salePublicId, totalPaid, totalAmount]);
  return result.rows[0];
}

async function getItems(client, salePublicId) {
  const query = 'SELECT * FROM sale_items WHERE sale_public_id = $1';
  const result = await client.query(query, [salePublicId]);
  return result.rows;
}

async function sumItems(client, salePublicId) {
  const query = 'SELECT COALESCE(SUM(total_price), 0)::NUMERIC(12,2) as total FROM sale_items WHERE sale_public_id = $1';
  const result = await client.query(query, [salePublicId]);
  return result.rows[0].total;
}

module.exports = { lockForUpdate, finalizeSale, getItems, sumItems };
`,

  'features/complete-sale/repositories/paymentRepository.js': `const { toNum } = require('../utils/moneyUtils');

async function insertMultiple(client, salePublicId, payments) {
  const query = \`INSERT INTO sale_payments (sale_public_id, method, amount, currency, reference, meta)
    VALUES ($1, $2, $3, $4, $5, $6)\`;
  
  for (const payment of payments) {
    await client.query(query, [
      salePublicId, payment.method, toNum(payment.amount),
      payment.currency || 'LKR', payment.reference || null,
      JSON.stringify(payment.meta || {})
    ]);
  }
}

async function listBySale(client, salePublicId) {
  const query = 'SELECT * FROM sale_payments WHERE sale_public_id = $1';
  const result = await client.query(query, [salePublicId]);
  return result.rows;
}

async function sumPayments(client, payments) {
  const values = payments.map(p => \`(\${toNum(p.amount)}::NUMERIC(12,2))\`).join(',');
  const query = \`SELECT COALESCE(SUM(column1), 0)::NUMERIC(12,2) as total FROM (VALUES \${values}) t\`;
  const result = await client.query(query);
  return result.rows[0].total;
}

module.exports = { insertMultiple, listBySale, sumPayments };
`,

  'features/complete-sale/repositories/idempotencyRepository.js': `const cache = new Map();

async function find(key) {
  return cache.get(key) || null;
}

async function save(key, response) {
  cache.set(key, response);
  setTimeout(() => cache.delete(key), 3600000);
}

module.exports = { find, save };
`,

  'features/complete-sale/migrations/add_sale_payments_table.js': `module.exports = {
  async up(pool) {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS sale_payments (
        id SERIAL PRIMARY KEY,
        sale_public_id TEXT NOT NULL,
        method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'qr')),
        amount NUMERIC(12, 2) NOT NULL,
        currency TEXT DEFAULT 'LKR',
        reference TEXT,
        meta JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_payment_sale FOREIGN KEY (sale_public_id)
          REFERENCES sales(public_id) ON DELETE CASCADE
      )
    \`);
    
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_public_id)\`);
    await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_payments_method ON sale_payments(method)\`);
  }
};
`
};

async function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    root: process.cwd(),
    overwrite: false,
    dryRun: false,
    silent: false
  };
  
  for (const arg of args) {
    if (arg === '--overwrite') options.overwrite = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--silent') options.silent = true;
    else if (arg.startsWith('--root=')) options.root = arg.slice(7);
  }
  
  return options;
}

async function ensureWithinRoot(root, filePath) {
  const resolved = path.resolve(root, filePath);
  const normalizedRoot = path.resolve(root);
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error(\`Path escapes root: \${filePath}\`);
  }
  return resolved;
}

async function main() {
  try {
    const options = await parseArgs();
    const log = options.silent ? () => {} : console.log;
    
    let created = 0, overwritten = 0, skipped = 0;
    
    for (const [relPath, content] of Object.entries(fileMap)) {
      const fullPath = await ensureWithinRoot(options.root, relPath);
      
      if (options.dryRun) {
        log(\`[DRY-RUN] Would write: \${relPath}\`);
        continue;
      }
      
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      
      try {
        const exists = await fs.access(fullPath).then(() => true).catch(() => false);
        if (exists && !options.overwrite) {
          log(\`[SKIP] \${relPath}\`);
          skipped++;
        } else {
          await fs.writeFile(fullPath, content + '\n');
          log(\`[\${exists ? 'OVERWRITE' : 'CREATE'}] \${relPath}\`);
          exists ? overwritten++ : created++;
        }
      } catch (err) {
        throw new Error(\`Failed to write \${relPath}: \${err.message}\`);
      }
    }
    
    if (!options.dryRun && !options.silent) {
      console.log(\`\n[DONE] Created: \${created}, Overwritten: \${overwritten}, Skipped: \${skipped}\`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(\`[ERROR] \${error.message}\`);
    process.exit(1);
  }
}

main();

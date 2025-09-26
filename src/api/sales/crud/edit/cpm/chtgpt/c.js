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

  'controllers/saleController.js': `const completeSaleService = require('../services/completeSaleService');

async function completeSale(req, res) {
  try {
    const result = await completeSaleService.complete(req.body);
    res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = { completeSale };`,

  'services/completeSaleService.js': `const { withTransaction } = require('../utils/transactionHelper');
const saleValidator = require('../validators/saleValidator');
const moneyUtils = require('../utils/moneyUtils');
const idempotencyRepo = require('../repositories/idempotencyRepo');
const saleRepo = require('../repositories/saleRepo');

async function complete(saleData) {
  saleValidator.validateCompleteSale(saleData);
  
  return await withTransaction(async (client) => {
    if (saleData.idempotency_key) {
      const cached = await idempotencyRepo.find(client, saleData.idempotency_key);
      if (cached) return cached.response_data;
    }

    await saleRepo.lockSale(client, saleData.sale_public_id);
    const items = await saleRepo.getItems(client, saleData.sale_public_id);
    const totalAmount = await saleRepo.sumItems(client, saleData.sale_public_id);
    
    const paidAmount = moneyUtils.sumPayments(saleData.payments);
    if (moneyUtils.toNum(paidAmount) < moneyUtils.toNum(totalAmount)) {
      throw { status: 400, message: 'Insufficient payment' };
    }

    await saleRepo.insertPayments(client, saleData);
    await saleRepo.finalizeSale(client, saleData.sale_public_id, paidAmount);
    
    const payments = await saleRepo.listPayments(client, saleData.sale_public_id);
    const sale = await saleRepo.getSale(client, saleData.sale_public_id);
    
    const result = {
      success: true,
      message: 'Sale completed successfully',
      sale: { ...sale, items, payments }
    };

    if (saleData.idempotency_key) {
      await idempotencyRepo.save(client, saleData.idempotency_key, result);
    }

    return result;
  });
}

module.exports = { complete };`,

  'validators/saleValidator.js': `const moneyUtils = require('../utils/moneyUtils');

function validateCompleteSale(data) {
  if (!data.sale_public_id) throw { status: 400, message: 'Sale ID required' };
  if (!data.payments || !Array.isArray(data.payments)) {
    throw { status: 400, message: 'Payments array required' };
  }
  if (data.payments.length > 10) throw { status: 400, message: 'Max 10 payments allowed' };
  
  data.payments.forEach(payment => {
    if (!['cash', 'card', 'qr'].includes(payment.method)) {
      throw { status: 400, message: 'Invalid payment method' };
    }
    if (!moneyUtils.isValidMoney(payment.amount)) {
      throw { status: 400, message: 'Invalid payment amount' };
    }
    if (payment.currency && payment.currency !== 'LKR') {
      throw { status: 400, message: 'Only LKR currency supported' };
    }
  });
}

module.exports = { validateCompleteSale };`,

  'utils/moneyUtils.js': `function isValidMoney(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && Number.isInteger(num * 100);
}

function toNum(value) {
  return parseFloat(value);
}

function roundTo2dp(value) {
  return Math.round(value * 100) / 100;
}

function sumPayments(payments) {
  return payments.reduce((sum, p) => sum + toNum(p.amount), 0);
}

module.exports = { isValidMoney, toNum, roundTo2dp, sumPayments };`,

  'utils/transactionHelper.js': `async function withTransaction(callback) {
  const pool = require('../../../config/dbConfig').getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ');
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

module.exports = { withTransaction };`,

  'repositories/saleRepo.js': `async function lockSale(client, salePublicId) {
  const result = await client.query(
    'SELECT * FROM sales WHERE public_id = $1 FOR UPDATE',
    [salePublicId]
  );
  if (result.rows.length === 0) throw { status: 404, message: 'Sale not found' };
  if (result.rows[0].status !== 'processing') {
    throw { status: 409, message: 'Sale already completed' };
  }
  return result.rows[0];
}

async function getItems(client, salePublicId) {
  const result = await client.query(
    'SELECT * FROM sale_items WHERE sale_public_id = $1',
    [salePublicId]
  );
  return result.rows;
}

async function sumItems(client, salePublicId) {
  const result = await client.query(
    \`SELECT COALESCE(SUM(total_price), 0) as total FROM sale_items WHERE sale_public_id = $1\`,
    [salePublicId]
  );
  return result.rows[0].total;
}

async function insertPayments(client, saleData) {
  for (const payment of saleData.payments) {
    await client.query(
      \`INSERT INTO sale_payments (sale_public_id, method, amount, currency, reference, meta)
       VALUES ($1, $2, $3, $4, $5, $6)\`,
      [saleData.sale_public_id, payment.method, payment.amount, 
       payment.currency || 'LKR', payment.reference, payment.meta]
    );
  }
}

async function finalizeSale(client, salePublicId, paidAmount) {
  await client.query(
    \`UPDATE sales SET status = 'sold', total_paid_amount = $1, updated_at = NOW() 
     WHERE public_id = $2\`,
    [paidAmount, salePublicId]
  );
}

async function listPayments(client, salePublicId) {
  const result = await client.query(
    'SELECT * FROM sale_payments WHERE sale_public_id = $1 ORDER BY created_at',
    [salePublicId]
  );
  return result.rows;
}

async function getSale(client, salePublicId) {
  const result = await client.query(
    'SELECT * FROM sales WHERE public_id = $1',
    [salePublicId]
  );
  return result.rows[0];
}

module.exports = { lockSale, getItems, sumItems, insertPayments, finalizeSale, listPayments, getSale };`,

  'repositories/idempotencyRepo.js': `async function find(client, key) {
  const result = await client.query(
    'SELECT response_data FROM idempotency_keys WHERE key = $1 AND expires_at > NOW()',
    [key]
  );
  return result.rows[0];
}

async function save(client, key, responseData) {
  await client.query(
    \`INSERT INTO idempotency_keys (key, response_data, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '24 hours')
     ON CONFLICT (key) DO UPDATE SET response_data = $2, expires_at = NOW() + INTERVAL '24 hours'\`,
    [key, responseData]
  );
}

module.exports = { find, save };`
};

async function scaffold() {
  const args = process.argv.slice(2);
  const options = {
    root: process.cwd(),
    overwrite: false,
    dryRun: false,
    silent: false
  };

  for (const arg of args) {
    if (arg.startsWith('--root=')) {
      options.root = path.resolve(arg.split('=')[1]);
    } else if (arg === '--overwrite') {
      options.overwrite = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--silent') {
      options.silent = true;
    }
  }

  try {
    const stats = { created: 0, skipped: 0, overwritten: 0 };
    
    for (const [filePath, content] of Object.entries(fileMap)) {
      const fullPath = path.join(options.root, filePath);
      const dir = path.dirname(fullPath);
      
      if (!fullPath.startsWith(options.root)) {
        throw new Error('Path traversal detected');
      }

      if (!options.dryRun) {
        await fs.mkdir(dir, { recursive: true });
      }

      let fileExists = false;
      try {
        await fs.access(fullPath);
        fileExists = true;
      } catch (e) {}

      if (fileExists && !options.overwrite) {
        if (!options.silent) console.log(`SKIP ${filePath}`);
        stats.skipped++;
        continue;
      }

      if (options.dryRun) {
        console.log(`${fileExists ? 'OVERWRITE' : 'CREATE'} ${filePath}`);
      } else {
        await fs.writeFile(fullPath, content + '\n');
        if (!options.silent) {
          console.log(`${fileExists ? 'OVERWRITE' : 'CREATE'} ${filePath}`);
        }
      }

      if (fileExists) stats.overwritten++;
      else stats.created++;
    }

    if (!options.silent && !options.dryRun) {
      console.log(`DONE: ${stats.created} created, ${stats.overwritten} overwritten, ${stats.skipped} skipped`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  scaffold();
}
#!/usr/bin/env node
/* scaffold-complete-sale.js */
const { argv, exit, cwd } = process;
const path = require('path');
const fs = require('fs/promises');

const args = Object.fromEntries(
  argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
  })
);

const ROOT = path.resolve(args.root || cwd());
const DRY = !!args['dry-run'];
const OVER = !!args['overwrite'];
const SILENT = !!args['silent'];
function log(...xs){ if(!SILENT) console.log(...xs); }
function err(...xs){ console.error(...xs); }

const fileMap = {
  'src/api/sales/complete/completeSale.controller.js': `
// Controller: complete sale
const service = require("./completeSale.service");
module.exports = async function completeSaleController(req, res) {
  try {
    const result = await service.completeSale(req.body || {});
    res.status(200).json({ success: true, message: "Sale completed successfully", sale: result });
  } catch (e) {
    res.status(e.http || 500).json({ success: false, error: e.public || "Server error" });
  }
};
`.trim() + "\n",

  'src/api/sales/complete/completeSale.service.js': `
// Service: orchestrates validation→idempotency→tx→finalize
const db=require("../../../config/dbConfig"),{withRepeatableRead}=require("./db/withRepeatableRead"),{validateRequest}=require("./validators/request.validator"),lock=require("./repos/lockSale.repo"),items=require("./repos/getItems.repo"),totals=require("./repos/computeTotals.repo"),sumReq=require("./repos/sumRequestPayments.repo"),apply=require("./repos/applyPayments.repo"),finalize=require("./repos/finalizeSale.repo"),listPays=require("./repos/listPayments.repo"),idem=require("./repos/idempotency.repo"),{toNum,round2}=require("./utils/money");
async function w(c,i){ const s=await lock(c,i.sale_public_id); if(!s)throw h(404,"Sale not found"); if(s.status==="sold")throw h(409,"Sale already completed"); const t=await totals(c,i.sale_public_id); const it=await items(c,i.sale_public_id); const r=await sumReq(c,i.payments); const np=toNum(s.total_paid_amount||0)+toNum(r); if(np<toNum(t.total_amount))throw h(400,"Insufficient payment"); await apply(c,i.sale_public_id,i.payments); const row=await finalize(c,i.sale_public_id,t.total_amount,np,i.payments); const pays=await listPays(c,i.sale_public_id); const change_due=round2(np-toNum(t.total_amount)); return {...row,items:it,payments:pays,change_due}; }
module.exports.completeSale=async function(i){ const ok=validateRequest(i); if(!ok.valid)throw h(400,ok.error); if(i.idempotency_key){ const c=await idem.find(i.sale_public_id,i.idempotency_key); if(c)return c; } const pool=db.getPool(); const r=await withRepeatableRead(pool,cl=>w(cl,i)); if(i.idempotency_key)await idem.save(i.sale_public_id,i.idempotency_key,r); return r; };
function h(code,msg){ const e=new Error(msg); e.http=code; e.public=msg; return e; }
`.trim() + "\n",

  'src/api/sales/complete/validators/request.validator.js': `
// Validate request payload
const { isValidMoney } = require("../utils/money");
const { ensure } = require("./payment.validator");
const ALLOWED = new Set(["cash","card","qr"]);
module.exports.validateRequest = (b) => {
  if (!b || !b.sale_public_id) return { valid:false, error:"sale_public_id required" };
  const a=b.payments;
  if (!Array.isArray(a)||a.length===0) return { valid:false, error:"payments required" };
  if (a.length>10) return { valid:false, error:"too many payments" };
  for(const p of a){
    if(!p||!ALLOWED.has(p.method)) return { valid:false, error:"invalid payment method" };
    if(p.currency&&p.currency!=="LKR") return { valid:false, error:"unsupported currency" };
    if(!isValidMoney(p.amount)) return { valid:false, error:"invalid amount" };
    if(!ensure(p)) return { valid:false, error:"invalid payment data" };
  }
  if(b.idempotency_key&&typeof b.idempotency_key!=="string") return { valid:false, error:"invalid idempotency_key" };
  return { valid:true };
};
`.trim() + "\n",

  'src/api/sales/complete/validators/payment.validator.js': `
// (Reserved) Extra per-payment validation hook
module.exports.ensure = (p) => {
  // Add business rules (lengths, meta limits) if needed
  return true;
};
`.trim() + "\n",

  'src/api/sales/complete/utils/money.js': `
// Money utils: strict 2dp, positive
function toNum(x){ return typeof x==="number"?x:Number(x); }
function isValidMoney(x){
  if (x===null||x===undefined||x==="") return false;
  const s=String(x);
  if (!/^\\d+(?:\\.\\d{1,2})?$/.test(s)) return false;
  return Number(s)>0;
}
function round2(n){ return Math.round((+n+Number.EPSILON)*100)/100; }
module.exports={ isValidMoney, toNum, round2 };
`.trim() + "\n",

  'src/api/sales/complete/db/withRepeatableRead.js': `
// Transaction helper: REPEATABLE READ
async function withRepeatableRead(pool, fn){
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const r = await fn(client);
    await client.query("COMMIT");
    return r;
  } catch(e){
    try{ await client.query("ROLLBACK"); }catch(_){}
    throw e;
  } finally { client.release(); }
}
module.exports = { withRepeatableRead };
`.trim() + "\n",

  'src/api/sales/complete/repos/lockSale.repo.js': `
// Lock sale row FOR UPDATE
module.exports = (c, id) => c
  .query("SELECT * FROM sales WHERE public_id=$1 FOR UPDATE", [id])
  .then(r => r.rows[0]);
`.trim() + "\n",

  'src/api/sales/complete/repos/getItems.repo.js': `
// Fetch sale items
module.exports = (c, id) => c
  .query("SELECT * FROM sale_items WHERE sale_public_id=$1 ORDER BY id", [id])
  .then(r => r.rows);
`.trim() + "\n",

  'src/api/sales/complete/repos/computeTotals.repo.js': `
// Compute sale total = items - offers
module.exports = (c, id) => {
  const q = \`
    WITH si AS (SELECT COALESCE(SUM(total_price),0)::NUMERIC(12,2) v FROM sale_items WHERE sale_public_id=$1),
         so AS (SELECT COALESCE(SUM(discount_amount),0)::NUMERIC(12,2) v FROM sale_offers WHERE sale_public_id=$1)
    SELECT (si.v - so.v)::NUMERIC(12,2) AS total_amount FROM si, so\`;
  return c.query(q,[id]).then(r=>r.rows[0]);
};
`.trim() + "\n",

  'src/api/sales/complete/repos/sumRequestPayments.repo.js': `
// Sum request payments via VALUES cast to NUMERIC(12,2)
module.exports = (c, pays) => {
  const vals = pays.map((_,i)=>\`($\${i+1}::NUMERIC(12,2))\`).join(",");
  const params = pays.map(p=>p.amount);
  const sql = \`SELECT COALESCE(SUM(v),0)::NUMERIC(12,2) s FROM (VALUES \${vals}) t(v)\`;
  return c.query(sql, params).then(r=>r.rows[0].s);
};
`.trim() + "\n",

  'src/api/sales/complete/repos/applyPayments.repo.js': `
// Apply payments to sales totals
module.exports = (c, id, pays) => {
  let cash=0,card=0,qr=0,cardRef=null,qrRef=null;
  for(const p of pays){
    if(p.method==="cash") cash+=+p.amount;
    else if(p.method==="card"){ card+=+p.amount; if(p.reference) cardRef=p.reference; }
    else if(p.method==="qr"){ qr+=+p.amount; if(p.reference) qrRef=p.reference; }
  }
  const sql=\`
    UPDATE sales SET
      cash_payment_amount=cash_payment_amount+$2::NUMERIC(12,2),
      card_payment_amount=card_payment_amount+$3::NUMERIC(12,2),
      qr_payment_amount=qr_payment_amount+$4::NUMERIC(12,2),
      card_payment_reference=COALESCE($5,card_payment_reference),
      qr_payment_reference=COALESCE($6,qr_payment_reference),
      updated_at=NOW()
    WHERE public_id=$1 RETURNING *\`;
  return c.query(sql,[id,cash,card,qr,cardRef,qrRef]).then(r=>r.rows[0]);
};
`.trim() + "\n",

  'src/api/sales/complete/repos/finalizeSale.repo.js': `
// Finalize sale row
module.exports = (c, id, total, paid, pays) => {
  const set=new Set(pays.map(p=>p.method));
  const method=set.size===1?[...set][0]:"mixed";
  const sql=\`
    UPDATE sales SET
      total_amount=$2::NUMERIC(12,2),
      total_paid_amount=$3::NUMERIC(12,2),
      status='sold',
      payment_method=$4,
      updated_at=NOW()
    WHERE public_id=$1 RETURNING *\`;
  return c.query(sql,[id,total,paid,method]).then(r=>r.rows[0]);
};
`.trim() + "\n",

  'src/api/sales/complete/repos/listPayments.repo.js': `
// List payments reconstructed from sales row
module.exports = async (c, id) => {
  const r=await c.query(
    "SELECT cash_payment_amount,card_payment_amount,qr_payment_amount,card_payment_reference,qr_payment_reference FROM sales WHERE public_id=$1",[id]
  );
  const row=r.rows[0]||{}; const out=[];
  if(+row.cash_payment_amount>0) out.push({method:"cash",amount:Number(row.cash_payment_amount)});
  if(+row.card_payment_amount>0) out.push({method:"card",amount:Number(row.card_payment_amount),reference:row.card_payment_reference||null});
  if(+row.qr_payment_amount>0) out.push({method:"qr",amount:Number(row.qr_payment_amount),reference:row.qr_payment_reference||null});
  return out;
};
`.trim() + "\n",

  'src/api/sales/complete/repos/idempotency.repo.js': `
// Idempotency cache
const db = require("../../../../config/dbConfig");
async function ensure(pool){
  await pool.query(\`CREATE TABLE IF NOT EXISTS idempotency_cache(
    id SERIAL PRIMARY KEY,
    sale_public_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq UNIQUE(sale_public_id,idempotency_key))\`);
}
module.exports.find=async (saleId,key)=>{
  const pool=db.getPool(); await ensure(pool);
  const r=await pool.query("SELECT response FROM idempotency_cache WHERE sale_public_id=$1 AND idempotency_key=$2",[saleId,key]);
  return r.rows[0]?.response||null;
};
module.exports.save=async (saleId,key,resp)=>{
  const pool=db.getPool(); await ensure(pool);
  await pool.query(
    "INSERT INTO idempotency_cache(sale_public_id,idempotency_key,response) VALUES($1,$2,$3) ON CONFLICT (sale_public_id,idempotency_key) DO NOTHING",
    [saleId,key,resp]
  );
};
`.trim() + "\n",

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
};` + "\n",

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
};` + "\n",
};

async function ensureInsideRoot(rel) {
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) throw new Error(`Path escapes root: ${rel}`);
  return abs;
}

async function writeFileSafe(rel, content) {
  const abs = await ensureInsideRoot(rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  try {
    const exists = await fs.stat(abs).then(()=>true).catch(()=>false);
    if (exists && !OVER) { log('SKIP', rel); return { skipped: 1 }; }
    if (DRY) { log(exists ? 'OVERWRITE' : 'CREATE', rel); return { planned: 1 }; }
    await fs.writeFile(abs, content.endsWith('\n')?content:content+'\n', 'utf8');
    log(exists ? 'OVERWRITE' : 'CREATE', rel);
    return { wrote: 1 };
  } catch (e) {
    throw new Error(`Failed writing ${rel}: ${e.message}`);
  }
}

(async function main(){
  try {
    let stats = { planned:0, wrote:0, skipped:0 };
    for (const [rel, body] of Object.entries(fileMap)) {
      const r = await writeFileSafe(rel, body);
      for (const k of Object.keys(r)) stats[k]=(stats[k]||0)+r[k];
    }
    if (!SILENT) {
      const s = Object.entries(stats).map(([k,v])=>`${k.toUpperCase()}=${v||0}`).join(' ');
      log('DONE', s);
    }
    exit(0);
  } catch (e) {
    err('FATAL', e.message);
    exit(1);
  }
})();
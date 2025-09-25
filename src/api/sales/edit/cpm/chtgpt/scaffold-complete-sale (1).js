#!/usr/bin/env node
/* scaffold-complete-sale.js */
const fs=require("fs/promises"),path=require("path");
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const m=a.match(/^--([^=]+)(?:=(.*))?$/);return m?[m[1],m[2]===undefined?true:m[2]]:[a,true]}));
const ROOT=path.resolve(args.root||process.cwd()),DRY=!!args["dry-run"],OVER=!!args["overwrite"],SILENT=!!args["silent"];
const log=(...x)=>!SILENT&&console.log(...x);
function lc(s){return (s.match(/\n/g)||[]).length+1;}
const fileMap={
"src/api/sales/complete/completeSale.controller.js":
`// Controller with standardized responses
const service=require("./completeSale.service");
const {sendOk,sendErr}=require("./utils/response");
module.exports=async function(req,res){
  try{
    const r=await service.completeSale(req.body||{});
    sendOk(res,200,{message:"Sale completed",sale:r.sale,change_due:r.change_due});
  }catch(e){sendErr(res,e.http||500,e.public||"Server error");}
};
`,
"src/api/sales/complete/completeSale.service.js":
`// Orchestrator: validate → idempotency → tx → finalize
const db=require("../../../config/dbConfig"),{withRR}=require("./db/withRepeatableRead");
const {validateRequest}=require("./validators/request.validator");
const lock=require("./repos/lockSale.repo"),items=require("./repos/getItems.repo");
const totals=require("./repos/computeTotals.repo"),sumReq=require("./repos/sumRequestPayments.repo");
const apply=require("./repos/applyPayments.repo"),finalize=require("./repos/finalizeSale.repo");
const listPays=require("./repos/listPayments.repo"),idem=require("./repos/idempotency.repo");
const {round2}=require("./utils/money");
function boom(http,msg){const e=new Error(msg);e.http=http;e.public=msg;return e;}
module.exports.completeSale=async(body)=>{
  const v=validateRequest(body);if(!v.valid)throw boom(400,v.error);
  // default currency to LKR without persisting it
  for(const p of body.payments){if(!p.currency)p.currency="LKR";}
  if(body.idempotency_key){const c=await idem.find(body.sale_public_id,body.idempotency_key);if(c)return c;}
  const pool=db.getPool();
  const out=await withRR(pool,async c=>{
    const s=await lock(c,body.sale_public_id);if(!s)throw boom(404,"Sale not found");
    if(s.status!=="processing")throw boom(409,"Wrong sale state");
    const t=await totals(c,body.sale_public_id);
    const reqSum=Number(await sumReq(c,body.payments));
    if(reqSum<Number(t.total_amount))throw boom(400,"Insufficient payment");
    await apply(c,body.sale_public_id,body.payments);
    const row=await finalize(c,body.sale_public_id,t.total_amount,reqSum,body.payments);
    const it=await items(c,body.sale_public_id);const pays=await listPays(c,body.sale_public_id);
    return {sale:{...row,items:it,payments:pays},change_due:round2(reqSum-Number(t.total_amount))};
  });
  if(body.idempotency_key)await idem.save(body.sale_public_id,body.idempotency_key,out);
  return out;
};
`,
"src/api/sales/complete/db/withRepeatableRead.js":
`// Transaction helper: REPEATABLE READ
async function withRR(pool,fn){
  const c=await pool.connect();
  try{
    await c.query("BEGIN");
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const r=await fn(c);await c.query("COMMIT");return r;
  }catch(e){try{await c.query("ROLLBACK");}catch(_){};throw e;}finally{c.release();}
}
module.exports={withRR};
`,
"src/api/sales/complete/validators/request.validator.js":
`// Validate sale and payments
const {isValidMoney}=require("../utils/money");
const ALLOWED=new Set(["cash","card","qr"]);
module.exports.validateRequest=b=>{
  if(!b||typeof b!=="object")return{valid:false,error:"body required"};
  if(!b.sale_public_id||typeof b.sale_public_id!=="string")return{valid:false,error:"sale_public_id required"};
  const a=b.payments;if(!Array.isArray(a)||a.length===0)return{valid:false,error:"payments required"};
  if(a.length>10)return{valid:false,error:"max 10 payments"};
  for(const p of a){
    if(!p||!ALLOWED.has(p.method))return{valid:false,error:"invalid method"};
    if(p.currency&&p.currency!=="LKR")return{valid:false,error:"currency must be LKR"};
    if(p.reference&&(typeof p.reference!=="string"||p.reference.length>128))return{valid:false,error:"bad reference"};
    if(!isValidMoney(p.amount))return{valid:false,error:"invalid amount"};
  }
  if(b.idempotency_key&&typeof b.idempotency_key!=="string")return{valid:false,error:"bad idempotency_key"};
  return{valid:true};
};
`,
"src/api/sales/complete/utils/money.js":
`// Money: 2dp positive, rounding
function isValidMoney(x){const s=String(x??"");return/^\\d+(?:\\.\\d{1,2})?$/.test(s)&&Number(s)>0;}
function round2(n){return Math.round((Number(n)+Number.EPSILON)*100)/100;}
module.exports={isValidMoney,round2};
`,
"src/api/sales/complete/utils/response.js":
`// Standardized JSON responses
function sendOk(res,code,data){res.status(code).json({success:true,...data});}
function sendErr(res,code,message,details){res.status(code).json({success:false,error:message,details:details||null});}
module.exports={sendOk,sendErr};
`,
"src/api/sales/complete/repos/lockSale.repo.js":
`// Lock sale row
module.exports=(c,id)=>c.query("SELECT * FROM sales WHERE public_id=$1 FOR UPDATE",[id]).then(r=>r.rows[0]||null);
`,
"src/api/sales/complete/repos/getItems.repo.js":
`// Items by sale
module.exports=(c,id)=>c.query("SELECT * FROM sale_items WHERE sale_public_id=$1 ORDER BY id",[id]).then(r=>r.rows);
`,
"src/api/sales/complete/repos/computeTotals.repo.js":
`// items - offers as NUMERIC(12,2)
module.exports=(c,id)=>c.query(
  \`WITH si AS (SELECT COALESCE(SUM(total_price),0)::NUMERIC(12,2) v FROM sale_items WHERE sale_public_id=$1),
        so AS (SELECT COALESCE(SUM(discount_amount),0)::NUMERIC(12,2) v FROM sale_offers WHERE sale_public_id=$1)
    SELECT (si.v-so.v)::NUMERIC(12,2) AS total_amount FROM si,so\`,[id]).then(r=>r.rows[0]);
`,
"src/api/sales/complete/repos/sumRequestPayments.repo.js":
`// Sum payments via parameterized VALUES
module.exports=(c,p)=>{
  if(!p.length)return 0;
  const params=[], tuples=[];
  p.forEach((x,i)=>{params.push(x.amount);tuples.push(\`($\${i+1}::NUMERIC(12,2))\`);});
  const sql=\\\`SELECT COALESCE(SUM(v),0)::NUMERIC(12,2) s FROM (VALUES \\\${tuples.join(",")}) t(v)\\\`;
  return c.query(sql,params).then(r=>r.rows[0].s);
};
`,
"src/api/sales/complete/repos/applyPayments.repo.js":
`// Aggregate into sales row
module.exports=(c,id,p)=>{
  let cash=0,card=0,qr=0,cardRef=null,qrRef=null;
  for(const x of p){if(x.method==="cash")cash+=+x.amount;else if(x.method==="card"){card+=+x.amount;cardRef=x.reference||cardRef;}else{qr+=+x.amount;qrRef=x.reference||qrRef;}}
  const q=\`
   UPDATE sales SET cash_payment_amount=cash_payment_amount+$2::NUMERIC(12,2),
     card_payment_amount=card_payment_amount+$3::NUMERIC(12,2),
     qr_payment_amount=qr_payment_amount+$4::NUMERIC(12,2),
     card_payment_reference=COALESCE($5,card_payment_reference),
     qr_payment_reference=COALESCE($6,qr_payment_reference),
     updated_at=NOW() WHERE public_id=$1 RETURNING *\`;
  return c.query(q,[id,cash,card,qr,cardRef,qrRef]).then(r=>r.rows[0]);
};
`,
"src/api/sales/complete/repos/finalizeSale.repo.js":
`// Finalize sale (status + totals + method)
module.exports=(c,id,total,reqSum,p)=>{
  const m=new Set(p.map(x=>x.method));const method=m.size===1?[...m][0]:"mixed";
  const q=\`UPDATE sales SET total_amount=$2::NUMERIC(12,2),total_paid_amount=total_paid_amount+$3::NUMERIC(12,2),
    status='sold',payment_method=$4,updated_at=NOW() WHERE public_id=$1 RETURNING *\`;
  return c.query(q,[id,total,reqSum,method]).then(r=>r.rows[0]);
};
`,
"src/api/sales/complete/repos/listPayments.repo.js":
`// Rebuild payments from aggregates
module.exports=async(c,id)=>{
  const r=await c.query("SELECT cash_payment_amount,card_payment_amount,qr_payment_amount,card_payment_reference,qr_payment_reference FROM sales WHERE public_id=$1",[id]);
  const x=r.rows[0]||{};const o=[];
  if(+x.cash_payment_amount>0)o.push({method:"cash",amount:Number(x.cash_payment_amount)});
  if(+x.card_payment_amount>0)o.push({method:"card",amount:Number(x.card_payment_amount),reference:x.card_payment_reference||null});
  if(+x.qr_payment_amount>0)o.push({method:"qr",amount:Number(x.qr_payment_amount),reference:x.qr_payment_reference||null});
  return o;
};
`,
"src/api/sales/complete/repos/idempotency.repo.js":
`// Idempotency cache table (scoped by sale)
const db=require("../../../../config/dbConfig");
async function ensure(p){
  await p.query(\`CREATE TABLE IF NOT EXISTS idempotency_cache(
    sale_public_id TEXT NOT NULL,idempotency_key TEXT NOT NULL,response JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),CONSTRAINT uq_idem UNIQUE(sale_public_id,idempotency_key))\`);
}
module.exports.find=async(id,key)=>{const pool=db.getPool();await ensure(pool);
  const r=await pool.query("SELECT response FROM idempotency_cache WHERE sale_public_id=$1 AND idempotency_key=$2",[id,key]);
  return r.rows[0]?.response||null;};
module.exports.save=async(id,key,resp)=>{const pool=db.getPool();await ensure(pool);
  await pool.query("INSERT INTO idempotency_cache(sale_public_id,idempotency_key,response) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[id,key,resp]);};
`,
"migrations/create_sales_schema.js":
`module.exports={async create(pool){
await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
await pool.query(\`CREATE OR REPLACE FUNCTION to_base36_upper(n BIGINT) RETURNS TEXT AS $$DECLARE c TEXT:='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';r TEXT:='';x BIGINT:=n;BEGIN IF x=0 THEN RETURN '0';END IF;WHILE x>0 LOOP r:=substr(c,((x%36)::INT)+1,1)||r;x:=x/36;END LOOP;RETURN r;END;$$ LANGUAGE plpgsql IMMUTABLE;\`);
await pool.query(\`CREATE TABLE IF NOT EXISTS sales(id SERIAL PRIMARY KEY,public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED,CONSTRAINT uq_sales_public_id UNIQUE(public_id),seller_user_id TEXT NOT NULL,customer_user_id TEXT NOT NULL DEFAULT 'anonymous',card_payment_amount NUMERIC(12,2) DEFAULT 0,card_payment_reference TEXT,cash_payment_amount NUMERIC(12,2) DEFAULT 0,qr_payment_amount NUMERIC(12,2) DEFAULT 0,qr_payment_reference TEXT,loyalty_claimed_amount NUMERIC(12,2) DEFAULT 0,loyalty_reference TEXT,total_paid_amount NUMERIC(12,2) DEFAULT 0,total_offer_discount NUMERIC(12,2) DEFAULT 0,total_amount NUMERIC(12,2) DEFAULT 0,status TEXT NOT NULL CHECK(status IN('sold','processing','paused','cancelled')) DEFAULT 'processing',payment_method TEXT,created_at TIMESTAMP DEFAULT NOW(),updated_at TIMESTAMP DEFAULT NOW());\`);
await pool.query(\`CREATE TABLE IF NOT EXISTS sale_items(id SERIAL PRIMARY KEY,public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED,CONSTRAINT uq_sale_items_public_id UNIQUE(public_id),sale_public_id TEXT NOT NULL,CONSTRAINT fk_sale_items_sale_public FOREIGN KEY(sale_public_id) REFERENCES sales(public_id) ON DELETE CASCADE,item_id UUID NOT NULL,CONSTRAINT fk_sale_items_inventory_item FOREIGN KEY(item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT,quantity INTEGER NOT NULL CHECK(quantity>0),unit_price NUMERIC(12,2) NOT NULL,total_price NUMERIC(12,2) NOT NULL,created_at TIMESTAMP DEFAULT NOW());\`);
await pool.query(\`CREATE TABLE IF NOT EXISTS sale_offers(id SERIAL PRIMARY KEY,public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED,CONSTRAINT uq_sale_offers_public_id UNIQUE(public_id),sale_public_id TEXT NOT NULL,CONSTRAINT fk_sale_offers_sale_public FOREIGN KEY(sale_public_id) REFERENCES sales(public_id) ON DELETE CASCADE,offer_code TEXT NOT NULL,offer_description TEXT,discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,created_at TIMESTAMP DEFAULT NOW());\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_user_id);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_user_id);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sales_public_id ON sales(public_id);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_items_sale_public_id ON sale_items(sale_public_id);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_offers_sale_public_id ON sale_offers(sale_public_id);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_sale_offers_offer_code ON sale_offers(offer_code);\`);
}};
`,
"migrations/create_inventory_schema.js":
`module.exports={async create(pool){
await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
await pool.query(\`CREATE TABLE IF NOT EXISTS inventory_items(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,stock INTEGER DEFAULT 0,min_stock INTEGER DEFAULT 0,buy_price NUMERIC(12,2) DEFAULT 0,sale_price NUMERIC(12,2) DEFAULT 0,barcode TEXT,hash TEXT UNIQUE,sold INTEGER DEFAULT 0,created_at TIMESTAMP DEFAULT NOW(),updated_at TIMESTAMP DEFAULT NOW());\`);
await pool.query(\`CREATE TABLE IF NOT EXISTS inventory_item_metadata(item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,field_name TEXT NOT NULL,field_value TEXT,PRIMARY KEY(item_id,field_name));\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items(name);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(barcode);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory_items(stock);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_metadata_field_name ON inventory_item_metadata(field_name);\`);
await pool.query(\`CREATE INDEX IF NOT EXISTS idx_metadata_field_value ON inventory_item_metadata(field_value);\`);
}};
`
};
async function ensureDir(p){await fs.mkdir(path.dirname(p),{recursive:true});}
async function writeFileSafe(fp,content){
  const lines=lc(content);if(lines>30)throw new Error("File exceeds 30 lines: "+fp+" ("+lines+")");
  try{const st=await fs.stat(fp);if(st.isFile()&&!OVER){log("skip",fp);return;}}catch{}
  if(DRY){log("dry",fp);return;}await ensureDir(fp);await fs.writeFile(fp,content,"utf8");log("wrote",fp);
}
(async()=>{
  for(const [rel,content] of Object.entries(fileMap)){const abs=path.join(ROOT,rel);await writeFileSafe(abs,content);}
  if(!SILENT)console.log("Scaffold complete under",ROOT);
})().catch(e=>{console.error(e);process.exit(1)});

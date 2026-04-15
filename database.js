const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const isRender = !!process.env.RENDER_EXTERNAL_URL;
const dataDir = isRender ? '/var/data' : path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'po.db');
let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  db.run(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      po_date TEXT NOT NULL,
      total_items INTEGER DEFAULT 0,
      total_quantity REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      rate REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      remark TEXT,
      item_order INTEGER DEFAULT 0,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    )
  `);
  
  saveDatabase();
  console.log('Database initialized successfully');
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getAllPOs() {
  const stmt = db.prepare('SELECT * FROM purchase_orders ORDER BY created_at DESC');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function getPOById(id) {
  const stmt = db.prepare('SELECT * FROM purchase_orders WHERE id = ?');
  stmt.bind([id]);
  let po = null;
  if (stmt.step()) {
    po = stmt.getAsObject();
  }
  stmt.free();
  
  if (po) {
    const itemStmt = db.prepare('SELECT * FROM line_items WHERE po_id = ? ORDER BY item_order');
    itemStmt.bind([id]);
    po.items = [];
    while (itemStmt.step()) {
      po.items.push(itemStmt.getAsObject());
    }
    itemStmt.free();
  }
  return po;
}

function createPO(data) {
  const { po_number, customer_name, po_date, items } = data;
  
  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const grandTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  db.run(
    'INSERT INTO purchase_orders (po_number, customer_name, po_date, total_items, total_quantity, grand_total) VALUES (?, ?, ?, ?, ?, ?)',
    [po_number, customer_name, po_date, items.length, totalQty, grandTotal]
  );
  
  const poIdResult = db.exec('SELECT last_insert_rowid() as id');
  const poId = poIdResult[0].values[0][0];
  
  items.forEach((item, index) => {
    db.run(
      'INSERT INTO line_items (po_id, item_name, quantity, rate, amount, remark, item_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [poId, item.item_name, parseFloat(item.quantity) || 0, parseFloat(item.rate) || 0, parseFloat(item.amount) || 0, item.remark || '', index + 1]
    );
  });
  
  saveDatabase();
  return poId;
}

function updatePO(id, data) {
  const { po_number, customer_name, po_date, items } = data;
  
  db.run('DELETE FROM line_items WHERE po_id = ?', [id]);
  
  const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const grandTotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  db.run(
    'UPDATE purchase_orders SET po_number = ?, customer_name = ?, po_date = ?, total_items = ?, total_quantity = ?, grand_total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [po_number, customer_name, po_date, items.length, totalQty, grandTotal, id]
  );
  
  items.forEach((item, index) => {
    db.run(
      'INSERT INTO line_items (po_id, item_name, quantity, rate, amount, remark, item_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, item.item_name, parseFloat(item.quantity) || 0, parseFloat(item.rate) || 0, parseFloat(item.amount) || 0, item.remark || '', index + 1]
    );
  });
  
  saveDatabase();
}

function deletePO(id) {
  db.run('DELETE FROM line_items WHERE po_id = ?', [id]);
  db.run('DELETE FROM purchase_orders WHERE id = ?', [id]);
  saveDatabase();
  return { success: true };
}

module.exports = {
  initDatabase,
  getAllPOs,
  getPOById,
  createPO,
  updatePO,
  deletePO
};
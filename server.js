const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase, getAllPOs, getPOById, createPO, updatePO, deletePO } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const isRender = !!process.env.RENDER_EXTERNAL_URL;
const dataDir = isRender ? '/var/data' : path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function startServer() {
  await initDatabase();

app.get('/api/pos', (req, res) => {
  try {
    const pos = getAllPOs();
    res.json(pos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pos/:id', (req, res) => {
  try {
    const po = getPOById(req.params.id);
    if (!po) {
      return res.status(404).json({ error: 'PO not found' });
    }
    res.json(po);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pos', (req, res) => {
  try {
    const { po_number, customer_name, po_date, items } = req.body;
    
    if (!po_number || !customer_name || !po_date) {
      return res.status(400).json({ error: 'Missing required fields: po_number, customer_name, po_date' });
    }
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required' });
    }
    
    const poId = createPO({ po_number, customer_name, po_date, items });
    res.status(201).json({ id: poId, message: 'PO created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pos/:id', (req, res) => {
  try {
    const { po_number, customer_name, po_date, items } = req.body;
    
    const existing = getPOById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'PO not found' });
    }
    
    updatePO(req.params.id, { po_number, customer_name, po_date, items });
    res.json({ message: 'PO updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pos/:id', (req, res) => {
  try {
    deletePO(req.params.id);
    res.json({ message: 'PO deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
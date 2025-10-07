// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Crear app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Rate limiter básico
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requests por IP
});
app.use(limiter);

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://geo_locations_db_user:kUEcjuXO8EgZLPZGeOBsAALbzI1NT3np@dpg-d3i808jipnbc73dv3mig-a/geo_locations_db',
  ssl: {
    rejectUnauthorized: false
  }
});

// Servir HTML estático
const path = require('path');
app.use(express.static(path.join(__dirname)));

// Endpoint para recibir ubicación
app.post('/location', async (req, res) => {
  try {
    const { latitude, longitude, address, clientPublicIp, consent, clientNote } = req.body;

    if (!consent) {
      return res.status(400).json({ ok: false, error: 'Consentimiento no dado' });
    }

    // IP real del cliente
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Guardar en DB
    const result = await pool.query(
      `INSERT INTO locations (latitude, longitude, address, client_public_ip, ip, client_note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [latitude, longitude, address || null, clientPublicIp || null, ip, clientNote || null]
    );

    res.json({ ok: true, entry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

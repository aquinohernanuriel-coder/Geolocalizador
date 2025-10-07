import express from 'express';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit para evitar spam
app.use(rateLimit({ windowMs: 1 * 60 * 1000, max: 30 }));

// Servir archivos estáticos
app.use(express.static(process.cwd()));
app.get('/', (req, res) => res.sendFile(process.cwd() + '/index.html'));

// Conexión a PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Reverse geocoding
async function getAddress(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
      headers: { 'User-Agent': 'Geolocalizador-App' }
    });
    const data = await res.json();
    return data.display_name || null;
  } catch (e) {
    return null;
  }
}

// POST /location
app.post('/location', async (req, res) => {
  try {
    const { latitude, longitude, clientPublicIp, consent, clientNote } = req.body;
    if (!consent) return res.status(400).json({ ok: false, error: 'Consentimiento requerido' });

    // Obtener IP real del cliente
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    const address = await getAddress(latitude, longitude);

    const query = `
      INSERT INTO locations(latitude, longitude, address, client_public_ip, ip, client_note)
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [latitude, longitude, address, clientPublicIp, ip, clientNote];
    const result = await pool.query(query, values);

    res.json({ ok: true, entry: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

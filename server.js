import express from 'express';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit
const limiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 30 });
app.use(limiter);

// Servir archivos estáticos
app.use(express.static(path.join(process.cwd())));

// Servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Función reverse geocoding usando Nominatim
async function getAddress(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Geolocalizador-App' } });
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch (e) {
    console.error('Reverse geocoding error:', e);
    return null;
  }
}

// POST /location
app.post('/location', async (req, res) => {
  try {
    const { latitude, longitude, clientPublicIp, consent, clientNote } = req.body;

    if (!consent) return res.status(400).json({ ok: false, error: 'Consentimiento requerido' });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Obtener dirección exacta
    const address = await getAddress(latitude, longitude);

    const entry = {
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      address,
      clientPublicIp,
      ip,
      clientNote
    };

    const filePath = path.join(process.cwd(), 'locations.json');
    let data = [];
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    data.push(entry);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    res.json({ ok: true, saved: true, entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

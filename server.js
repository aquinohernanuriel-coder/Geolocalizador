const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Limitar peticiones para seguridad
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // Máximo 20 requests por IP por minuto
  message: "Demasiadas peticiones desde esta IP, intenta más tarde."
});
app.use(limiter);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// POST /location para guardar la ubicación y IP
app.post('/location', (req, res) => {
  const { latitude, longitude, clientPublicIp, consent, clientNote } = req.body;

  if (!consent) return res.status(400).json({ ok: false, error: "No consentido" });
  if (!latitude || !longitude) return res.status(400).json({ ok: false, error: "Lat/Lon faltante" });

  // Obtener IP real del cliente (considerando proxy como Render)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

  const entry = {
    latitude,
    longitude,
    ip,
    clientPublicIp: clientPublicIp || null,
    clientNote: clientNote || null,
    timestamp: new Date().toISOString()
  };

  const filePath = path.join(__dirname, 'locations.json');
  let data = [];
  if (fs.existsSync(filePath)) {
    try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch(e){ data = []; }
  }
  data.push(entry);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  res.json({ ok: true, entry });
});

// Fallback para cualquier otra ruta: enviar index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

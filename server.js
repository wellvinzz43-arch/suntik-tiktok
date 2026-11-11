require("dotenv").config();
const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const PROVIDER_API_URL = process.env.PROVIDER_API_URL;
const PROVIDER_API_KEY = process.env.PROVIDER_API_KEY;

if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 24) {
  console.error("Set ADMIN_TOKEN minimal 24 karakter di file .env");
  process.exit(1);
}

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname, { dotfiles: "ignore", index: "index.html" }));

const orders = [];

function adminOnly(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Akses admin ditolak" });
  }
  next();
}

function validTikTokUrl(value) {
  try {
    const u = new URL(value);
    return ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"].includes(u.hostname);
  } catch { return false; }
}

app.post("/api/orders", async (req, res) => {
  const { name, contact, videoUrl, objective, budget } = req.body || {};
  if (![name, contact, videoUrl, objective].every(v => typeof v === "string" && v.trim())) {
    return res.status(400).json({ error: "Lengkapi semua data wajib." });
  }
  if (!validTikTokUrl(videoUrl.trim())) {
    return res.status(400).json({ error: "Gunakan tautan video TikTok yang valid." });
  }
  const amount = Number(budget);
  if (!Number.isInteger(amount) || amount < 10000 || amount > 100000000) {
    return res.status(400).json({ error: "Anggaran harus Rp10.000–Rp100.000.000." });
  }
  const order = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 80),
    contact: contact.trim().slice(0, 100),
    videoUrl: videoUrl.trim(),
    objective: objective.trim().slice(0, 40),
    budget: amount,
    status: "Menunggu pemeriksaan",
    createdAt: new Date().toISOString()
  };

  // Mode integrasi: kirim permintaan kampanye ke provider resmi yang dikonfigurasi.
  // Tidak ada endpoint untuk membeli like/follower/gift palsu atau memanipulasi metrik.
  if (PROVIDER_API_URL && PROVIDER_API_KEY) {
    try {
      const response = await fetch(PROVIDER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PROVIDER_API_KEY}`
        },
        body: JSON.stringify({
          reference_id: order.id,
          video_url: order.videoUrl,
          objective: order.objective,
          budget_idr: order.budget,
          contact: order.contact
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
      const result = await response.json().catch(() => ({}));
      order.status = "Dikirim ke provider";
      order.providerReference = String(result.reference_id || result.id || "").slice(0, 100);
    } catch (err) {
      console.error("Provider error:", err.message);
      order.status = "Perlu diproses manual";
    }
  }

  orders.unshift(order);
  res.status(201).json({ message: "Permintaan promosi diterima.", id: order.id, status: order.status });
});

app.get("/api/admin/orders", adminOnly, (req, res) => {
  res.json({ orders });
});

app.patch("/api/admin/orders/:id", adminOnly, (req, res) => {
  const allowed = ["Menunggu pemeriksaan", "Diproses", "Selesai", "Ditolak", "Perlu diproses manual"];
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Status tidak valid." });
  order.status = req.body.status;
  res.json({ message: "Status diperbarui.", order });
});

app.listen(PORT, () => console.log(`SUNTIK TIKTOK berjalan di http://localhost:${PORT}`));

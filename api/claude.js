module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  var apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    console.error("[/api/claude] ANTHROPIC_KEY nao configurada no Vercel.");
    res.status(500).json({ type: "error", error: { type: "config_error", message: "ANTHROPIC_KEY nao configurada no Vercel." } });
    return;
  }

  try {
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    var raw = await response.text();
    var data;
    try { data = JSON.parse(raw); }
    catch (parseErr) {
      console.error("[/api/claude] Resposta nao-JSON. Status:", response.status, "Corpo:", raw.slice(0, 300));
      res.status(502).json({ type: "error", error: { type: "upstream_error", message: "A IA retornou resposta invalida (status " + response.status + "). Detalhe: " + raw.slice(0, 200) } });
      return;
    }

    if (data && data.type === "error") {
      console.error("[/api/claude] Erro da Anthropic:", JSON.stringify(data.error).slice(0, 400));
    }

    res.status(response.status).json(data);
  } catch (err) {
    console.error("[/api/claude] Falha ao conectar:", err && err.message);
    res.status(500).json({ type: "error", error: { type: "connection_error", message: "Nao foi possivel conectar na API da Anthropic: " + (err && err.message ? err.message : "erro desconhecido") } });
  }
};

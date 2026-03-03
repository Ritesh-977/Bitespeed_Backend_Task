import express from "express";
import { initDB } from "./database";
import { identify, IdentifyRequest } from "./service";

const app = express();
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Bitespeed Identity Reconciliation Service" });
});

// Identify endpoint
app.post("/identify", (req, res) => {
  try {
    const { email, phoneNumber } = req.body as IdentifyRequest;

    if (!email && !phoneNumber && phoneNumber !== 0) {
      return res.status(400).json({
        error: "At least one of email or phoneNumber must be provided",
      });
    }

    const result = identify({ email, phoneNumber });
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in /identify:", error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(console.error);

export default app;

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './src/db.js';
import { createRun, getRun, listRuns, getPages, continueRun } from './src/game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDb();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/runs', (req, res) => {
  res.json(listRuns());
});

app.post('/api/runs', async (req, res) => {
  const run = await createRun(req.body);
  res.json(run);
});

app.get('/api/runs/:id', (req, res) => {
  res.json(getRun(Number(req.params.id)));
});

app.get('/api/runs/:id/pages', (req, res) => {
  res.json(getPages(Number(req.params.id)));
});

app.post('/api/runs/:id/continue', async (req, res) => {
  const result = await continueRun(Number(req.params.id), req.body);
  res.json(result);
});
app.get('/api/config', (req, res) => {
  res.json({
    modelProvider: process.env.MODEL_PROVIDER || 'mock',
    modelName:
      process.env.MODEL_PROVIDER === 'ollama'
        ? process.env.OLLAMA_MODEL || 'unknown'
        : 'mock'
  });
});
app.listen(PORT, () => {
  console.log(`InfinLit RPG running at http://localhost:${PORT}`);
});
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
export const db = new DatabaseSync(path.join(config.dataDir, 'fabi.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'cliente',
  criado INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessoes (
  token TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  conta_id INTEGER NOT NULL,
  expira INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS conexoes (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  dados TEXT NOT NULL DEFAULT '{}',
  segredo TEXT,
  ok INTEGER NOT NULL DEFAULT 0,
  atualizado INTEGER NOT NULL,
  PRIMARY KEY (usuario_id, tipo)
);
CREATE TABLE IF NOT EXISTS lotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  dias TEXT NOT NULL DEFAULT '[]',
  hora TEXT NOT NULL DEFAULT '09:00',
  intervalo INTEGER NOT NULL DEFAULT 3,
  destinos TEXT NOT NULL DEFAULT '{}',
  itens TEXT NOT NULL DEFAULT '[]',
  ativo INTEGER NOT NULL DEFAULT 1,
  criado INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS modelos (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  canal TEXT NOT NULL,
  texto TEXT NOT NULL,
  PRIMARY KEY (usuario_id, canal)
);
CREATE TABLE IF NOT EXISTS disparos (
  chave TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  lote_id INTEGER,
  quando INTEGER NOT NULL,
  status TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'agenda'
);
CREATE TABLE IF NOT EXISTS envios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  disparo TEXT,
  lote_id INTEGER,
  lote_nome TEXT,
  canal TEXT NOT NULL,
  destino TEXT,
  produto TEXT NOT NULL,
  status TEXT NOT NULL,
  erro TEXT,
  simulado INTEGER NOT NULL DEFAULT 0,
  quando INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS envios_usuario ON envios(usuario_id, quando);
`);

export const J = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
export const agora = () => Date.now();

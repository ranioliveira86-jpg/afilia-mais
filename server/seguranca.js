// Senhas com scrypt e segredos (tokens dos canais) cifrados com AES-256-GCM usando APP_SECRET.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

let key;
function chave() {
  if (key) return key;
  let s = config.appSecret;
  if (!s) {
    // Sem APP_SECRET: gera uma chave local na pasta de dados (serve para testes; em produção defina APP_SECRET).
    const f = path.join(config.dataDir, '.app_secret');
    if (fs.existsSync(f)) s = fs.readFileSync(f, 'utf8').trim();
    else { s = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(f, s, { mode: 0o600 }); }
    console.warn('[aviso] APP_SECRET não definido. Usando chave local em', f);
  }
  key = crypto.createHash('sha256').update(s).digest();
  return key;
}

export function cifrar(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chave(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
export function decifrar(txt) {
  if (!txt) return {};
  const b = Buffer.from(txt, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', chave(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
}

export function hashSenha(senha) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(senha, salt, 64);
  return `scrypt$${salt.toString('hex')}$${h.toString('hex')}`;
}
export function conferirSenha(senha, guardada) {
  const [, salt, h] = String(guardada).split('$');
  if (!salt || !h) return false;
  const calc = crypto.scryptSync(String(senha), Buffer.from(salt, 'hex'), 64);
  return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
}
export const gerarToken = () => crypto.randomBytes(32).toString('hex');

// WhatsApp por QR code (WhatsApp Web, biblioteca Baileys), um número por cliente.
// Recomendado usar um chip dedicado: é uma conexão não oficial e o WhatsApp pode bloquear números que abusam.
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import pino from 'pino';
import baileys from '@whiskeysockets/baileys';
import { config } from '../config.js';

const makeWASocket = baileys.default || baileys.makeWASocket || baileys;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

const logger = pino({ level: 'silent' });
const sessoes = new Map(); // uid -> { sock, status, qr, numero, erro }
const pasta = uid => path.join(config.dataDir, 'whatsapp', String(uid));

export function statusWhatsApp(uid) {
  const s = sessoes.get(uid);
  if (!s) return { status: fs.existsSync(pasta(uid)) ? 'reconectando' : 'desconectado' };
  return { status: s.status, qr: s.status === 'aguardando_qr' ? s.qr : null, numero: s.numero || null, erro: s.erro || null };
}

export async function conectarWhatsApp(uid, { aoConectar } = {}) {
  const atual = sessoes.get(uid);
  if (atual && ['conectado', 'aguardando_qr', 'abrindo'].includes(atual.status)) return statusWhatsApp(uid);
  fs.mkdirSync(pasta(uid), { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(pasta(uid));
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch { /* usa a versão padrão */ }
  const s = { status: 'abrindo', qr: null, numero: null, erro: null, sock: null };
  sessoes.set(uid, s);
  const sock = makeWASocket({ auth: state, logger, version, printQRInTerminal: false, browser: ['Afilia+', 'Chrome', '1.0'], markOnlineOnConnect: false });
  s.sock = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async u => {
    if (u.qr) {
      s.status = 'aguardando_qr';
      s.qr = await QRCode.toDataURL(u.qr, { margin: 1, width: 440 });
    }
    if (u.connection === 'open') {
      s.status = 'conectado';
      s.qr = null;
      s.numero = (sock.user?.id || '').split(':')[0].split('@')[0];
      aoConectar?.(s.numero);
    }
    if (u.connection === 'close') {
      const code = u.lastDisconnect?.error?.output?.statusCode;
      sessoes.delete(uid);
      if (code === DisconnectReason.loggedOut) {
        fs.rmSync(pasta(uid), { recursive: true, force: true });
      } else if (s.status === 'conectado' || code === DisconnectReason.restartRequired) {
        setTimeout(() => conectarWhatsApp(uid, { aoConectar }).catch(() => {}), 3000);
      }
    }
  });
  return statusWhatsApp(uid);
}

export async function desconectarWhatsApp(uid) {
  const s = sessoes.get(uid);
  try { await s?.sock?.logout(); } catch { /* ignora */ }
  sessoes.delete(uid);
  fs.rmSync(pasta(uid), { recursive: true, force: true });
}

function sockPronto(uid) {
  const s = sessoes.get(uid);
  if (!s || s.status !== 'conectado') throw new Error('WhatsApp desconectado. Leia o QR code de novo em Conexões.');
  return s.sock;
}

export async function gruposWhatsApp(uid) {
  const g = await sockPronto(uid).groupFetchAllParticipating();
  return Object.values(g)
    .map(x => ({ id: x.id, nome: x.subject, membros: x.participants?.length || 0, anuncio: !!x.announce }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function enviarWhatsApp(uid, grupoId, texto, produto) {
  const sock = sockPronto(uid);
  if (produto.img && /^https?:\/\//.test(produto.img)) {
    await sock.sendMessage(grupoId, { image: { url: produto.img }, caption: texto });
  } else {
    await sock.sendMessage(grupoId, { text: texto });
  }
}

// Ao subir o servidor, reabre as sessões que já tinham sido conectadas.
export function reabrirSessoes() {
  const base = path.join(config.dataDir, 'whatsapp');
  if (!fs.existsSync(base)) return;
  for (const d of fs.readdirSync(base)) {
    const uid = Number(d);
    if (uid) conectarWhatsApp(uid).catch(e => console.error('WhatsApp', uid, e.message));
  }
}

// Guarda as conexões de cada cliente. Tokens ficam cifrados na coluna "segredo"
// e nunca voltam para o navegador.
import { db, J, agora } from './db.js';
import { cifrar, decifrar } from './seguranca.js';
import { statusWhatsApp } from './canais/whatsapp.js';

export function lerConexao(uid, tipo) {
  const r = db.prepare('SELECT * FROM conexoes WHERE usuario_id = ? AND tipo = ?').get(uid, tipo);
  if (!r) return { ok: false, dados: {}, segredo: {} };
  let segredo = {};
  try { segredo = decifrar(r.segredo); } catch { /* chave trocada: precisa reconectar */ }
  return { ok: !!r.ok, dados: J(r.dados, {}), segredo };
}

export function salvarConexao(uid, tipo, dados, segredo) {
  db.prepare(`INSERT INTO conexoes (usuario_id, tipo, dados, segredo, ok, atualizado) VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(usuario_id, tipo) DO UPDATE SET dados = excluded.dados, segredo = COALESCE(excluded.segredo, conexoes.segredo), ok = 1, atualizado = excluded.atualizado`)
    .run(uid, tipo, JSON.stringify(dados || {}), segredo ? cifrar(segredo) : null, agora());
}

export function removerConexao(uid, tipo) {
  db.prepare('DELETE FROM conexoes WHERE usuario_id = ? AND tipo = ?').run(uid, tipo);
}

// Versão segura para o navegador (sem tokens).
export function conexoesPublicas(uid) {
  const sh = lerConexao(uid, 'shopee');
  const tg = lerConexao(uid, 'telegram');
  const ig = lerConexao(uid, 'instagram');
  const wa = statusWhatsApp(uid);
  return {
    shopee: { ok: sh.ok, afiliadoId: sh.dados.afiliadoId || null, desde: sh.dados.desde || null },
    telegram: { ok: tg.ok, bot: tg.dados.bot || null, chat: tg.dados.chat || null, chatNome: tg.dados.chatNome || null },
    instagram: { ok: ig.ok, usuario: ig.dados.usuario || null, igUserId: ig.dados.igUserId || null },
    whatsapp: { ok: wa.status === 'conectado', ...wa },
  };
}

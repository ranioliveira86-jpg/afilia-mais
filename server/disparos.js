// Agenda e disparo dos lotes. A cada 20 segundos confere quais lotes chegaram no horário
// e envia produto por produto, respeitando o intervalo, para todos os destinos do lote.
import { db, J, agora } from './db.js';
import { config } from './config.js';
import { lerConexao } from './conexoes.js';
import { modelosDe, preencher } from './modelos.js';
import { linkAfiliado } from './shopee.js';
import { enviarWhatsApp, statusWhatsApp } from './canais/whatsapp.js';
import { enviarTelegram } from './canais/telegram.js';
import { postarFeed, postarStory } from './canais/instagram.js';

const espera = ms => new Promise(r => setTimeout(r, ms));
const brl = n => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const emAndamento = new Set();

export function loteParaJson(r, afiliadoId) {
  const itens = J(r.itens, []).map(p => ({ ...p, link: linkAfiliado(p.productLink, afiliadoId) }));
  return { id: r.id, nome: r.nome, dias: J(r.dias, []), hora: r.hora, intervalo: r.intervalo, destinos: J(r.destinos, {}), itens, ativo: !!r.ativo, criado: r.criado };
}

function registrar(uid, chave, lote, canal, destino, produto, status, erro, simulado) {
  db.prepare(`INSERT INTO envios (usuario_id, disparo, lote_id, lote_nome, canal, destino, produto, status, erro, simulado, quando)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uid, chave, lote.id, lote.nome, canal, destino, JSON.stringify(produto), status, erro || null, simulado ? 1 : 0, agora());
}

async function tentar(uid, chave, lote, canal, destino, produto, conectado, fn) {
  if (config.demo && !conectado) return registrar(uid, chave, lote, canal, destino, produto, 'enviado', null, true);
  try {
    await fn();
    registrar(uid, chave, lote, canal, destino, produto, 'enviado', null, false);
    return true;
  } catch (e) {
    registrar(uid, chave, lote, canal, destino, produto, 'falhou', e.message, false);
    return false;
  }
}

export async function executarLote(uid, loteId, chave, origem = 'agenda') {
  const row = db.prepare('SELECT * FROM lotes WHERE id = ? AND usuario_id = ?').get(loteId, uid);
  if (!row) throw new Error('Lote não encontrado');
  const ins = db.prepare('INSERT OR IGNORE INTO disparos (chave, usuario_id, lote_id, quando, status, origem) VALUES (?, ?, ?, ?, ?, ?)')
    .run(chave, uid, loteId, agora(), 'enviando', origem);
  if (!ins.changes) return false; // já disparado
  emAndamento.add(chave);
  const shopee = lerConexao(uid, 'shopee');
  const lote = loteParaJson(row, shopee.dados.afiliadoId);
  const tg = lerConexao(uid, 'telegram');
  const ig = lerConexao(uid, 'instagram');
  const tpl = modelosDe(uid);
  const d = lote.destinos || {};
  const igCred = { igUserId: ig.dados.igUserId, accessToken: ig.segredo.accessToken };
  const tgCred = { token: tg.segredo.token, chatId: tg.dados.chat };
  const waOk = statusWhatsApp(uid).status === 'conectado';
  let falhas = 0;
  const conta = ok => { if (ok === false) falhas++; };

  try {
    if (d.igFeed && lote.itens.length) {
      const legenda = ['🔥 Achadinhos de hoje', '', ...lote.itens.slice(0, 10).map((p, i) => `${i + 1}. ${p.titulo}, R$ ${brl(p.preco)}`), '', 'Links nos stories e na bio.', '#achadinhosshopee #promoção #ofertadodia'].join('\n');
      conta(await tentar(uid, chave, lote, 'instagram', 'Feed (carrossel)', { titulo: `Carrossel com ${Math.min(10, lote.itens.length)} produtos`, img: lote.itens[0].img, preco: lote.itens[0].preco }, ig.ok,
        () => postarFeed(igCred, lote.itens, legenda)));
    }
    for (let i = 0; i < lote.itens.length; i++) {
      if (i > 0) await espera(Math.max(0, lote.intervalo) * 60000);
      const p = lote.itens[i];
      for (const g of d.grupos || []) {
        conta(await tentar(uid, chave, lote, 'whatsapp', g.nome, p, waOk,
          () => enviarWhatsApp(uid, g.id, preencher(tpl.whatsapp, p), p)));
      }
      if (d.telegram) {
        conta(await tentar(uid, chave, lote, 'telegram', tg.dados.chatNome || tg.dados.chat || 'Telegram', p, tg.ok,
          () => enviarTelegram(tgCred, preencher(tpl.telegram, p), p)));
      }
      if (d.igStory) {
        conta(await tentar(uid, chave, lote, 'instagram', 'Stories', p, ig.ok, () => postarStory(igCred, p)));
      }
    }
  } finally {
    emAndamento.delete(chave);
    db.prepare('UPDATE disparos SET status = ? WHERE chave = ?').run(falhas ? 'com_falhas' : 'concluido', chave);
  }
  return true;
}

const hojeISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function tick() {
  const n = new Date();
  for (const r of db.prepare('SELECT id, usuario_id, dias, hora, itens FROM lotes WHERE ativo = 1').all()) {
    const dias = J(r.dias, []);
    if (!dias.includes(n.getDay()) || !J(r.itens, []).length) continue;
    const [h, m] = String(r.hora).split(':').map(Number);
    const alvo = new Date(n); alvo.setHours(h, m, 0, 0);
    const diff = n - alvo;
    if (diff < 0 || diff > 15 * 60000) continue; // só dispara até 15 min depois do horário
    const chave = `lote:${r.id}:${hojeISO(n)}T${r.hora}`;
    executarLote(r.usuario_id, r.id, chave).catch(e => console.error('Disparo', chave, e.message));
  }
}

export function iniciarAgenda() {
  db.prepare("UPDATE disparos SET status = 'interrompido' WHERE status = 'enviando'").run();
  setInterval(tick, 20000);
  setTimeout(tick, 2000);
}

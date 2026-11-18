// Modelos de mensagem por canal e preenchimento com os dados do produto.
import { db } from './db.js';

export const MODELOS_PADRAO = {
  whatsapp: '🔥 *{titulo}*\n\n~R$ {preco_antigo}~ por *R$ {preco}*\n🎟️ Cupom: *{cupom}*\n\n👉 {link}\n\n_Preço pode mudar a qualquer momento._',
  telegram: '🔥 *{titulo}*\n\nDe ~R$ {preco_antigo}~ por *R$ {preco}* ({desconto}% OFF)\n🎟️ Cupom: *{cupom}*\n\n🛒 {link}',
  instagram: '{titulo}\n\nDe R$ {preco_antigo} por R$ {preco} ({desconto}% OFF)\nUse o cupom {cupom}\n\nLink na bio e nos stories.\n#achadinhosshopee #promoção #ofertadodia',
};

const brl = n => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (a, b) => (b > a && b > 0 ? Math.round((1 - a / b) * 100) : 0);

export function modelosDe(uid) {
  const m = { ...MODELOS_PADRAO };
  for (const r of db.prepare('SELECT canal, texto FROM modelos WHERE usuario_id = ?').all(uid)) m[r.canal] = r.texto;
  return m;
}

export function preencher(tpl, o) {
  let linhas = tpl.split('\n');
  if (!o.cupom) linhas = linhas.filter(l => !l.includes('{cupom}'));
  if (!(o.precoAntigo > o.preco)) {
    linhas = linhas.map(l => l
      .replace(/~?De ~?R\$ \{preco_antigo\}~? por /i, 'Por ')
      .replace(/~R\$ \{preco_antigo\}~ por /, '')
      .replace(/ \(\{desconto\}% OFF\)/, ''));
  }
  const v = { titulo: o.titulo, preco: brl(o.preco), preco_antigo: brl(o.precoAntigo), desconto: pct(o.preco, o.precoAntigo), cupom: o.cupom || '', link: o.link || '' };
  return linhas.join('\n').replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
}

// Telegram: converte *negrito* ~riscado~ _itálico_ para HTML do Bot API.
export function paraHtmlTelegram(txt) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc(txt)
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    .replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>');
}

/* Afilia+ · painel web (sem framework). Fala com o servidor em /api. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = n => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (a, b) => (b > a && b > 0 ? Math.round((1 - a / b) * 100) : 0);
const fmtN = n => (n >= 1000 ? (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : String(n));
const fmtTime = t => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

async function api(metodo, url, corpo) {
  const r = await fetch(url, { method: metodo, headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined, credentials: 'same-origin' });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/login' && url !== '/api/eu') { S.eu = null; telaLogin(); throw new Error(j.erro || 'Sessão expirada'); }
  if (!r.ok) throw new Error(j.erro || 'Algo deu errado. Tente de novo.');
  return j;
}
const GET = u => api('GET', u), POST = (u, b) => api('POST', u, b || {}), PUT = (u, b) => api('PUT', u, b), DEL = u => api('DELETE', u);

function toast(t, ruim) { const el = document.createElement('div'); el.className = 'toast'; if (ruim) el.style.background = 'var(--bad)'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 3200); }
const falha = e => toast(e.message || String(e), true);

const ICON = {
  painel: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  emalta: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  lotes: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  agenda: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  historico: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  modelos: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  conexoes: '<path d="M9 7V2M15 7V2M6 7h12v4a6 6 0 0 1-12 0zM12 17v5"/>',
  clientes: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3"/>',
  conta: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  mais: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
};
const ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const CH = { instagram: 'Instagram', whatsapp: 'WhatsApp', telegram: 'Telegram' };
const chPill = c => `<span class="ch ${c}"><span class="dot"></span>${CH[c] || c}</span>`;
const stPill = s => `<span class="st ${s}">${{ agendado: 'Agendado', enviado: 'Enviado', falhou: 'Falhou' }[s] || s}</span>`;
function fmtDias(d) { const s = [...d].sort().join(','); return { '0,1,2,3,4,5,6': 'Todos os dias', '1,2,3,4,5': 'Seg a sex', '1,2,3,4,5,6': 'Seg a sáb', '0,6': 'Sáb e dom' }[s] || [...d].sort().map(x => DIAS[x]).join(', ') || 'Nenhum dia'; }
function dayLabel(t) {
  const d = new Date(t), n = new Date(); const tm = new Date(n); tm.setDate(n.getDate() + 1); const y = new Date(n); y.setDate(n.getDate() - 1);
  if (sameDay(d, n)) return 'Hoje'; if (sameDay(d, tm)) return 'Amanhã'; if (sameDay(d, y)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
}

/* ---------- Estado ---------- */
const S = { eu: null, lotes: [], envios: [], conn: null, wa: null, modelos: null, padrao: null, prod: null, sel: new Map(), q: '', ordem: 'vendas', hCh: 'todos', hSt: 'todos', wk: 0, pvCanal: 'whatsapp' };

async function carregar() {
  const [lotes, envios, conn] = await Promise.all([GET('/api/lotes'), GET('/api/envios'), GET('/api/conexoes')]);
  Object.assign(S, { lotes, envios, conn });
}
const destCount = l => (l.destinos.grupos || []).length + (l.destinos.telegram ? 1 : 0) + (l.destinos.igFeed ? 1 : 0) + (l.destinos.igStory ? 1 : 0);
function loteTime(l, day) { const t = new Date(day); const [h, m] = l.hora.split(':'); t.setHours(+h, +m, 0, 0); return t.getTime(); }
function proximos(dias = 14, desde = -7) {
  const out = [], now = Date.now();
  for (const l of S.lotes) {
    if (!l.ativo || !l.itens.length) continue;
    for (let i = desde; i < dias; i++) { const d = new Date(); d.setDate(d.getDate() + i); if (!l.dias.includes(d.getDay())) continue; const t = loteTime(l, d); if (t >= now) out.push({ lote: l, quando: t }); }
  }
  return out.sort((a, b) => a.quando - b.quando);
}
const destPills = l => (l.destinos.grupos || []).map(g => `<span class="dest wa"><span class="dot"></span><span class="n">${esc(g.nome)}</span></span>`).join('')
  + (l.destinos.telegram ? `<span class="dest tg"><span class="dot"></span><span class="n">${esc(S.conn?.telegram?.chatNome || 'Telegram')}</span></span>` : '')
  + (l.destinos.igFeed ? '<span class="dest ig"><span class="dot"></span><span class="n">Instagram feed (carrossel)</span></span>' : '')
  + (l.destinos.igStory ? '<span class="dest ig"><span class="dot"></span><span class="n">Instagram stories</span></span>' : '');

/* ---------- Mensagens ---------- */
function preencher(tpl, o) {
  let linhas = tpl.split('\n');
  if (!o.cupom) linhas = linhas.filter(l => !l.includes('{cupom}'));
  if (!(o.precoAntigo > o.preco)) linhas = linhas.map(l => l.replace(/~?De ~?R\$ \{preco_antigo\}~? por /i, 'Por ').replace(/~R\$ \{preco_antigo\}~ por /, '').replace(/ \(\{desconto\}% OFF\)/, ''));
  return linhas.join('\n').replace(/\{(\w+)\}/g, (m, k) => ({ titulo: o.titulo, preco: brl(o.preco), preco_antigo: brl(o.precoAntigo), desconto: pct(o.preco, o.precoAntigo), cupom: o.cupom, link: o.link }[k] ?? m));
}
const rich = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<span class="lnk">$1</span>').replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/~([^~\n]+)~/g, '<s>$1</s>').replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>').replace(/\n/g, '<br>');
function mockup(canal, o, tpl) {
  const msg = rich(preencher(tpl, o)); const ini = (S.eu?.conta?.nome || 'A').slice(0, 2).toUpperCase();
  if (canal === 'instagram') return `<div class="mock"><div class="mock-bar"><div class="av">${esc(ini)}</div><div>${esc(S.conn?.instagram?.usuario || 'sua.conta')}<div class="muted" style="font-weight:400;font-size:11px">Publicação no feed</div></div></div>
    <div class="ig-img"><img src="${esc(o.img)}" alt=""><div class="ig-tag">${o.precoAntigo > o.preco ? `<small>R$ ${brl(o.precoAntigo)}</small>` : ''}R$ ${brl(o.preco)}</div></div>
    <div class="ig-icons">${ic('heart')}${ic('chat')}${ic('send')}</div><div class="ig-cap">${msg}</div></div>`;
  if (canal === 'whatsapp') return `<div class="mock"><div class="mock-bar wa-head"><div class="av">${esc(ini)}</div><div>Seu grupo<div style="font-weight:400;font-size:11px;opacity:.85">Grupo do WhatsApp</div></div></div>
    <div class="wa-wrap"><div class="bubble"><img src="${esc(o.img)}" alt=""><div class="tx">${msg}</div><div class="tm">12:00</div></div></div></div>`;
  return `<div class="mock"><div class="mock-bar tg-head"><div class="av">${esc(ini)}</div><div>${esc(S.conn?.telegram?.chatNome || 'Seu canal')}<div style="font-weight:400;font-size:11px;opacity:.85">Telegram</div></div></div>
    <div class="tg-wrap"><div class="bubble"><img src="${esc(o.img)}" alt=""><div class="tx">${msg}</div><div class="tm">12:00</div></div><span class="tg-btn">Comprar na Shopee</span></div></div>`;
}

/* ---------- Casca ---------- */
const ROTAS = [['painel', 'Painel'], ['emalta', 'Em alta'], ['lotes', 'Lotes'], ['agenda', 'Agenda'], ['historico', 'Histórico'], ['modelos', 'Mensagens'], ['conexoes', 'Conexões']];
const BROTAS = [['painel', 'Painel'], ['emalta', 'Em alta'], ['lotes', 'Lotes'], ['agenda', 'Agenda'], ['mais', 'Mais']];
const rota = () => { const h = location.hash.slice(1); return VIEWS[h] ? h : 'painel'; };
const head = (t, p, extra = '') => `<div class="head"><div><div class="mobile-brand" style="margin-bottom:10px"><img src="/marca/icone-64.png" alt=""><b style="font-family:var(--f-display);font-weight:700">Afilia<span style="color:var(--roxo)">+</span></b>${S.eu?.demo ? '<span class="badge-demo">demonstração</span>' : ''}</div><h1>${t}</h1>${p ? `<p>${p}</p>` : ''}</div>${extra}</div>`;

function shell() {
  const eu = S.eu, admin = eu.usuario.papel === 'admin';
  const rotas = admin ? [...ROTAS, ['clientes', 'Clientes']] : ROTAS;
  return `<div class="app">
  <aside class="side">
    <a class="brand-logo" href="#painel"><img src="/marca/icone-192.png" alt=""><div><b>Afilia<span>+</span></b><small>Ofertas de afiliado</small></div></a>
    ${admin && eu.contas.length > 1 ? `<label class="field" style="padding:0 6px"><span class="label" style="color:var(--side-muted)">Conta em uso</span><select class="input" id="contasel">${eu.contas.map(c => `<option value="${c.id}" ${c.id === eu.conta.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>` : ''}
    <nav class="nav" id="nav">${rotas.map(([k, l]) => `<a href="#${k}" data-r="${k}">${ic(k)}${l}</a>`).join('')}</nav>
    <div class="side-foot">
      ${eu.demo ? '<div class="proto-note" style="background:var(--side-hover);border-color:#333;color:var(--side-muted)"><b style="color:var(--accent)">Modo demonstração.</b> Produtos de exemplo e envios simulados até você configurar as chaves.</div>' : ''}
      <div class="who"><b>${esc(eu.conta.nome)}</b>${esc(eu.usuario.email)}</div>
      <a class="btn ghost sm" href="#conta">Minha conta</a>
    </div>
  </aside>
  <main class="main"><div class="wrap" id="view"></div></main>
  <nav class="bottom-nav" id="bnav" style="grid-template-columns:repeat(5,minmax(0,1fr))">${BROTAS.map(([k, l]) => `<a href="#${k}" data-r="${k}">${ic(k)}${l}</a>`).join('')}</nav>
</div>`;
}

function telaLogin() {
  $('#root').innerHTML = `<div class="login"><div><form class="card" id="flogin">
    <div class="brand-logo"><img src="/marca/icone-192.png" alt=""><div><b>Afilia<span>+</span></b><small>Ofertas de afiliado no automático</small></div></div>
    <h2 style="margin-top:6px">Entrar</h2>
    <label class="field"><span>E-mail</span><input class="input" name="email" type="email" autocomplete="username" required></label>
    <label class="field"><span>Senha</span><input class="input" name="senha" type="password" autocomplete="current-password" required></label>
    <div class="err" id="lerr" hidden></div>
    <button class="btn primary" type="submit">Entrar →</button>
    <small class="muted">Esqueceu a senha? Fale com a administradora da sua conta.</small>
  </form><p class="slogan">Automatize a divulgação de ofertas de afiliados e aumente seus ganhos.</p></div></div>`;
  $('#flogin').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target);
    try { await POST('/api/login', { email: f.get('email'), senha: f.get('senha') }); await iniciar(); }
    catch (er) { const el = $('#lerr'); el.hidden = false; el.textContent = er.message; }
  };
}

/* ---------- Painel ---------- */
function vPainel() {
  const now = Date.now(), wk = now + 7 * 864e5, past = now - 7 * 864e5;
  const prox = proximos(14, 0);
  const env7 = S.envios.filter(e => e.quando >= past);
  const ok7 = env7.filter(e => e.status === 'enviado');
  const falhas = env7.filter(e => e.status === 'falhou');
  const ativos = S.lotes.filter(l => l.ativo);
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return { d, n: ok7.filter(e => sameDay(e.quando, d)).length }; });
  const maxD = Math.max(1, ...days.map(x => x.n));
  const byCh = Object.keys(CH).map(c => [c, ok7.filter(e => e.canal === c).length]); const maxC = Math.max(1, ...byCh.map(x => x[1]));
  const c = S.conn;
  const falta = [!c.shopee.ok && 'Shopee', !c.whatsapp.ok && 'WhatsApp', !c.telegram.ok && 'Telegram', !c.instagram.ok && 'Instagram'].filter(Boolean);
  return head('Painel', 'Seus lotes de ofertas, os próximos disparos e o que já saiu.', '<a class="btn primary" href="#emalta">' + ic('emalta') + 'Escolher produtos em alta</a>')
    + (!c.shopee.ok ? `<div class="card" style="border-color:var(--accent);background:var(--accent-soft);padding:12px 16px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>Conecte sua Shopee</b> para os links saírem com o seu ID de afiliado e a comissão ir para você.</span><a class="btn sm primary" href="#conexoes">Conectar</a></div>` : '')
    + (falhas.length ? `<div class="card" style="border-color:var(--bad);background:var(--bad-soft);padding:12px 16px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b style="color:var(--bad)">${falhas.length} envio${falhas.length > 1 ? 's' : ''} com falha.</b> ${esc(falhas[0].erro)}</span><a class="btn sm" href="#historico">Ver no histórico</a></div>` : '')
    + `<div class="kpis">
      <div class="kpi"><div class="label">Lotes ativos</div><div class="v num">${ativos.length}</div><div class="d">${ativos.reduce((a, l) => a + l.itens.length, 0)} produtos com seu link</div></div>
      <div class="kpi"><div class="label">Disparos agendados</div><div class="v num">${prox.filter(p => p.quando < wk).length}</div><div class="d">Próximos 7 dias</div></div>
      <div class="kpi"><div class="label">Mensagens enviadas</div><div class="v num">${ok7.length}</div><div class="d">Últimos 7 dias</div></div>
      <div class="kpi"><div class="label">Canais conectados</div><div class="v num">${4 - falta.length}/4</div><div class="d">${falta.length ? 'Falta: ' + falta.join(', ') : 'Tudo conectado'}</div></div>
    </div>
    <div class="dash">
      <div class="card"><div class="card-head"><h2>Próximos disparos</h2><a class="btn sm ghost" href="#agenda">Ver agenda</a></div>
        <div class="list">${prox.slice(0, 6).map(p => { const f = p.lote.itens[0]; return `<div class="li"><div class="when">${fmtTime(p.quando)}<small>${dayLabel(p.quando)}</small></div><img class="thumb" src="${esc(f.img)}" alt=""><div style="min-width:0"><div class="t">${esc(p.lote.nome)}</div><div class="s"><span class="muted" style="font-size:12px">${p.lote.itens.length} produtos para ${destCount(p.lote)} destino${destCount(p.lote) > 1 ? 's' : ''}</span></div></div><a class="btn sm" href="#lotes">Ver lote</a></div>`; }).join('') || '<p class="muted">Nenhum disparo agendado. Monte um lote em <a href="#emalta">Em alta</a>.</p>'}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card"><h2 style="margin-bottom:10px">Envios por dia</h2><div class="spark">${days.map((x, i) => `<div><i class="${i === 6 ? 'today' : ''}" style="height:${(x.n / maxD) * 100}%"></i><span>${DIAS[x.d.getDay()]}</span></div>`).join('')}</div></div>
        <div class="card"><h2 style="margin-bottom:12px">Por canal (7 dias)</h2><div class="bars">${byCh.map(([k, n]) => `<div class="bar"><span>${CH[k]}</span><div class="track"><div class="fill" style="width:${(n / maxC) * 100}%;background:var(--${k === 'instagram' ? 'ig' : k === 'whatsapp' ? 'wa' : 'tg'})"></div></div><span class="n">${n}</span></div>`).join('')}</div></div>
      </div>
    </div>`;
}

/* ---------- Em alta ---------- */
function vEmAlta() {
  const P = S.prod;
  const lista = !P ? '<div class="loading">Buscando produtos…</div>' : P.erro ? `<div class="card"><b class="bad-t">Não deu para buscar na Shopee.</b><p class="muted">${esc(P.erro)}</p></div>` : !P.itens.length ? '<p class="muted">Nenhum produto encontrado com essa busca.</p>'
    : `<div class="offers">${P.itens.map((p, i) => { const on = S.sel.has(p.itemId); const emLote = S.lotes.filter(l => l.itens.some(x => x.itemId === p.itemId)).map(l => l.nome);
      return `<div class="offer pick ${on ? 'on' : ''}" data-pick="${esc(p.itemId)}" role="checkbox" aria-checked="${on}" tabindex="0"><div class="ck">${on ? '✓' : ''}</div><span class="rank">#${i + 1}</span><img src="${esc(p.img)}" alt="" loading="lazy">
      <div class="b"><div class="tt">${esc(p.titulo)}</div><div class="price"><b>R$ ${brl(p.preco)}</b>${p.precoAntigo > p.preco ? `<s>R$ ${brl(p.precoAntigo)}</s><span class="off">-${pct(p.preco, p.precoAntigo)}%</span>` : ''}</div>
      <div class="stats"><span>${fmtN(p.vendas)} vendidos</span>${p.nota ? `<span>★ ${p.nota.toLocaleString('pt-BR')}</span>` : ''}</div>
      <span class="comm">Comissão ${p.comissao.toLocaleString('pt-BR')}%</span>${emLote.length ? `<span class="inlote">No lote: ${esc(emLote.join(', '))}</span>` : ''}</div></div>`; }).join('')}</div>`;
  return head('Produtos em alta', 'Os mais vendidos da Shopee agora. Marque os que quer divulgar e coloque num lote.')
    + (P?.demo ? '<div class="info">Mostrando <b>produtos de exemplo</b>. Quando a chave da Open API da Shopee for configurada no servidor, esta tela passa a mostrar os produtos reais.</div>' : '')
    + `<div class="toolbar"><form class="row" id="fbusca" style="flex:1"><input class="input search" id="tq" placeholder="Buscar produto ou categoria" value="${esc(S.q)}"><button class="btn" type="submit">Buscar</button></form>
      <label class="row"><span class="muted">Ordenar</span><select class="input" id="tsort" style="width:auto"><option value="vendas">Mais vendidos</option><option value="comissao">Maior comissão</option><option value="menor">Menor preço</option><option value="relevancia">Relevância</option></select></label></div>` + lista;
}
async function carregarProdutos(redesenhar = true) {
  S.prod = null; if (redesenhar && rota() === 'emalta') renderView();
  try { S.prod = await GET(`/api/produtos?q=${encodeURIComponent(S.q)}&ordem=${S.ordem}`); } catch (e) { S.prod = { erro: e.message, itens: [] }; }
  if (rota() === 'emalta') renderView();
}
function renderSelbar() {
  document.querySelector('.selbar')?.remove(); document.body.classList.toggle('has-sel', S.sel.size > 0 && rota() === 'emalta');
  if (!S.sel.size || rota() !== 'emalta') return;
  const el = document.createElement('div'); el.className = 'selbar';
  el.innerHTML = `<div class="in"><b>${S.sel.size} produto${S.sel.size > 1 ? 's' : ''} marcado${S.sel.size > 1 ? 's' : ''}</b><div class="row">
    ${S.lotes.length ? `<select class="input" id="sel-lote">${S.lotes.map(l => `<option value="${l.id}">${esc(l.nome)}</option>`).join('')}</select><button class="btn" id="sel-add">Pôr no lote</button>` : ''}
    <button class="btn primary" id="sel-new">Criar lote novo</button><button class="btn ghost" id="sel-clear">Limpar</button></div></div>`;
  document.body.appendChild(el);
  $('#sel-clear').onclick = () => { S.sel.clear(); renderView(); };
  $('#sel-new').onclick = () => abrirLote(null, [...S.sel.values()]);
  if ($('#sel-add')) $('#sel-add').onclick = async () => {
    try { const id = $('#sel-lote').value; const r = await POST(`/api/lotes/${id}/itens`, { itens: [...S.sel.values()] }); S.sel.clear(); S.lotes = await GET('/api/lotes'); renderView(); toast(r.novos ? `${r.novos} produto${r.novos > 1 ? 's' : ''} no lote, com seu link de afiliado` : 'Esses produtos já estavam no lote'); } catch (e) { falha(e); }
  };
}

/* ---------- Lotes ---------- */
function vLotes() {
  return head('Lotes', 'Cada lote é um grupo de produtos com dia, horário e destinos. Os produtos saem um por um, no intervalo que você escolher.', '<button class="btn primary" data-lnew="1">+ Novo lote</button>')
    + (S.lotes.length ? `<div class="lotes">${S.lotes.map(l => { const nx = proximos(15, 0).find(p => p.lote.id === l.id);
      return `<div class="card lote ${l.ativo ? '' : 'paused'}"><div class="lote-h"><div><h2>${esc(l.nome)}</h2><div class="sched" style="margin-top:6px"><b>${esc(l.hora)}</b><span class="muted">${fmtDias(l.dias)} · intervalo de ${l.intervalo} min</span></div></div><button class="switch ${l.ativo ? 'on' : ''}" data-ltog="${l.id}" aria-label="${l.ativo ? 'Pausar' : 'Ativar'} lote"></button></div>
      <div class="chips">${destPills(l) || '<span class="muted">Sem destino. Edite o lote para escolher.</span>'}</div>
      <div class="items">${l.itens.map((p, i) => `<div class="item"><span class="ord">${i + 1}</span><img class="thumb" style="width:40px;height:40px" src="${esc(p.img)}" alt=""><div style="min-width:0"><div class="t">${esc(p.titulo)}</div><div class="mono" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">R$ ${brl(p.preco)} · <a href="${esc(p.link)}" target="_blank" rel="noopener" style="color:inherit">${S.conn?.shopee?.ok ? 'link com seu ID de afiliado' : 'link sem ID (conecte a Shopee)'}</a></div></div><button class="btn ghost sm" data-lrm="${l.id}|${esc(p.itemId)}" aria-label="Tirar do lote">${ic('x')}</button></div>`).join('') || '<div class="item"><span></span><span></span><span class="muted">Sem produtos. Adicione em Em alta.</span></div>'}</div>
      <div class="row" style="justify-content:space-between"><span class="next">${nx ? `Próximo: <b>${dayLabel(nx.quando)} às ${fmtTime(nx.quando)}</b>` : l.ativo ? 'Sem próximo disparo' : 'Pausado'}</span>
      <div class="row"><button class="btn sm" data-lrun="${l.id}">${ic('play')}Disparar agora</button><button class="btn sm" data-led="${l.id}">Editar</button><button class="btn sm ghost danger" data-ldel="${l.id}">Excluir</button></div></div></div>`; }).join('')}</div>`
      : '<div class="card"><h2>Nenhum lote ainda</h2><p class="muted">Vá em <a href="#emalta">Em alta</a>, marque os produtos e crie seu primeiro lote.</p></div>');
}

async function abrirLote(id, novos = []) {
  const base = id ? S.lotes.find(l => l.id === id) : null;
  const ed = base ? JSON.parse(JSON.stringify(base)) : { nome: '', dias: [1, 2, 3, 4, 5], hora: '09:00', intervalo: 3, destinos: { grupos: [], telegram: false, igFeed: false, igStory: false }, itens: [], ativo: true };
  for (const p of novos) if (!ed.itens.some(i => i.itemId === p.itemId)) ed.itens.push(p);
  let grupos = [];
  try { const wa = await GET('/api/conexoes/whatsapp'); grupos = wa.grupos || []; } catch { /* sem grupos */ }
  for (const g of ed.destinos.grupos || []) if (!grupos.some(x => x.id === g.id)) grupos.push(g);
  const c = S.conn;
  const draw = () => {
    $('#layer').innerHTML = `<div class="ov" id="ov"><div class="modal" role="dialog" aria-modal="true" aria-label="Lote"><div class="modal-h"><h2>${id ? 'Editar lote' : 'Novo lote'}</h2><button class="btn ghost sm" id="mx" aria-label="Fechar">${ic('x')}</button></div>
    <div class="ed">
      <label class="field"><span>Nome do lote</span><input class="input" id="ln" value="${esc(ed.nome)}" placeholder="Ex.: Manhã · Casa e cozinha"></label>
      <div class="field"><span>Dias</span><div class="daychips">${DIAS.map((d, i) => `<button type="button" class="${ed.dias.includes(i) ? 'on' : ''}" data-dia="${i}">${d}</button>`).join('')}</div></div>
      <div class="grid2"><label class="field"><span>Horário do primeiro envio</span><input class="input" type="time" id="lh" value="${esc(ed.hora)}"></label>
      <label class="field"><span>Intervalo entre produtos (minutos)</span><input class="input" type="number" min="0" max="120" id="li" value="${ed.intervalo}"></label></div>
      <div class="field"><span>Destinos</span><div class="checks">
        ${grupos.length ? grupos.map(g => `<label><input type="checkbox" data-g="${esc(g.id)}" data-gn="${esc(g.nome)}" ${(ed.destinos.grupos || []).some(x => x.id === g.id) ? 'checked' : ''}>${chPill('whatsapp')} ${esc(g.nome)} ${g.membros ? `<span class="muted">${g.membros} membros</span>` : ''}</label>`).join('') : `<div class="warn">${c.whatsapp.ok ? 'Nenhum grupo encontrado nesse número.' : '<b>WhatsApp não conectado.</b> Conecte em Conexões para escolher os grupos.'}</div>`}
        <label><input type="checkbox" id="dtg" ${ed.destinos.telegram ? 'checked' : ''}>${chPill('telegram')} ${esc(c.telegram.chatNome || 'Canal do Telegram')} ${c.telegram.ok ? '' : '<span class="muted">(não conectado)</span>'}</label>
        <label><input type="checkbox" id="dfeed" ${ed.destinos.igFeed ? 'checked' : ''}>${chPill('instagram')} Feed, um carrossel com os produtos do lote ${c.instagram.ok ? '' : '<span class="muted">(não conectado)</span>'}</label>
        <label><input type="checkbox" id="dstory" ${ed.destinos.igStory ? 'checked' : ''}>${chPill('instagram')} Stories, um por produto ${c.instagram.ok ? '' : '<span class="muted">(não conectado)</span>'}</label>
      </div></div>
      <div class="field"><span>Produtos (${ed.itens.length}) na ordem de envio</span><div class="items">${ed.itens.map((p, i) => `<div class="item"><span class="ord">${i + 1}</span><img class="thumb" style="width:40px;height:40px" src="${esc(p.img)}" alt=""><div style="min-width:0"><div class="t">${esc(p.titulo)}</div><div class="row" style="gap:6px;margin-top:4px"><span class="muted" style="font-size:12px">R$ ${brl(p.preco)}</span><input class="input" style="max-width:140px;padding:4px 8px;font-size:12px" placeholder="Cupom (opcional)" data-cup="${i}" value="${esc(p.cupom || '')}"></div></div><div class="row" style="gap:2px">${i ? `<button class="btn ghost sm" data-up="${i}" aria-label="Subir">${ic('up')}</button>` : ''}<button class="btn ghost sm" data-rm="${i}" aria-label="Tirar">${ic('x')}</button></div></div>`).join('') || '<div class="item"><span></span><span></span><span class="muted">Sem produtos. Você pode salvar e adicionar depois em Em alta.</span></div>'}</div></div>
      <div class="err" id="lerr" hidden></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" id="mc">Cancelar</button><button class="btn primary" id="ms">Salvar lote</button></div>
    </div></div></div>`;
    const ler = () => { ed.nome = $('#ln').value; ed.hora = $('#lh').value; ed.intervalo = +$('#li').value; $$('[data-cup]').forEach(x => { ed.itens[+x.dataset.cup].cupom = x.value.trim(); });
      ed.destinos = { grupos: $$('[data-g]').filter(x => x.checked).map(x => ({ id: x.dataset.g, nome: x.dataset.gn })), telegram: $('#dtg').checked, igFeed: $('#dfeed').checked, igStory: $('#dstory').checked }; };
    const close = () => { $('#layer').innerHTML = ''; };
    $('#mx').onclick = close; $('#mc').onclick = close; $('#ov').onclick = e => { if (e.target.id === 'ov') close(); };
    $$('[data-dia]').forEach(b => b.onclick = () => { ler(); const d = +b.dataset.dia; ed.dias = ed.dias.includes(d) ? ed.dias.filter(x => x !== d) : [...ed.dias, d]; draw(); });
    $$('[data-rm]').forEach(b => b.onclick = () => { ler(); ed.itens.splice(+b.dataset.rm, 1); draw(); });
    $$('[data-up]').forEach(b => b.onclick = () => { ler(); const i = +b.dataset.up; [ed.itens[i - 1], ed.itens[i]] = [ed.itens[i], ed.itens[i - 1]]; draw(); });
    $('#ms').onclick = async () => {
      ler();
      try { if (id) await PUT(`/api/lotes/${id}`, ed); else await POST('/api/lotes', ed); S.sel.clear(); S.lotes = await GET('/api/lotes'); close(); if (location.hash !== '#lotes') location.hash = 'lotes'; else renderView(); toast(`Lote "${ed.nome}" salvo`); }
      catch (e) { const el = $('#lerr'); el.hidden = false; el.textContent = e.message; }
    };
  };
  draw();
}

/* ---------- Agenda ---------- */
function vAgenda() {
  const ini = new Date(); ini.setHours(0, 0, 0, 0); ini.setDate(ini.getDate() - ini.getDay() + S.wk * 7);
  const dias = [...Array(7)].map((_, i) => { const d = new Date(ini); d.setDate(ini.getDate() + i); return d; });
  const runs = proximos(60, -7);
  const passados = S.envios.reduce((m, e) => { const k = e.disparo || e.id; if (!m[k]) m[k] = { lote: e.lote_nome, quando: e.quando, n: 0, falhas: 0 }; m[k].n++; if (e.status === 'falhou') m[k].falhas++; m[k].quando = Math.min(m[k].quando, e.quando); return m; }, {});
  const titulo = `${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
  return head('Agenda', 'Os disparos de cada lote na semana. Os passados mostram quantas mensagens saíram.', `<div class="row"><button class="btn sm" id="wprev">‹</button><button class="btn sm" id="wtoday">Hoje</button><button class="btn sm" id="wnext">›</button><b>${titulo}</b></div>`)
    + `<div class="week">${dias.map(d => { const hoje = sameDay(d, Date.now()), passado = d < new Date().setHours(0, 0, 0, 0);
      const fut = runs.filter(r => sameDay(r.quando, d)).map(r => `<button class="slot run" style="--c:var(--accent-text)" data-led="${r.lote.id}"><span class="tm">${fmtTime(r.quando)}<span>Agendado</span></span><span class="nm">${esc(r.lote.nome)}</span><span class="sub">${r.lote.itens.length} produtos</span></button>`);
      const pas = Object.values(passados).filter(p => sameDay(p.quando, d)).sort((a, b) => a.quando - b.quando).map(p => `<a class="slot ${p.falhas ? 'falhou' : 'enviado'}" style="--c:${p.falhas ? 'var(--bad)' : 'var(--ok)'};text-decoration:none;color:inherit" href="#historico"><span class="tm">${fmtTime(p.quando)}<span>${p.falhas ? p.falhas + ' falha' + (p.falhas > 1 ? 's' : '') : 'Enviado'}</span></span><span class="nm">${esc(p.lote || 'Envio')}</span><span class="sub">${p.n} mensagens</span></a>`);
      const itens = [...pas, ...fut];
      return `<div class="day ${hoje ? 'today' : ''} ${passado ? 'past' : ''}"><div class="day-h"><b>${d.getDate()}</b><span>${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span></div>${itens.join('') || '<div class="empty-day">Nada</div>'}</div>`; }).join('')}</div>`;
}

/* ---------- Histórico ---------- */
function vHistorico() {
  const l = S.envios.filter(e => (S.hCh === 'todos' || e.canal === S.hCh) && (S.hSt === 'todos' || e.status === S.hSt));
  const chip = (attr, v, txt, cur) => `<button class="chip ${cur === v ? 'on' : ''}" data-${attr}="${v}">${txt}</button>`;
  return head('Histórico', 'Tudo que foi enviado, com o motivo de cada falha.')
    + `<div class="toolbar"><div class="chips">${chip('hc', 'todos', 'Todos os canais', S.hCh)}${Object.keys(CH).map(k => chip('hc', k, CH[k], S.hCh)).join('')}</div><div class="chips">${chip('hs', 'todos', 'Todos', S.hSt)}${chip('hs', 'enviado', 'Enviados', S.hSt)}${chip('hs', 'falhou', 'Falhas', S.hSt)}</div></div>
    <div class="tbl-wrap"><table><thead><tr><th>Quando</th><th>Produto</th><th>Canal</th><th>Destino</th><th>Status</th></tr></thead><tbody>
    ${l.map(e => `<tr><td class="num">${dayLabel(e.quando)}, ${fmtTime(e.quando)}</td><td><div class="of">${e.produto.img ? `<img src="${esc(e.produto.img)}" alt="">` : ''}<div style="min-width:0"><b>${esc(e.produto.titulo)}</b><span class="muted" style="font-size:12px">${esc(e.lote_nome || '')}</span></div></div></td><td>${chPill(e.canal)}</td><td>${esc(e.destino || '')}</td><td>${stPill(e.status)}${e.simulado ? ' <span class="muted" style="font-size:11px">simulado</span>' : ''}${e.erro ? `<div class="err">${esc(e.erro)}</div>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Nada por aqui ainda.</td></tr>'}
    </tbody></table></div>`;
}

/* ---------- Mensagens (modelos) ---------- */
function vModelos() {
  if (!S.modelos) { GET('/api/modelos').then(r => { S.modelos = r.modelos; S.padrao = r.padrao; renderView(); }).catch(falha); return head('Mensagens') + '<div class="loading">Carregando…</div>'; }
  const ex = S.lotes[0]?.itens[0] || { titulo: 'Produto de exemplo', preco: 89.9, precoAntigo: 159.9, img: '/demo/img/1.svg', link: 'https://s.shopee.com.br/exemplo', cupom: 'CUPOM10' };
  const vars = ['{titulo}', '{preco}', '{preco_antigo}', '{desconto}', '{cupom}', '{link}'];
  return head('Mensagens', 'O texto que acompanha cada produto. Use as variáveis e veja a prévia ao lado.', '<button class="btn sm ghost" id="tplreset">Restaurar padrão</button>')
    + `<div class="mocks">${['whatsapp', 'telegram', 'instagram'].map(k => `<div class="mock-col"><div class="card" style="display:flex;flex-direction:column;gap:10px">${chPill(k)}<textarea class="input" id="tpl-${k}" data-tpl="${k}">${esc(S.modelos[k])}</textarea><div class="vars" data-for="${k}">${vars.map(v => `<button type="button" data-var="${v}">${v}</button>`).join('')}</div></div><div id="mk-${k}">${mockup(k, ex, S.modelos[k])}</div></div>`).join('')}</div>
    <p class="muted" style="font-size:12px">No WhatsApp, *texto* fica em negrito, ~texto~ riscado e _texto_ em itálico. No Instagram o link não fica clicável, por isso ele vai na bio e nos stories.</p>`;
}
let tplTimer;

/* ---------- Conexões ---------- */
function vConexoes() {
  const c = S.conn;
  const estado = ok => ok ? '<span class="ok-t">● Conectado</span>' : '<span class="muted">○ Não conectado</span>';
  const wa = S.wa || c.whatsapp;
  return head('Conexões', 'Ligue sua conta de afiliado e os canais onde as ofertas vão sair.')
    + `<div class="conn-grid">
    <div class="card conn"><div class="conn-h"><div class="logo" style="background:#EE4D2D">S</div><div style="flex:1"><h2>Shopee</h2>${estado(c.shopee.ok)}</div></div>
      ${c.shopee.ok ? `<p>Seus links saem com o ID de afiliado <b class="num">${esc(c.shopee.afiliadoId)}</b>. A comissão das vendas vai para essa conta.</p><div class="row"><button class="btn sm" data-shopee="1">Trocar conta</button><button class="btn sm ghost danger" data-off="shopee">Desconectar</button></div>`
      : `<p class="muted">Não pedimos senha nem App ID. É só colar um link de afiliado seu.</p><ol class="steps"><li>Abra o painel de afiliados da Shopee e gere o link de qualquer produto.</li><li>Copie o link (algo como s.shopee.com.br/abc123).</li><li>Cole aqui embaixo.</li></ol><button class="btn primary" data-shopee="1">Conectar minha Shopee</button>`}
    </div>
    <div class="card conn"><div class="conn-h"><div class="logo" style="background:var(--wa)">W</div><div style="flex:1"><h2>WhatsApp</h2>${wa.status === 'conectado' ? `<span class="ok-t">● Conectado${wa.numero ? ' · +' + esc(wa.numero) : ''}</span>` : wa.status === 'aguardando_qr' ? '<span class="muted">Aguardando leitura do QR code</span>' : wa.status === 'abrindo' || wa.status === 'reconectando' ? '<span class="muted">Conectando…</span>' : estado(false)}</div></div>
      ${wa.status === 'conectado' ? `<div>${(wa.grupos || []).slice(0, 8).map(g => `<div class="grp"><span>${esc(g.nome)}</span><span class="muted">${g.membros} membros</span></div>`).join('') || '<p class="muted">Nenhum grupo neste número.</p>'}</div><div class="row"><button class="btn sm ghost danger" data-off="whatsapp">Desconectar</button></div>`
      : wa.status === 'aguardando_qr' && wa.qr ? `<div class="qr"><img src="${wa.qr}" alt="QR code do WhatsApp"></div><ol class="steps"><li>No celular do chip de ofertas, abra o WhatsApp.</li><li>Toque em Aparelhos conectados e depois em Conectar aparelho.</li><li>Aponte a câmera para este código.</li></ol>`
      : `<p class="muted">Use um chip só para as ofertas. O número precisa estar nos grupos (de preferência como administrador).</p><div class="warn"><b>Atenção:</b> essa conexão usa o WhatsApp Web. Envie em ritmo humano para não correr risco de bloqueio do número.</div><button class="btn primary" id="wa-on">Gerar QR code</button>`}
    </div>
    <div class="card conn"><div class="conn-h"><div class="logo" style="background:var(--tg)">T</div><div style="flex:1"><h2>Telegram</h2>${estado(c.telegram.ok)}</div></div>
      ${c.telegram.ok ? `<p>Bot <b>${esc(c.telegram.bot)}</b> enviando para <b>${esc(c.telegram.chatNome)}</b>.</p>` : '<ol class="steps"><li>No Telegram, fale com o @BotFather e crie um bot (/newbot).</li><li>Adicione o bot como administrador do seu canal ou grupo.</li><li>Cole o token do bot e o @ do canal aqui.</li></ol>'}
      <form class="form" id="ftg" style="gap:10px"><label class="field"><span>Token do bot</span><input class="input" name="token" type="password" autocomplete="off" placeholder="${c.telegram.ok ? 'Guardado com segurança. Cole outro para trocar.' : '123456789:ABC...'}"></label>
      <label class="field"><span>@ do canal ou ID do grupo</span><input class="input" name="chat" placeholder="@meucanal" value="${esc(c.telegram.ok ? c.telegram.chat : '')}"></label>
      <div class="row"><button class="btn ${c.telegram.ok ? '' : 'primary'}" type="submit">${c.telegram.ok ? 'Salvar e testar' : 'Conectar Telegram'}</button>${c.telegram.ok ? '<button class="btn sm ghost danger" type="button" data-off="telegram">Desconectar</button>' : ''}</div></form>
    </div>
    <div class="card conn"><div class="conn-h"><div class="logo" style="background:var(--ig)">I</div><div style="flex:1"><h2>Instagram</h2>${c.instagram.ok ? `<span class="ok-t">● ${esc(c.instagram.usuario)}</span>` : estado(false)}</div></div>
      <p class="muted">Conta profissional ligada a uma Página do Facebook. Publica o carrossel no feed e os stories pela API oficial da Meta (até 100 publicações por dia).</p>
      <form class="form" id="fig" style="gap:10px"><label class="field"><span>ID da conta do Instagram</span><input class="input" name="igUserId" inputmode="numeric" value="${esc(c.instagram.igUserId || '')}" placeholder="17841400000000000"></label>
      <label class="field"><span>Token de acesso (longa duração)</span><input class="input" name="accessToken" type="password" autocomplete="off" placeholder="${c.instagram.ok ? 'Guardado com segurança. Cole outro para trocar.' : 'EAAG...'}"></label>
      <small class="muted">A agência gera esses dados no painel de desenvolvedores da Meta. Em breve vira um botão "Entrar com Facebook".</small>
      <div class="row"><button class="btn ${c.instagram.ok ? '' : 'primary'}" type="submit">${c.instagram.ok ? 'Salvar e testar' : 'Conectar Instagram'}</button>${c.instagram.ok ? '<button class="btn sm ghost danger" type="button" data-off="instagram">Desconectar</button>' : ''}</div></form>
    </div></div>`;
}
let waPoll;
function acompanharWA() {
  clearTimeout(waPoll);
  if (rota() !== 'conexoes') return;
  GET('/api/conexoes/whatsapp').then(st => {
    const mudou = JSON.stringify(st) !== JSON.stringify(S.wa); S.wa = st;
    if (st.status === 'conectado' && !S.conn.whatsapp.ok) { S.conn.whatsapp = { ok: true, ...st }; toast('WhatsApp conectado'); }
    if (mudou && rota() === 'conexoes') renderView();
    if (['aguardando_qr', 'abrindo', 'reconectando'].includes(st.status)) waPoll = setTimeout(acompanharWA, 2500);
  }).catch(() => {});
}
function abrirShopee() {
  $('#layer').innerHTML = `<div class="ov" id="ov"><div class="modal" style="max-width:520px"><div class="modal-h"><h2>Conectar minha Shopee</h2><button class="btn ghost sm" id="mx" aria-label="Fechar">${ic('x')}</button></div>
    <form class="ed" id="fsh"><p class="muted" style="margin:0">Cole um link de afiliado gerado na sua conta. A gente lê o seu ID de afiliado e passa a usar em todos os links.</p>
    <label class="field"><span>Seu link de afiliado</span><input class="input" name="link" placeholder="https://s.shopee.com.br/..." required></label>
    <div class="err" id="serr" hidden></div><div class="row" style="justify-content:flex-end"><button class="btn primary" type="submit" id="sbtn">Conectar</button></div></form></div></div>`;
  const close = () => { $('#layer').innerHTML = ''; };
  $('#mx').onclick = close;
  $('#fsh').onsubmit = async e => {
    e.preventDefault(); $('#sbtn').disabled = true; $('#sbtn').textContent = 'Conferindo…';
    try { const r = await POST('/api/conexoes/shopee', { link: new FormData(e.target).get('link') }); S.conn = await GET('/api/conexoes'); close(); renderView(); toast('Shopee conectada. ID ' + r.afiliadoId); }
    catch (er) { const el = $('#serr'); el.hidden = false; el.textContent = er.message; $('#sbtn').disabled = false; $('#sbtn').textContent = 'Conectar'; }
  };
}

/* ---------- Clientes e conta ---------- */
function vClientes() {
  if (S.eu.usuario.papel !== 'admin') return head('Clientes') + '<p class="muted">Só a administradora vê esta tela.</p>';
  return head('Clientes', 'Cada cliente tem o próprio login, a própria Shopee e os próprios canais. Você pode entrar na conta de qualquer um para configurar.')
    + `<div class="dash"><div class="card"><h2 style="margin-bottom:10px">Contas</h2><div class="list">${S.eu.contas.map(c => `<div class="li" style="grid-template-columns:minmax(0,1fr) auto"><div style="min-width:0"><div class="t">${esc(c.nome)} ${c.papel === 'admin' ? '<span class="badge-demo">admin</span>' : ''}</div><div class="muted" style="font-size:12px">${esc(c.email)}</div></div><div class="row">${c.id === S.eu.conta.id ? '<span class="muted">Em uso</span>' : `<button class="btn sm" data-usar="${c.id}">Trabalhar nesta conta</button>`}${c.papel !== 'admin' ? `<button class="btn sm ghost danger" data-cdel="${c.id}">Excluir</button>` : ''}</div></div>`).join('')}</div></div>
    <form class="card form" id="fcli"><h2>Novo cliente</h2><label class="field"><span>Nome</span><input class="input" name="nome" required></label><label class="field"><span>E-mail de login</span><input class="input" name="email" type="email" required></label><label class="field"><span>Senha inicial</span><input class="input" name="senha" type="text" minlength="8" required><small>Passe para o cliente por um canal seguro e peça para ele trocar em Minha conta.</small></label><div class="err" id="cerr" hidden></div><button class="btn primary" type="submit">Criar acesso</button></form></div>`;
}
function vConta() {
  return head('Minha conta', esc(S.eu.usuario.email))
    + `<div class="dash"><form class="card form" id="fsenha"><h2>Trocar senha</h2><label class="field"><span>Senha atual</span><input class="input" name="atual" type="password" autocomplete="current-password" required></label><label class="field"><span>Nova senha</span><input class="input" name="nova" type="password" minlength="8" autocomplete="new-password" required></label><div class="err" id="perr" hidden></div><button class="btn primary" type="submit">Salvar nova senha</button></form>
    <div class="card form"><h2>Sair</h2><p class="muted">Encerra a sessão neste aparelho.</p><button class="btn" id="sair">Sair da conta</button></div></div>`;
}
function vMais() {
  const it = [['historico', 'Histórico'], ['modelos', 'Mensagens'], ['conexoes', 'Conexões'], ...(S.eu.usuario.papel === 'admin' ? [['clientes', 'Clientes']] : []), ['conta', 'Minha conta']];
  return head('Mais') + `<div class="card mais">${it.map(([k, l]) => `<a href="#${k}">${ic(k)}${l}</a>`).join('')}</div>`;
}

const VIEWS = { painel: vPainel, emalta: vEmAlta, lotes: vLotes, agenda: vAgenda, historico: vHistorico, modelos: vModelos, conexoes: vConexoes, clientes: vClientes, conta: vConta, mais: vMais };
let ultima;

function renderView() {
  const r = rota();
  $$('[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === r || (a.dataset.r === 'mais' && ['historico', 'modelos', 'conexoes', 'clientes', 'conta'].includes(r) && a.closest('#bnav'))));
  $('#view').innerHTML = `<div class="view" style="display:flex;flex-direction:column;gap:20px">${VIEWS[r]()}</div>`;
  if (r !== ultima) window.scrollTo(0, 0);
  if (r === 'emalta') {
    $('#tsort').value = S.ordem; $('#tsort').onchange = e => { S.ordem = e.target.value; carregarProdutos(); };
    $('#fbusca').onsubmit = e => { e.preventDefault(); S.q = $('#tq').value.trim(); carregarProdutos(); };
    if (!S.prod && ultima !== 'emalta') setTimeout(() => carregarProdutos(false));
  }
  if (r === 'modelos' && S.modelos) {
    const ex = S.lotes[0]?.itens[0] || { titulo: 'Produto de exemplo', preco: 89.9, precoAntigo: 159.9, img: '/demo/img/1.svg', link: 'https://s.shopee.com.br/exemplo', cupom: 'CUPOM10' };
    $$('[data-tpl]').forEach(t => t.oninput = () => { const k = t.dataset.tpl; S.modelos[k] = t.value; $('#mk-' + k).innerHTML = mockup(k, ex, t.value); clearTimeout(tplTimer); tplTimer = setTimeout(() => PUT('/api/modelos', { canal: k, texto: t.value }).catch(falha), 700); });
    $('#tplreset').onclick = async () => { await DEL('/api/modelos').catch(falha); S.modelos = { ...S.padrao }; renderView(); toast('Mensagens restauradas'); };
  }
  if (r === 'conexoes') {
    if (ultima !== 'conexoes') acompanharWA();
    if ($('#wa-on')) $('#wa-on').onclick = async () => { $('#wa-on').disabled = true; $('#wa-on').textContent = 'Gerando…'; try { S.wa = await POST('/api/conexoes/whatsapp'); renderView(); acompanharWA(); } catch (e) { falha(e); } };
    $('#ftg').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { await POST('/api/conexoes/telegram', { token: f.get('token'), chat: f.get('chat') }); S.conn = await GET('/api/conexoes'); renderView(); toast('Telegram conectado'); } catch (er) { falha(er); } };
    $('#fig').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); try { await POST('/api/conexoes/instagram', { igUserId: f.get('igUserId'), accessToken: f.get('accessToken') }); S.conn = await GET('/api/conexoes'); renderView(); toast('Instagram conectado'); } catch (er) { falha(er); } };
  }
  if (r === 'clientes' && $('#fcli')) $('#fcli').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); try { await POST('/api/clientes', f); S.eu = await GET('/api/eu'); renderView(); toast('Acesso criado para ' + f.nome); } catch (er) { const el = $('#cerr'); el.hidden = false; el.textContent = er.message; } };
  if (r === 'conta') {
    $('#fsenha').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); try { await POST('/api/senha', f); e.target.reset(); toast('Senha alterada'); } catch (er) { const el = $('#perr'); el.hidden = false; el.textContent = er.message; } };
    $('#sair').onclick = async () => { await POST('/api/logout').catch(() => {}); S.eu = null; telaLogin(); };
  }
  ultima = r;
  renderSelbar();
}

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-pick],[data-lnew],[data-led],[data-ldel],[data-ltog],[data-lrm],[data-lrun],[data-hc],[data-hs],[data-var],[data-shopee],[data-off],[data-usar],[data-cdel],#wprev,#wnext,#wtoday');
  if (!t) return;
  const d = t.dataset;
  try {
    if (d.pick) { const p = S.prod.itens.find(x => x.itemId === d.pick); S.sel.has(d.pick) ? S.sel.delete(d.pick) : S.sel.set(d.pick, p); const on = S.sel.has(d.pick); t.classList.toggle('on', on); t.setAttribute('aria-checked', on); t.querySelector('.ck').textContent = on ? '✓' : ''; return renderSelbar(); }
    if (d.lnew) return abrirLote(null, []);
    if (d.led) return abrirLote(+d.led);
    if (d.ltog) { const l = S.lotes.find(x => x.id === +d.ltog); await PUT(`/api/lotes/${l.id}`, { ...l, ativo: !l.ativo }); S.lotes = await GET('/api/lotes'); renderView(); return toast(l.ativo ? `Lote "${l.nome}" pausado` : `Lote "${l.nome}" ativado`); }
    if (d.lrm) { const [lid, pid] = d.lrm.split('|'); const l = S.lotes.find(x => x.id === +lid); await PUT(`/api/lotes/${lid}`, { ...l, itens: l.itens.filter(i => i.itemId !== pid) }); S.lotes = await GET('/api/lotes'); renderView(); return toast('Produto retirado do lote'); }
    if (d.ldel) { if (!d.c) { d.c = 1; t.textContent = 'Confirmar?'; return; } await DEL(`/api/lotes/${d.ldel}`); S.lotes = await GET('/api/lotes'); renderView(); return toast('Lote excluído'); }
    if (d.lrun) { if (!d.c) { d.c = 1; t.textContent = 'Confirmar envio?'; return; } await POST(`/api/lotes/${d.lrun}/disparar`); toast('Disparo iniciado. Acompanhe no Histórico.'); t.textContent = 'Enviando…'; t.disabled = true; setTimeout(async () => { S.envios = await GET('/api/envios'); if (['historico', 'painel', 'agenda'].includes(rota())) renderView(); }, 4000); return; }
    if (d.hc) { S.hCh = d.hc; return renderView(); }
    if (d.hs) { S.hSt = d.hs; return renderView(); }
    if (d.var) { const k = t.parentElement.dataset.for; const ta = $('#tpl-' + k); const s = ta.selectionStart ?? ta.value.length; ta.value = ta.value.slice(0, s) + d.var + ta.value.slice(ta.selectionEnd ?? s); ta.dispatchEvent(new Event('input')); ta.focus(); return; }
    if (d.shopee) return abrirShopee();
    if (d.off) { if (!d.c) { d.c = 1; t.textContent = 'Confirmar?'; return; } await DEL(`/api/conexoes/${d.off}`); S.conn = await GET('/api/conexoes'); S.wa = null; renderView(); return toast('Desconectado'); }
    if (d.usar) { await POST('/api/conta', { id: +d.usar }); await iniciar(); return toast('Agora você está na conta ' + S.eu.conta.nome); }
    if (d.cdel) { if (!d.c) { d.c = 1; t.textContent = 'Confirmar exclusão?'; return; } await DEL(`/api/clientes/${d.cdel}`); S.eu = await GET('/api/eu'); renderView(); return toast('Cliente excluído'); }
    if (t.id === 'wprev') { S.wk--; return renderView(); }
    if (t.id === 'wnext') { S.wk++; return renderView(); }
    if (t.id === 'wtoday') { S.wk = 0; return renderView(); }
  } catch (er) { falha(er); }
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-pick]')) { e.preventDefault(); e.target.click(); } if (e.key === 'Escape' && $('#ov')) $('#layer').innerHTML = ''; });
document.addEventListener('change', async e => { if (e.target.id === 'contasel') { try { await POST('/api/conta', { id: +e.target.value }); await iniciar(); } catch (er) { falha(er); } } });
window.addEventListener('hashchange', () => S.eu && renderView());

async function iniciar() {
  try { S.eu = await GET('/api/eu'); } catch { return telaLogin(); }
  S.prod = null; S.modelos = null; S.wa = null; S.sel.clear();
  await carregar();
  $('#root').innerHTML = shell();
  ultima = null;
  renderView();
}
setInterval(async () => { if (!S.eu || document.hidden) return; try { S.envios = await GET('/api/envios'); if (['painel', 'historico'].includes(rota()) && !$('#ov')) renderView(); } catch { /* ignora */ } }, 60000);
iniciar();

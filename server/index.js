import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { config, shopeeConfigured } from './config.js';
import { db, J, agora } from './db.js';
import { hashSenha, conferirSenha, gerarToken } from './seguranca.js';
import { buscarProdutos, extrairAfiliado, imagemDemo, linkAfiliado, produtosDemo } from './shopee.js';
import { conexoesPublicas, lerConexao, salvarConexao, removerConexao } from './conexoes.js';
import { MODELOS_PADRAO, modelosDe } from './modelos.js';
import { executarLote, iniciarAgenda, loteParaJson } from './disparos.js';
import { testarBot, infoChat } from './canais/telegram.js';
import { testarInstagram } from './canais/instagram.js';
import { conectarWhatsApp, desconectarWhatsApp, gruposWhatsApp, statusWhatsApp, reabrirSessoes } from './canais/whatsapp.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

/* ---------- Primeiro acesso ---------- */
function primeiroAcesso() {
  const total = db.prepare('SELECT COUNT(*) n FROM usuarios').get().n;
  if (total) return;
  if (config.adminEmail && config.adminPassword) {
    db.prepare("INSERT INTO usuarios (nome, email, senha, papel, criado) VALUES (?, ?, ?, 'admin', ?)")
      .run('Administradora', config.adminEmail, hashSenha(config.adminPassword), agora());
    console.log('Conta de administradora criada para', config.adminEmail);
  } else if (config.demo) {
    const id = db.prepare("INSERT INTO usuarios (nome, email, senha, papel, criado) VALUES (?, ?, ?, 'admin', ?)")
      .run('Fabi Brasil', 'demo@afilia.mais', hashSenha('demo1234'), agora()).lastInsertRowid;
    semearDemo(Number(id));
    console.log('Modo demonstração: entre com demo@afilia.mais / demo1234');
  } else {
    console.warn('[aviso] Nenhuma conta criada. Defina ADMIN_EMAIL e ADMIN_PASSWORD e reinicie.');
  }
}

function semearDemo(uid) {
  const P = i => { const p = produtosDemo[i]; return { itemId: p.itemId, titulo: p.titulo, preco: p.preco, precoAntigo: p.precoAntigo, img: p.img, comissao: p.comissao, productLink: p.productLink, cupom: '' }; };
  const ins = db.prepare('INSERT INTO lotes (usuario_id, nome, dias, hora, intervalo, destinos, itens, ativo, criado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const g1 = { id: 'demo-g1@g.us', nome: 'Achadinhos da Fabi #1' }, g2 = { id: 'demo-g2@g.us', nome: 'Achadinhos da Fabi #2' };
  ins.run(uid, 'Manhã · Casa e cozinha', '[1,2,3,4,5]', '09:00', 3, JSON.stringify({ grupos: [g1], telegram: true, igStory: true }), JSON.stringify([1, 2, 4, 11].map(P)), 1, agora());
  ins.run(uid, 'Almoço · Eletrônicos', '[1,2,3,4,5,6]', '12:30', 5, JSON.stringify({ grupos: [g1, g2], telegram: true }), JSON.stringify([0, 5, 10, 14].map(P)), 1, agora());
  ins.run(uid, 'Noite · Beleza e moda', '[0,1,2,3,4,5,6]', '20:00', 4, JSON.stringify({ grupos: [g2], igFeed: true, igStory: true }), JSON.stringify([6, 9, 12, 13].map(P)), 1, agora());
  const env = db.prepare("INSERT INTO envios (usuario_id, disparo, lote_id, lote_nome, canal, destino, produto, status, erro, simulado, quando) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)");
  for (let d = 1; d <= 6; d++) {
    const t = new Date(); t.setDate(t.getDate() - d); t.setHours(9, 0, 0, 0);
    [1, 2, 4].forEach((pi, k) => {
      const p = { ...P(pi), link: linkAfiliado(P(pi).productLink, '') };
      env.run(uid, 'demo' + d, 1, 'Manhã · Casa e cozinha', 'whatsapp', g1.nome, JSON.stringify(p), 'enviado', null, t.getTime() + k * 180000);
      env.run(uid, 'demo' + d, 1, 'Manhã · Casa e cozinha', 'telegram', 'Fabi Brasil Ofertas', JSON.stringify(p), d === 2 && k === 1 ? 'falhou' : 'enviado', d === 2 && k === 1 ? 'Telegram: bot sem permissão de administrador no canal' : null, t.getTime() + k * 180000);
    });
  }
  salvarConexao(uid, 'shopee', { afiliadoId: '18000000000', desde: agora() });
}

/* ---------- Sessão ---------- */
const COOKIE = 'afilia_sess';
const lerCookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

function auth(req, res, next) {
  const t = lerCookie(req)[COOKIE];
  const s = t && db.prepare('SELECT * FROM sessoes WHERE token = ? AND expira > ?').get(t, agora());
  if (!s) return res.status(401).json({ erro: 'Faça login para continuar.' });
  const u = db.prepare('SELECT id, nome, email, papel FROM usuarios WHERE id = ?').get(s.usuario_id);
  if (!u) return res.status(401).json({ erro: 'Conta não encontrada.' });
  req.usuario = u;
  req.token = t;
  req.uid = u.papel === 'admin' ? s.conta_id : u.id; // a administradora pode trabalhar na conta de um cliente
  next();
}
const soAdmin = (req, res, next) => (req.usuario.papel === 'admin' ? next() : res.status(403).json({ erro: 'Só a administradora pode fazer isso.' }));
const rota = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => res.status(400).json({ erro: e.message || 'Erro inesperado' }));

const tentativas = new Map();
app.post('/api/login', rota((req, res) => {
  const ip = req.ip;
  const t = tentativas.get(ip) || { n: 0, ate: 0 };
  if (t.ate > agora()) return res.status(429).json({ erro: 'Muitas tentativas. Espere alguns minutos.' });
  const email = String(req.body.email || '').trim().toLowerCase();
  const u = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!u || !conferirSenha(req.body.senha || '', u.senha)) {
    t.n++; if (t.n >= 8) { t.ate = agora() + 10 * 60000; t.n = 0; }
    tentativas.set(ip, t);
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }
  tentativas.delete(ip);
  const token = gerarToken();
  const dias = 30;
  db.prepare('INSERT INTO sessoes (token, usuario_id, conta_id, expira) VALUES (?, ?, ?, ?)').run(token, u.id, u.id, agora() + dias * 864e5);
  const seguro = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${dias * 86400}${seguro}`);
  res.json({ ok: true });
}));

app.post('/api/logout', auth, (req, res) => {
  db.prepare('DELETE FROM sessoes WHERE token = ?').run(req.token);
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.get('/api/eu', auth, (req, res) => {
  const conta = db.prepare('SELECT id, nome, email FROM usuarios WHERE id = ?').get(req.uid);
  const contas = req.usuario.papel === 'admin' ? db.prepare('SELECT id, nome, email, papel FROM usuarios ORDER BY papel, nome').all() : [];
  res.json({ usuario: req.usuario, conta, contas, demo: config.demo, shopeeApi: shopeeConfigured() });
});

app.post('/api/senha', auth, rota((req, res) => {
  const u = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!conferirSenha(req.body.atual || '', u.senha)) throw new Error('A senha atual não confere.');
  if (String(req.body.nova || '').length < 8) throw new Error('A nova senha precisa de pelo menos 8 caracteres.');
  db.prepare('UPDATE usuarios SET senha = ? WHERE id = ?').run(hashSenha(req.body.nova), u.id);
  res.json({ ok: true });
}));

/* ---------- Clientes (administradora) ---------- */
app.post('/api/conta', auth, soAdmin, rota((req, res) => {
  const c = db.prepare('SELECT id FROM usuarios WHERE id = ?').get(Number(req.body.id));
  if (!c) throw new Error('Cliente não encontrado');
  db.prepare('UPDATE sessoes SET conta_id = ? WHERE token = ?').run(c.id, req.token);
  res.json({ ok: true });
}));
app.post('/api/clientes', auth, soAdmin, rota((req, res) => {
  const nome = String(req.body.nome || '').trim(), email = String(req.body.email || '').trim().toLowerCase(), senha = String(req.body.senha || '');
  if (!nome || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Preencha nome e um e-mail válido.');
  if (senha.length < 8) throw new Error('A senha inicial precisa de pelo menos 8 caracteres.');
  if (db.prepare('SELECT 1 FROM usuarios WHERE email = ?').get(email)) throw new Error('Já existe uma conta com esse e-mail.');
  const id = db.prepare("INSERT INTO usuarios (nome, email, senha, papel, criado) VALUES (?, ?, ?, 'cliente', ?)").run(nome, email, hashSenha(senha), agora()).lastInsertRowid;
  res.json({ ok: true, id: Number(id) });
}));
app.delete('/api/clientes/:id', auth, soAdmin, rota(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.usuario.id) throw new Error('Você não pode excluir a própria conta.');
  await desconectarWhatsApp(id).catch(() => {});
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  db.prepare('UPDATE sessoes SET conta_id = usuario_id WHERE conta_id = ?').run(id);
  res.json({ ok: true });
}));

/* ---------- Produtos ---------- */
app.get('/api/produtos', auth, rota(async (req, res) => {
  const r = await buscarProdutos({ q: req.query.q, ordem: req.query.ordem, pagina: req.query.pagina });
  const af = lerConexao(req.uid, 'shopee').dados.afiliadoId;
  r.itens = r.itens.map(p => ({ ...p, link: linkAfiliado(p.productLink, af) }));
  res.json(r);
}));

/* ---------- Lotes ---------- */
const afDe = uid => lerConexao(uid, 'shopee').dados.afiliadoId;
const limparItem = p => ({
  itemId: String(p.itemId || ''), titulo: String(p.titulo || '').slice(0, 300), preco: Number(p.preco) || 0, precoAntigo: Number(p.precoAntigo) || Number(p.preco) || 0,
  img: String(p.img || ''), comissao: Number(p.comissao) || 0, productLink: String(p.productLink || ''), cupom: String(p.cupom || '').slice(0, 40),
});
function validarLote(b) {
  const nome = String(b.nome || '').trim();
  if (!nome) throw new Error('Dê um nome ao lote.');
  if (!/^\d{2}:\d{2}$/.test(b.hora || '')) throw new Error('Horário inválido.');
  const dias = (b.dias || []).map(Number).filter(d => d >= 0 && d <= 6);
  const dest = b.destinos || {};
  return {
    nome, hora: b.hora, dias: JSON.stringify([...new Set(dias)].sort()), intervalo: Math.max(0, Math.min(120, Number(b.intervalo) || 0)),
    destinos: JSON.stringify({ grupos: (dest.grupos || []).map(g => ({ id: String(g.id), nome: String(g.nome || g.id) })), telegram: !!dest.telegram, igFeed: !!dest.igFeed, igStory: !!dest.igStory }),
    itens: JSON.stringify((b.itens || []).map(limparItem).filter(p => p.itemId && p.productLink)),
    ativo: b.ativo === false ? 0 : 1,
  };
}
app.get('/api/lotes', auth, (req, res) => {
  const af = afDe(req.uid);
  res.json(db.prepare('SELECT * FROM lotes WHERE usuario_id = ? ORDER BY hora').all(req.uid).map(r => loteParaJson(r, af)));
});
app.post('/api/lotes', auth, rota((req, res) => {
  const v = validarLote(req.body);
  const id = db.prepare('INSERT INTO lotes (usuario_id, nome, dias, hora, intervalo, destinos, itens, ativo, criado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(req.uid, v.nome, v.dias, v.hora, v.intervalo, v.destinos, v.itens, v.ativo, agora()).lastInsertRowid;
  res.json({ ok: true, id: Number(id) });
}));
app.put('/api/lotes/:id', auth, rota((req, res) => {
  const v = validarLote(req.body);
  const r = db.prepare('UPDATE lotes SET nome = ?, dias = ?, hora = ?, intervalo = ?, destinos = ?, itens = ?, ativo = ? WHERE id = ? AND usuario_id = ?')
    .run(v.nome, v.dias, v.hora, v.intervalo, v.destinos, v.itens, v.ativo, Number(req.params.id), req.uid);
  if (!r.changes) throw new Error('Lote não encontrado');
  res.json({ ok: true });
}));
app.post('/api/lotes/:id/itens', auth, rota((req, res) => {
  const r = db.prepare('SELECT itens FROM lotes WHERE id = ? AND usuario_id = ?').get(Number(req.params.id), req.uid);
  if (!r) throw new Error('Lote não encontrado');
  const itens = J(r.itens, []);
  let novos = 0;
  for (const p of (req.body.itens || []).map(limparItem)) if (p.itemId && !itens.some(i => i.itemId === p.itemId)) { itens.push(p); novos++; }
  db.prepare('UPDATE lotes SET itens = ? WHERE id = ?').run(JSON.stringify(itens), Number(req.params.id));
  res.json({ ok: true, novos });
}));
app.delete('/api/lotes/:id', auth, (req, res) => {
  db.prepare('DELETE FROM lotes WHERE id = ? AND usuario_id = ?').run(Number(req.params.id), req.uid);
  res.json({ ok: true });
});
app.post('/api/lotes/:id/disparar', auth, rota((req, res) => {
  const id = Number(req.params.id);
  const l = db.prepare('SELECT itens FROM lotes WHERE id = ? AND usuario_id = ?').get(id, req.uid);
  if (!l) throw new Error('Lote não encontrado');
  if (!J(l.itens, []).length) throw new Error('O lote está sem produtos.');
  const chave = `manual:${id}:${agora()}`;
  executarLote(req.uid, id, chave, 'manual').catch(e => console.error('Disparo manual', e.message));
  res.json({ ok: true, chave });
}));

/* ---------- Histórico e resumo ---------- */
app.get('/api/envios', auth, (req, res) => {
  const lim = Math.min(1000, Number(req.query.limite) || 300);
  res.json(db.prepare('SELECT * FROM envios WHERE usuario_id = ? ORDER BY quando DESC LIMIT ?').all(req.uid, lim)
    .map(e => ({ ...e, produto: J(e.produto, {}), simulado: !!e.simulado })));
});
app.get('/api/disparos/ativos', auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM disparos WHERE usuario_id = ? AND status = 'enviando'").all(req.uid));
});

/* ---------- Modelos de mensagem ---------- */
app.get('/api/modelos', auth, (req, res) => res.json({ modelos: modelosDe(req.uid), padrao: MODELOS_PADRAO }));
app.put('/api/modelos', auth, rota((req, res) => {
  const canal = String(req.body.canal || '');
  if (!MODELOS_PADRAO[canal]) throw new Error('Canal inválido');
  db.prepare('INSERT INTO modelos (usuario_id, canal, texto) VALUES (?, ?, ?) ON CONFLICT(usuario_id, canal) DO UPDATE SET texto = excluded.texto')
    .run(req.uid, canal, String(req.body.texto || '').slice(0, 2000));
  res.json({ ok: true });
}));
app.delete('/api/modelos', auth, (req, res) => { db.prepare('DELETE FROM modelos WHERE usuario_id = ?').run(req.uid); res.json({ ok: true }); });

/* ---------- Conexões ---------- */
app.get('/api/conexoes', auth, (req, res) => res.json(conexoesPublicas(req.uid)));

app.post('/api/conexoes/shopee', auth, rota(async (req, res) => {
  const afiliadoId = await extrairAfiliado(req.body.link);
  salvarConexao(req.uid, 'shopee', { afiliadoId, desde: agora() });
  res.json({ ok: true, afiliadoId });
}));

app.post('/api/conexoes/telegram', auth, rota(async (req, res) => {
  const atual = lerConexao(req.uid, 'telegram');
  const token = String(req.body.token || '').trim() || atual.segredo.token;
  let chat = String(req.body.chat || '').trim();
  if (!token) throw new Error('Cole o token do bot.');
  if (!chat) throw new Error('Informe o @ do canal ou o ID do grupo.');
  if (/^[A-Za-z]\w{3,}$/.test(chat)) chat = '@' + chat;
  const bot = await testarBot(token);
  const info = await infoChat(token, chat);
  salvarConexao(req.uid, 'telegram', { bot: '@' + bot.username, chat: String(info.id), chatNome: info.title || chat }, { token });
  res.json({ ok: true });
}));

app.post('/api/conexoes/instagram', auth, rota(async (req, res) => {
  const atual = lerConexao(req.uid, 'instagram');
  const igUserId = String(req.body.igUserId || '').trim();
  const accessToken = String(req.body.accessToken || '').trim() || atual.segredo.accessToken;
  if (!igUserId || !accessToken) throw new Error('Informe o ID da conta e o token de acesso.');
  const info = await testarInstagram({ igUserId, accessToken });
  salvarConexao(req.uid, 'instagram', { igUserId, usuario: '@' + info.username, tipo: info.account_type }, { accessToken });
  res.json({ ok: true });
}));

app.post('/api/conexoes/whatsapp', auth, rota(async (req, res) => {
  const uid = req.uid;
  res.json(await conectarWhatsApp(uid, { aoConectar: numero => salvarConexao(uid, 'whatsapp', { numero }) }));
}));
app.get('/api/conexoes/whatsapp', auth, rota(async (req, res) => {
  const st = statusWhatsApp(req.uid);
  if (st.status === 'conectado') st.grupos = await gruposWhatsApp(req.uid).catch(() => []);
  else if (config.demo) st.grupos = [{ id: 'demo-g1@g.us', nome: 'Achadinhos da Fabi #1', membros: 1024 }, { id: 'demo-g2@g.us', nome: 'Achadinhos da Fabi #2', membros: 876 }, { id: 'demo-g3@g.us', nome: 'Ofertas Casa e Cozinha', membros: 512 }];
  res.json(st);
}));

app.delete('/api/conexoes/:tipo', auth, rota(async (req, res) => {
  const tipo = req.params.tipo;
  if (!['shopee', 'telegram', 'instagram', 'whatsapp'].includes(tipo)) throw new Error('Conexão inválida');
  if (tipo === 'whatsapp') await desconectarWhatsApp(req.uid);
  removerConexao(req.uid, tipo);
  res.json({ ok: true });
}));

/* ---------- Arquivos ---------- */
app.get('/demo/img/:n.svg', (req, res) => {
  const svg = imagemDemo(Number(req.params.n));
  if (!svg) return res.status(404).end();
  res.type('image/svg+xml').setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});
app.get('/saude', (req, res) => res.json({ ok: true }));
app.use(express.static(path.join(raiz, 'public'), { extensions: ['html'] }));
app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
app.use((req, res) => res.sendFile(path.join(raiz, 'public', 'index.html')));

primeiroAcesso();
iniciarAgenda();
reabrirSessoes();
app.listen(config.port, () => console.log(`Afilia+ rodando na porta ${config.port}${config.demo ? ' (modo demonstração)' : ''}`));

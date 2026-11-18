// Shopee: busca de produtos em alta (Open API de afiliados, chave da agência)
// e montagem do link de afiliado de cada cliente a partir do ID de afiliado dele.
import crypto from 'node:crypto';
import { config, shopeeConfigured } from './config.js';

const REDIR = process.env.SHOPEE_REDIR || 'https://s.shopee.com.br/an_redir';

async function graphql(query, variables = {}) {
  const { appId, secret, endpoint } = config.shopee;
  const payload = JSON.stringify({ query, variables });
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHash('sha256').update(`${appId}${ts}${payload}${secret}`).digest('hex');
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${sig}`,
    },
    body: payload,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors?.length) {
    const msg = j.errors?.[0]?.message || `HTTP ${r.status}`;
    throw new Error('Shopee: ' + msg);
  }
  return j.data;
}

const Q_PRODUTOS = `query($keyword:String,$sortType:Int,$page:Int,$limit:Int){
  productOfferV2(keyword:$keyword,sortType:$sortType,page:$page,limit:$limit){
    nodes{ itemId productName priceMin priceMax priceDiscountRate commissionRate imageUrl productLink offerLink sales ratingStar shopName }
    pageInfo{ page limit hasNextPage }
  }
}`;

// sortType da Open API: 1 relevância, 2 mais vendidos, 3 preço maior, 4 preço menor, 5 maior comissão
const ORDENS = { vendas: 2, comissao: 5, relevancia: 1, menor: 4 };

function normalizar(n) {
  const preco = Number(n.priceMin || 0);
  const desc = Number(n.priceDiscountRate || 0);
  const precoAntigo = desc > 0 && desc < 100 ? Math.round((preco / (1 - desc / 100)) * 100) / 100 : preco;
  return {
    itemId: String(n.itemId),
    titulo: n.productName,
    preco,
    precoAntigo,
    desconto: desc,
    comissao: Math.round(Number(n.commissionRate || 0) * 1000) / 10,
    img: n.imageUrl,
    vendas: Number(n.sales || 0),
    nota: Number(n.ratingStar || 0),
    loja: n.shopName || '',
    productLink: n.productLink,
    categoria: '',
  };
}

export async function buscarProdutos({ q = '', ordem = 'vendas', pagina = 1 } = {}) {
  if (!shopeeConfigured()) return { demo: true, ...buscarDemo({ q, ordem }) };
  const d = await graphql(Q_PRODUTOS, { keyword: q || undefined, sortType: ORDENS[ordem] || 2, page: Number(pagina) || 1, limit: 24 });
  const res = d.productOfferV2;
  return { demo: false, itens: res.nodes.map(normalizar), temMais: res.pageInfo.hasNextPage };
}

/* ---------- ID de afiliado do cliente ---------- */

function idDoTexto(s) {
  s = decodeURIComponent(String(s || ''));
  const m = s.match(/affiliate_id=(\d{5,})/) || s.match(/utm_source=an_(\d{5,})/) || s.match(/mmp_pid=an_(\d{5,})/) || s.match(/\ban_(\d{8,})/);
  return m ? m[1] : null;
}

// O cliente cola um link de afiliado dele (curto ou longo). Seguimos os redirecionamentos
// até achar o ID de afiliado. Não pedimos senha, App ID nem chave.
export async function extrairAfiliado(link) {
  link = String(link || '').trim();
  if (!/^https?:\/\//i.test(link)) throw new Error('Cole o link completo, começando com https://');
  if (!/shopee|shope\.ee/i.test(link)) throw new Error('Esse link não é da Shopee.');
  let id = idDoTexto(link);
  let atual = link;
  for (let i = 0; !id && i < 6; i++) {
    let r;
    try {
      r = await fetch(atual, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FabiOfertas/1.0)' } });
    } catch { break; }
    const loc = r.headers.get('location');
    if (!loc) {
      const html = await r.text().catch(() => '');
      id = idDoTexto(html);
      break;
    }
    atual = new URL(loc, atual).toString();
    id = idDoTexto(atual);
  }
  if (!id) throw new Error('Não achei o ID de afiliado nesse link. Gere um link novo no painel de afiliados da Shopee e cole aqui.');
  return id;
}

export function linkAfiliado(productLink, afiliadoId, subId = 'fabiapp') {
  if (!afiliadoId) return productLink;
  const u = new URL(REDIR);
  u.searchParams.set('origin_link', productLink);
  u.searchParams.set('affiliate_id', afiliadoId);
  u.searchParams.set('sub_id', subId);
  return u.toString();
}

/* ---------- Modo demonstração (sem chave da Shopee) ---------- */

const DEMO = [
  ['Fone de Ouvido Bluetooth TWS com Cancelamento de Ruído', 89.9, 159.9, 'Eletrônicos', 12400, 8, 4.8],
  ['Air Fryer 4L Antiaderente Digital 1500W', 239.9, 389, 'Casa', 8900, 6, 4.9],
  ['Kit 10 Organizadores de Gaveta Modulares', 34.9, 59.9, 'Casa', 21300, 10, 4.7],
  ['Tênis Casual Feminino Plataforma Branco', 119.9, 199.9, 'Moda', 5600, 12, 4.6],
  ['Garrafa Térmica Inox 1L Mantém 12h', 49.9, 79.9, 'Casa', 15800, 9, 4.8],
  ['Smartwatch Tela AMOLED com Monitor Cardíaco', 179, 299, 'Eletrônicos', 7200, 7, 4.5],
  ['Sérum Facial Vitamina C 30ml', 29.9, 54.9, 'Beleza', 31000, 14, 4.8],
  ['Luminária LED de Mesa Recarregável Touch', 59.9, 99.9, 'Casa', 6400, 10, 4.7],
  ['Mochila Notebook 15,6" Impermeável com USB', 89, 149.9, 'Acessórios', 4300, 9, 4.7],
  ['Escova Secadora Rotativa 3 em 1', 129.9, 229.9, 'Beleza', 9800, 11, 4.6],
  ["Caixa de Som Bluetooth à Prova d'Água 20W", 99.9, 179.9, 'Eletrônicos', 6900, 8, 4.7],
  ['Jogo de Potes Herméticos de Vidro 10 Peças', 79.9, 139.9, 'Casa', 11200, 9, 4.8],
  ['Conjunto Legging e Top Fitness', 69.9, 119.9, 'Moda', 13600, 13, 4.5],
  ['Hidratante Corporal Ureia 10% 400ml', 24.9, 39.9, 'Beleza', 18700, 12, 4.9],
  ['Suporte de Celular Articulado para Mesa', 19.9, 39.9, 'Acessórios', 26500, 10, 4.6],
  ['Mop Giratório com Balde Inox', 89.9, 159.9, 'Casa', 7700, 8, 4.7],
].map((r, i) => ({
  itemId: 'demo' + (i + 1),
  titulo: r[0], preco: r[1], precoAntigo: r[2], desconto: Math.round((1 - r[1] / r[2]) * 100),
  categoria: r[3], vendas: r[4], comissao: r[5], nota: r[6], loja: 'Loja exemplo',
  img: `/demo/img/${i + 1}.svg`,
  productLink: `https://shopee.com.br/produto-exemplo-i.0.${1000 + i}`,
}));
export const produtosDemo = DEMO;

function buscarDemo({ q, ordem }) {
  const t = String(q || '').toLowerCase();
  let itens = DEMO.filter(p => !t || p.titulo.toLowerCase().includes(t) || p.categoria.toLowerCase().includes(t));
  itens = [...itens].sort((a, b) => ordem === 'comissao' ? b.comissao - a.comissao : ordem === 'menor' ? a.preco - b.preco : b.vendas - a.vendas);
  return { itens, temMais: false };
}

const HUES = [28, 0, 20, 330, 190, 262, 38, 48, 200, 300, 180, 140, 350, 60, 230, 170];
export function imagemDemo(n) {
  const p = DEMO[n - 1];
  if (!p) return null;
  const h = HUES[(n - 1) % HUES.length];
  const palavra = p.categoria.toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},75%,58%)"/><stop offset="1" stop-color="hsl(${(h + 30) % 360},70%,40%)"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><circle cx="240" cy="60" r="90" fill="#fff" opacity=".1"/><rect x="90" y="80" width="120" height="120" rx="24" fill="#fff" opacity=".95"/><rect x="112" y="102" width="76" height="16" rx="8" fill="hsl(${h},60%,50%)"/><text x="150" y="250" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#fff" letter-spacing="2">${palavra}</text></svg>`;
}

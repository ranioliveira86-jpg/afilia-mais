// Instagram pela API oficial de publicação (Graph API) em conta profissional.
// Feed: um carrossel por lote (até 10 produtos). Stories: um por produto.
// A imagem precisa estar em URL pública (as fotos da Shopee já estão).
import { config } from '../config.js';

async function g(metodo, caminho, params) {
  const url = new URL(`${config.instagram.graph}/${caminho}`);
  const opts = { method: metodo };
  if (metodo === 'GET') for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  else { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(params); }
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Instagram: ' + (j.error?.message || `HTTP ${r.status}`));
  return j;
}

export async function testarInstagram({ igUserId, accessToken }) {
  const j = await g('GET', igUserId, { fields: 'username,account_type', access_token: accessToken });
  return j;
}

async function aguardarPronto(id, accessToken) {
  for (let i = 0; i < 20; i++) {
    const j = await g('GET', id, { fields: 'status_code', access_token: accessToken });
    if (j.status_code === 'FINISHED' || !j.status_code) return;
    if (j.status_code === 'ERROR') throw new Error('Instagram recusou a imagem.');
    await new Promise(r => setTimeout(r, 3000));
  }
}

async function publicar(igUserId, accessToken, creationId) {
  await aguardarPronto(creationId, accessToken);
  const j = await g('POST', `${igUserId}/media_publish`, { creation_id: creationId, access_token: accessToken });
  return j.id;
}

export async function postarStory({ igUserId, accessToken }, produto) {
  const c = await g('POST', `${igUserId}/media`, { media_type: 'STORIES', image_url: produto.img, access_token: accessToken });
  return publicar(igUserId, accessToken, c.id);
}

export async function postarFeed({ igUserId, accessToken }, produtos, legenda) {
  const lista = produtos.filter(p => /^https?:\/\//.test(p.img)).slice(0, 10);
  if (!lista.length) throw new Error('Nenhuma imagem pública para o carrossel.');
  if (lista.length === 1) {
    const c = await g('POST', `${igUserId}/media`, { image_url: lista[0].img, caption: legenda, access_token: accessToken });
    return publicar(igUserId, accessToken, c.id);
  }
  const filhos = [];
  for (const p of lista) {
    const c = await g('POST', `${igUserId}/media`, { image_url: p.img, is_carousel_item: true, access_token: accessToken });
    filhos.push(c.id);
  }
  const car = await g('POST', `${igUserId}/media`, { media_type: 'CAROUSEL', children: filhos.join(','), caption: legenda, access_token: accessToken });
  return publicar(igUserId, accessToken, car.id);
}

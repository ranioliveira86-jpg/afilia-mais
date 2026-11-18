// Configuração lida das variáveis de ambiente. Nenhuma chave fica no código.
import path from 'node:path';

if (!process.env.TZ) process.env.TZ = 'America/Sao_Paulo';

const env = process.env;
export const config = {
  port: Number(env.PORT || 3000),
  dataDir: path.resolve(env.DATA_DIR || './data'),
  appSecret: env.APP_SECRET || '',
  publicUrl: (env.PUBLIC_URL || '').replace(/\/$/, ''),
  demo: env.DEMO === '1',
  adminEmail: (env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPassword: env.ADMIN_PASSWORD || '',
  shopee: {
    appId: env.SHOPEE_APP_ID || '',
    secret: env.SHOPEE_SECRET || '',
    endpoint: env.SHOPEE_ENDPOINT || 'https://open-api.affiliate.shopee.com.br/graphql',
  },
  instagram: {
    graph: env.IG_GRAPH_URL || 'https://graph.facebook.com/v21.0',
  },
};
export const shopeeConfigured = () => Boolean(config.shopee.appId && config.shopee.secret);

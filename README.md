# Afilia+

Site e app web para agendar e disparar ofertas de afiliado da Shopee em grupos de WhatsApp, canais do Telegram e Instagram (feed e stories). Cada cliente da agência tem o próprio login, a própria conta de afiliado e os próprios canais.

## O que já funciona (versão 0.1)

- Login com senha (guardada cifrada) e conta de administradora que cria os acessos dos clientes e entra na conta de qualquer um.
- **Em alta**: produtos mais vendidos da Shopee pela Open API de afiliados (com a chave da agência). Busca e ordenação por vendas, comissão ou preço.
- **Lotes**: produtos marcados viram um lote com dias, horário, intervalo entre produtos, cupom opcional e destinos.
- **Agenda**: a cada 20 segundos o servidor confere os lotes e dispara no horário (até 15 minutos de tolerância se o servidor reiniciar). Também dá para disparar na hora.
- **Conexões por cliente**
  - Shopee: o cliente cola um link de afiliado dele e o sistema lê o ID de afiliado. Sem senha, sem App ID.
  - WhatsApp: QR code na tela, lista os grupos do número e envia foto com legenda.
  - Telegram: bot do próprio cliente (token do @BotFather) enviando foto, texto e botão "Comprar na Shopee".
  - Instagram: API oficial da Meta. Feed como carrossel com os produtos do lote e um story por produto.
- **Mensagens**: modelo de texto por canal com variáveis e prévia.
- **Histórico**: cada envio com status e o motivo das falhas.
- Funciona no computador e no celular (pode ser instalado na tela inicial).

## Ainda a validar ou fazer

- **Link de afiliado do cliente**: hoje o link é montado no formato `an_redir` com o ID de afiliado do cliente. Precisa de um teste real (uma compra pelo link) para confirmar que a comissão cai na conta do cliente. Se não cair, a alternativa é cada cliente gerar os links pela própria chave.
- **Instagram**: precisa de um app na Meta com permissão de publicação aprovada. Por enquanto o ID da conta e o token são colados na tela; o botão "Entrar com Facebook" vem depois.
- **WhatsApp**: usa WhatsApp Web (não oficial). Use chip dedicado e ritmo de envio humano.
- Painel de ganhos (comissões e pedidos) e ofertas avulsas ficaram para a próxima etapa.

## Rodar no computador

Precisa do Node.js 22.5 ou mais novo.

```bash
npm install
npm run dev          # modo demonstração em http://localhost:3000
```

No modo demonstração entre com `demo@afilia.mais` e a senha `demo1234`. Os envios são simulados.

Para usar de verdade, copie `.env.example` para `.env`, preencha e rode `npm start` (com as variáveis carregadas, por exemplo `node --env-file=.env --disable-warning=ExperimentalWarning server/index.js`).

## Variáveis de ambiente

| Variável | Para que serve |
| --- | --- |
| `APP_SECRET` | Chave que cifra os tokens dos clientes. Gere uma vez e não troque. |
| `ADMIN_EMAIL` e `ADMIN_PASSWORD` | Cria a conta da administradora no primeiro acesso. Troque a senha depois em Minha conta. |
| `SHOPEE_APP_ID` e `SHOPEE_SECRET` | Chave da Open API de afiliados da agência, só para buscar produtos. |
| `DATA_DIR` | Pasta do banco e das sessões do WhatsApp. Precisa ser um disco que não se apaga. |
| `TZ` | Fuso dos horários. Padrão `America/Sao_Paulo`. |
| `DEMO` | `1` liga o modo demonstração. |

Essas chaves são cadastradas só no painel da hospedagem. Ninguém precisa mandar por chat.

## Hospedagem recomendada

O sistema precisa ficar ligado o tempo todo (agenda e WhatsApp) e de um disco que guarde os dados. Por isso não serve hospedagem de site comum nem planos gratuitos que "dormem".

**Opção 1, mais simples: Railway** (plano Hobby, cerca de US$ 5 por mês)
1. Suba esta pasta para um repositório no GitHub.
2. No Railway, crie um projeto a partir do repositório. O arquivo `railway.json` já diz para usar o `Dockerfile`, checar a saúde em `/saude` e reiniciar sozinho se cair.
3. Adicione um Volume montado em `/data` (o banco e as sessões do WhatsApp ficam ali). Mantenha uma réplica só.
4. Em Variables, cadastre `APP_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SHOPEE_APP_ID`, `SHOPEE_SECRET`.
5. Gere o domínio (ou ligue um seu, como `app.afiliamais.com.br`).

**Opção 2, mais barata com volume: VPS** (Hostinger KVM 1 ou similar, cerca de R$ 30 a R$ 40 por mês). Instale Docker, rode `docker build -t afilia . && docker run -d --restart always -p 80:3000 -v afilia-dados:/data --env-file .env afilia` e coloque um proxy com HTTPS (Caddy ou Nginx).

## Estrutura

```
server/
  index.js        rotas da API, login e clientes
  disparos.js     agenda e envio dos lotes
  shopee.js       Open API, ID de afiliado e produtos de exemplo
  conexoes.js     conexões por cliente (tokens cifrados)
  modelos.js      modelos de mensagem
  canais/         whatsapp.js, telegram.js, instagram.js
public/           telas (HTML, CSS e JS sem framework)
```

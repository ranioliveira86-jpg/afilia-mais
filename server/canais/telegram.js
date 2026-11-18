// Telegram pelo Bot API oficial: o cliente cria um bot no @BotFather, coloca o bot como
// administrador do canal ou grupo e cola o token e o @ do canal na tela Conexões.
import { paraHtmlTelegram } from '../modelos.js';

const api = (token, metodo, corpo) =>
  fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo || {}),
  }).then(r => r.json()).catch(() => ({ ok: false, description: 'não consegui falar com o Telegram agora. Tente de novo em instantes.' }));

export async function testarBot(token) {
  const r = await api(token, 'getMe');
  if (!r.ok) throw new Error(r.error_code === 401 ? 'Token do bot inválido. Copie de novo no @BotFather.' : 'Telegram: ' + r.description);
  return r.result; // { username, first_name }
}

export async function infoChat(token, chatId) {
  const r = await api(token, 'getChat', { chat_id: chatId });
  if (!r.ok) throw new Error('O bot não encontrou esse canal ou grupo. Confira o @ e se o bot é administrador.');
  return r.result;
}

export async function enviarTelegram({ token, chatId }, texto, produto) {
  const legenda = paraHtmlTelegram(texto);
  const botao = produto.link ? { reply_markup: { inline_keyboard: [[{ text: 'Comprar na Shopee', url: produto.link }]] } } : {};
  let r;
  if (produto.img && /^https?:\/\//.test(produto.img) && legenda.length <= 1024) {
    r = await api(token, 'sendPhoto', { chat_id: chatId, photo: produto.img, caption: legenda, parse_mode: 'HTML', ...botao });
  } else {
    r = await api(token, 'sendMessage', { chat_id: chatId, text: legenda, parse_mode: 'HTML', ...botao });
  }
  if (!r.ok) throw new Error('Telegram: ' + (r.description || 'erro ao enviar'));
  return r.result.message_id;
}

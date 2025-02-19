import { TelegramClient } from '@mtcute/node';
import { Dispatcher } from '@mtcute/dispatcher';
import 'dotenv/config';

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

if (!apiId || !apiHash) {
  throw new Error('API_ID и API_HASH должны быть установлены в переменных окружения');
}

const tg = new TelegramClient({
  apiId: apiId,
  apiHash: apiHash,
  storage: 'my-account', 
});
const dp = new Dispatcher(tg);
const peer = await tg.resolvePeer("me")
dp.onNewMessage(async (msg) => {
  console.log('New message received:', msg.text);
  try {
		await msg.forwardTo({toChatId: peer});
    console.log('Message forwarded to "self"');
  } catch (error) {
    console.error('Failed to forward message:', error);
  }
});

(async () => {
  try {
    const self = await tg.start(); 
    console.log(`Logged in as ${self.displayName}`);
  } catch (error) {
    console.error('Failed to start client:', error);
  }
})();
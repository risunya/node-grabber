import { TelegramClient, html } from '@mtcute/node'
import 'dotenv/config'

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;

if (!apiId || !apiHash) {
  throw new Error('API_ID и API_HASH должны быть установлены в переменных окружения');
}

const tg = new TelegramClient({
	apiId: apiId,
  apiHash: apiHash,
  storage: 'my-account' 
})

const self = await tg.start({})
console.log(`Logged in as ${self.displayName}`)

await tg.sendText('self', html`Hello from <b>MTCute</b>!`)
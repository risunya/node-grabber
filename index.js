import { SqliteStorage, TelegramClient } from '@mtcute/node';
import { Bot } from "grammy"; 
import { Dispatcher, filters } from '@mtcute/dispatcher';
import 'dotenv/config';
import { apiHash, apiId, botApi, userId } from './api/index.js';
import { deleteChannel, getChannelsData } from './data/index.js';
import {
	conversations,
	createConversation,
} from "@grammyjs/conversations";
import { userConversation } from "./conversations/addchannel.js";

export const bot = new Bot(botApi); 
bot.use(conversations())
	 .use(createConversation(userConversation))


export const tg = new TelegramClient({
  apiId: apiId,
  apiHash: apiHash,
  storage: new SqliteStorage('./auth/hash.session')
});

(async () => {
  try {
    const self = await tg.start({
			phone: () => tg.input('Phone > '),
			code: () => tg.input('Code > '),
			password: () => tg.input('Password > ')
		}); 
    console.log(`Logged in as ${self.displayName}`);
  } catch (error) {
    console.error('Failed to start client:', error);
  }
})();


const dp = new Dispatcher(tg);
const peer = await tg.resolvePeer("me")

dp.onNewMessage(async (msg) => {
  if (msg.chat.inputPeer._ === 'inputPeerChannel') {
    const channels = getChannelsData();

    const channel = channels.find(
      (channel) => channel.id == `-100${msg.chat.inputPeer.channelId}`
    );

    if (channel) {
      try {
        await msg.forwardTo({ toChatId: peer });
        console.log(`Сообщение переслано из канала ${channel.id}`);
      } catch (error) {
        console.error('Ошибка при пересылке сообщения:', error);
      }
    }
  }
});

	const channelsNames = getChannelsData()
  .map((el) => el.name) // Преобразуем массив объектов в массив имен
  .join('\n');
	await bot.api.sendMessage(userId, `Бот запущен! 🚀\n
	Актуальный список отслеживаемых каналов на сегодня:\n${channelsNames}`);

	await bot.api.setMyCommands([
		{ command: "start", description: "Запустить бота" },
		{ command: "addchannel", description: "Добавить канал" },
		{ command: "deletechannel", description: "Удалить канал" },
		{ command: "editchannels", description: "Изменить канал" },
		{ command: "currentchannels", description: "Текущие подписки" },
	]);


bot.command("addchannel", async (ctx) => {
	await ctx.conversation.enter('userConversation');
  const item = ctx.match;
	console.log(item);
});

bot.command("currentchannels", async (ctx) => {
	let data = getChannelsData()
	await ctx.reply(data.length == 0 ? 'В данный момент отслеживается 0 каналов.' :getChannelsData()) 
});

bot.command("deletechannel", async (ctx) => {
  const channelName = ctx.match; 
  if (!channelName) {
    return ctx.reply('Пожалуйста, укажите имя канала. Например: /deletechannel ChannelName');
  }
  deleteChannel(channelName);
  ctx.reply(`Канал "${channelName}" удален.`);
});





bot.start();
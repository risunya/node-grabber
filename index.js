import { SqliteStorage, TelegramClient } from '@mtcute/node';
import { Bot } from "grammy"; 
import { Dispatcher } from '@mtcute/dispatcher';
import 'dotenv/config';
import { apiHash, apiId, botApi, groupId, userId } from './api/index.js';
import { deleteChannel, getChannelsData } from './data/index.js';
import {
	conversations,
	createConversation,
} from "@grammyjs/conversations";
import { 
	deleteChannelConversation,
	addChannelConversation,
	currentChannelsConversation
 } from './conversations/index.js';
import { isUserName } from './utils/helpers.js';

export const bot = new Bot(botApi); 
bot.use(conversations())
	 .use(createConversation(addChannelConversation))
	 .use(createConversation(deleteChannelConversation))
	 .use(createConversation(currentChannelsConversation))


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
      (channel) => channel.channelId == `-100${msg.chat.inputPeer.channelId}`
    );
    if (channel) {
      try {
				bot.api.sendMessage(groupId, `-100${msg.chat.inputPeer.channelId}`);
        console.log(`Сообщение переслано из канала ${channel.channelId} в ${groupId}`);
      } catch (error) {
        console.error('Ошибка при пересылке сообщения:', error);
      }
    }
  }
});

	const channelsNames = getChannelsData()
  .map((el) => el.name) 
  .join('\n');

	const introText = `Бот запущен! 🚀\n` + 
	(!channelsNames ? `В данный момент нет отслеживаемых каналов. Добавьте их с помощью команды /addchannel !` : `Актуальный список отслеживаемых каналов на сегодня:\n${channelsNames}`)
	await bot.api.sendMessage(userId, introText);

	await bot.api.setMyCommands([
		{ command: "start", description: "Запустить бота" },
		{ command: "addchannel", description: "Добавить канал" },
		{ command: "deletechannel", description: "Удалить канал" },
		{ command: "editchannels", description: "Изменить канал" },
		{ command: "currentchannels", description: "Текущие подписки" },
	]);


bot.command("addchannel", async (ctx) => {
	await ctx.conversation.enter('addChannelConversation');
  const item = ctx.match;
	console.log(item);
});


bot.command("currentchannels", async (ctx) => {
	await ctx.conversation.enter('currentChannelsConversation');
});

bot.command("deletechannel", async (ctx) => {
  const channelName = ctx.match; 
	// если команда + название
  if (isUserName(channelName)) {
		deleteChannel(channelName);
		ctx.reply(`Канал "${channelName}" удален.`);
  } else {
		await ctx.conversation.enter('deleteChannelConversation');
	}
});





bot.start();
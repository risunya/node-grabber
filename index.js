import { SqliteStorage, TelegramClient } from '@mtcute/node';
import { Bot } from "grammy"; 
import { Dispatcher } from '@mtcute/dispatcher';
import 'dotenv/config';
import { apiHash, apiId, botApi, userId } from './api/index.js';
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
import { calculateChannelId, isTwoUsernames, isUserName } from './utils/helpers.js';
import { addToDB } from './conversations/addchannel.js';
import { sendCurrentChannels } from './conversations/currentchannels.js';

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

dp.onNewMessage(async (msg) => {
  if (msg.chat.inputPeer._ === 'inputPeerChannel') {
		const sendFrom = calculateChannelId(msg.chat.inputPeer.channelId)
    const channels = getChannelsData();
    const channel = channels.find(
      (channel) => channel.channelIdFrom == sendFrom
    );
    if (channel) {
      try {
				const ids = channel.channelIdTo.split(',')
				if (ids.length == 1) {
					bot.api.sendMessage(ids[0], msg.text + `\n\n«${msg.chat.title}»`);
					console.log(`Сообщение переслано из канала ${sendFrom} в ${channel.channelIdTo}`);
				} else {
					for (const id of ids) {
						bot.api.sendMessage(id, msg.text + `\n\n«${msg.chat.title}»`);
						
						console.log(`Сообщение переслано из канала ${sendFrom} в ${id}`);
					}
				}
				
      } catch (error) {
        console.error('Ошибка при пересылке сообщения:', error);
      }
    }
  }
});

	const introText = `Бот запущен! 🚀\n\n` + 
	(!sendCurrentChannels() ? `В данный момент нет отслеживаемых каналов. Добавьте их с помощью команды /add !` : `Актуальный список отслеживаемых каналов:\n${sendCurrentChannels()}`)
	await bot.api.sendMessage(userId, introText);

	await bot.api.setMyCommands([
		{ command: "start", description: "Запустить бота" },
		{ command: "add", description: "Добавить канал" },
		{ command: "del", description: "Удалить канал" },
		{ command: "cur", description: "Текущие подписки" },
	]);


bot.command("add", async (ctx) => {
	const shortcut = ctx.match;
	const [channelNameFrom, channelNameTo] = shortcut.split(' ');

	if (isTwoUsernames(shortcut)) {
		addToDB(ctx, channelNameFrom, channelNameTo)
	} else {
		await ctx.conversation.enter('addChannelConversation');
	}
});


bot.command("cur", async (ctx) => {
	await ctx.conversation.enter('currentChannelsConversation');
});

bot.command("del", async (ctx) => {
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
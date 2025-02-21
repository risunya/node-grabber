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
				bot.api.sendMessage(channel.channelIdTo, msg.text);
        console.log(`Сообщение переслано из канала ${sendFrom} в ${channel.channelIdTo}`);
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
		{ command: "add", description: "Добавить канал" },
		{ command: "delete", description: "Удалить канал" },
		{ command: "edit", description: "Изменить канал" },
		{ command: "current", description: "Текущие подписки" },
	]);


bot.command("add", async (ctx) => {
	const shortcut = ctx.match;
	const [channelNameFrom, channelNameTo] = shortcut.replace(/ /g,'').split(",");
	if (isTwoUsernames(shortcut)) {
		addToDB(ctx, channelNameFrom, channelNameTo)
	} else {
		await ctx.conversation.enter('addChannelConversation');
	}
});


bot.command("current", async (ctx) => {
	await ctx.conversation.enter('currentChannelsConversation');
});

bot.command("delete", async (ctx) => {
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
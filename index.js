import { SqliteStorage, TelegramClient } from '@mtcute/node';
import { Bot } from "grammy"; 
import { Dispatcher, filters } from '@mtcute/dispatcher';
import 'dotenv/config';
import { apiHash, apiId, botApi, userId } from './api/index.js';
import { deleteChannel, getChannelsData, getSettingsValue, updateSettings } from './data/index.js';
import {
	conversations,
	createConversation,
} from "@grammyjs/conversations";
import { 
	deleteChannelConversation,
	addChannelConversation,
	currentChannelsConversation
 } from './conversations/index.js';
import { calculateChannelId, isTwoUsernames, isUserName, userNameToLink } from './utils/helpers.js';
import { addToDB } from './conversations/addchannel.js';
import { sendCurrentChannels } from './conversations/currentchannels.js';
import { sendCurrentSettings, settingsConversation } from './conversations/settings.js';

export const bot = new Bot(botApi); 
bot.use(conversations())
	 .use(createConversation(addChannelConversation))
	 .use(createConversation(deleteChannelConversation))
	 .use(createConversation(currentChannelsConversation))
	 .use(createConversation(settingsConversation))


export const tg = new TelegramClient({
  apiId: apiId,
  apiHash: apiHash,
  storage: new SqliteStorage('./auth/hash.session'),
	updates: {
		messageGroupingInterval: 250,
}});

(async () => {
  try {
    const self = await tg.start({
			phone: () => tg.input('Phone > '),
			code: () => tg.input('Code > '),
			password: () => tg.input('Password > ')
		}); 
		joinChats()
    console.log(`Logged in as ${self.displayName}`);
  } catch (error) {
    console.error('Failed to start client:', error);
  }
})();

const dp = new Dispatcher(tg);

export async function joinChats() {
	const channels = getChannelsData()
	for (let channel of channels) {
		const channelName = (channel.channelNameFrom).replace('@','')
		await tg.closeChat(channelName);
		await tg.openChat(channelName);
	}
}


const forwardMessage = async (msg) => {
  let sendFrom;

  if (msg.chat.inputPeer._ === 'inputPeerChannel') {
    sendFrom = calculateChannelId(msg.chat.inputPeer.channelId);
  } else if (msg.chat.inputPeer._ === 'inputPeerUser' && msg.chat.isBot && !msg.sender.isSelf) {
    sendFrom = msg.chat.id;
  } else {
    return;
  }

  const channels = getChannelsData();
  const channel = channels.find((channel) => channel.channelIdFrom == sendFrom);
  if (!channel) return;

  try {
    const ids = channel.channelIdTo.split(',');
    const quotingEnabled = getSettingsValue('quoting');
    const logEnabled = getSettingsValue('logs');

    ids.forEach((id) => {
      setTimeout(() => {
        msg.forwardTo({ toChatId: Number(id), noAuthor: !quotingEnabled });
        logEnabled && console.log(`Сообщение переслано из ${sendFrom} в ${id}`);
      }, 500);
    });
  } catch (error) {
    console.error('Ошибка при пересылке сообщения:', error);
  }
};

dp.onNewMessage(filters.photo, forwardMessage);
dp.onNewMessage(filters.not(filters.photo), forwardMessage);
dp.onMessageGroup(forwardMessage);


	const introText = `Бот запущен! 🚀\n\n` + 
	(!sendCurrentChannels() ? `В данный момент нет отслеживаемых каналов. Добавьте их с помощью команды /add !` : `Актуальный список отслеживаемых каналов:\n${sendCurrentChannels()}`)
	await bot.api.sendMessage(userId, introText);

	await bot.api.setMyCommands([
		{ command: "start", description: "Запустить бота" },
		{ command: "add", description: "Добавить канал" },
		{ command: "del", description: "Удалить канал" },
		{ command: "cur", description: "Текущие подписки" },
		{ command: "settings", description: "Текущие настройки" },
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

bot.command("settings", async (ctx) => {
	await ctx.conversation.enter("settingsConversation");
});

bot.on("callback_query:data", async (ctx) => {
	const callbackData = ctx.callbackQuery.data;

	if (callbackData === "leave") {
		await ctx.api.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id);
		await ctx.reply("Настройки применены ✅");
	} else {
		updateSettings(callbackData, Number(!getSettingsValue(callbackData))); 

		const updatedSettings = sendCurrentSettings();
		await ctx.editMessageText(updatedSettings.text, {
			reply_markup: updatedSettings.reply_markup
		});

		await ctx.answerCallbackQuery("Настройки обновлены ✅");
	}
});

bot.start();
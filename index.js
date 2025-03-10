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
		messageGroupingInterval: 1000,
}});

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

dp.onNewMessage(
  filters.photo,
  async (msg) => {
    if (msg.chat.inputPeer._ === 'inputPeerChannel') {
      const sendFrom = calculateChannelId(msg.chat.inputPeer.channelId);
      const channels = getChannelsData();
      const channel = channels.find((channel) => channel.channelIdFrom == sendFrom);

      if (channel) {
        try {
          const ids = channel.channelIdTo.split(',');
          const quotingEnabled = getSettingsValue('quoting');
          const logEnabled = getSettingsValue('logs');

          // Отправляем только одно изображение
          if (msg.media?.id) {
            for (const id of ids) {
              sendMedia(msg, id, logEnabled, quotingEnabled, sendFrom);
            }
          }
        } catch (error) {
          console.error('Ошибка при пересылке фото:', error);
        }
      }
    }
  }
);


dp.onNewMessage(
  filters.not(filters.photo),
  async (msg) => {
    if (msg.chat.inputPeer._ === 'inputPeerChannel') {
      const sendFrom = calculateChannelId(msg.chat.inputPeer.channelId);
      const channels = getChannelsData();
      const channel = channels.find((channel) => channel.channelIdFrom == sendFrom);

      if (channel) {
        try {
          const ids = channel.channelIdTo.split(',');
          const quotingEnabled = getSettingsValue('quoting');
          const logEnabled = getSettingsValue('logs');
          
          if (ids.length == 1) {
            setTimeout(() => {
              msg.forwardTo({ toChatId: Number(ids[0]), noAuthor: !quotingEnabled });
            }, 500);
            logEnabled && console.log(`Сообщение переслано из канала ${sendFrom} в nodegrabber`);
          } else {
            for (const id of ids) {
              setTimeout(() => {
                msg.forwardTo({ toChatId: Number(id), noAuthor: !quotingEnabled });
              }, 500);
              logEnabled && console.log(`Сообщение переслано из канала ${sendFrom} в ${id}`);
            }
          }
        } catch (error) {
          console.error('Ошибка при пересылке сообщения:', error);
        }
      }
    }
  }
);

//media 
const sendMedia = (msg, id, logsEnabled, quotingEnabled, sendFrom) => {
  setTimeout(() => {
		msg.forwardTo({ toChatId: Number(id), noAuthor: !quotingEnabled});
  }, 500);
  logsEnabled && console.log(`Сообщение переслано из канала ${sendFrom} в ${id}`);
}

dp.onMessageGroup(
  async (msg) => {

    if (msg.chat.inputPeer._ === 'inputPeerChannel') {
      const sendFrom = calculateChannelId(msg.chat.inputPeer.channelId);
      const channels = getChannelsData();
      const channel = channels.find((channel) => channel.channelIdFrom == sendFrom);

      if (channel) {
        try {
          const ids = channel.channelIdTo.split(',');
          const quotingEnabled = getSettingsValue('quoting');
          const logEnabled = getSettingsValue('logs');

          if (ids.length == 1) {
            sendMedia(msg, ids[0], logEnabled, quotingEnabled, sendFrom);
          } else {
            for (const id of ids) {
              sendMedia(msg, id, logEnabled, quotingEnabled, sendFrom);
            }
          }

        } catch (error) {
          console.error('Ошибка при пересылке сообщения:', error);
        }
      }
    }
  }
);

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
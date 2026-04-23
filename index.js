import { SqliteStorage, TelegramClient } from "@mtcute/node";
import { Bot } from "grammy";
import { Dispatcher, filters } from "@mtcute/dispatcher";
import "dotenv/config";
import { apiHash, apiId, botApi, userId, devUserId } from "./api/index.js";
import {
  deleteChannel,
  getChannelsData,
  getSettingsValue,
  updateSettings,
} from "./data/index.js";
import { conversations, createConversation } from "@grammyjs/conversations";
import {
  deleteChannelConversation,
  addChannelConversation,
  currentChannelsConversation,
} from "./conversations/index.js";
import {
  calculateChannelId,
  isTwoUsernames,
  isUserName,
} from "./utils/helpers.js";
import { addToDB } from "./conversations/addchannel.js";
import { sendCurrentChannels } from "./conversations/currentchannels.js";
import {
  sendCurrentSettings,
  settingsConversation,
} from "./conversations/settings.js";
import { autoRetry } from "@grammyjs/auto-retry";

// Вспомогательная задержка
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const bot = new Bot(botApi);

bot.api.config.use(
  autoRetry({
    maxRetryAttempts: 3,
    maxDelaySeconds: 5,
    retryOnInternalServerErrors: true,
  }),
);

bot.use(async (ctx, next) => {
  const uId = Number(process.env.USER_ID);
  const dId = Number(process.env.DEV_USER_ID);
  const isPrivateChat = ctx.chat?.type == "private";
  const fromId = ctx.from?.id;
  const isFromBot = ctx.from?.is_bot;

  if (isPrivateChat && !isFromBot && fromId !== uId && fromId !== dId) {
    return ctx.reply("Извините, вы не авторизованы.");
  }
  await next();
});

let isBotEnabled = true;

bot.command("on", async (ctx) => {
  if (isBotEnabled) return ctx.reply("Бот уже включен!");
  isBotEnabled = true;
  ctx.reply("Включен!");
});

bot.command("off", async (ctx) => {
  if (!isBotEnabled) return ctx.reply("Бот уже выключен!");
  isBotEnabled = false;
  ctx.reply("Выключен.");
});

bot
  .use(conversations())
  .use(createConversation(addChannelConversation))
  .use(createConversation(deleteChannelConversation))
  .use(createConversation(currentChannelsConversation))
  .use(createConversation(settingsConversation));

export const tg = new TelegramClient({
  apiId: apiId,
  apiHash: apiHash,
  storage: new SqliteStorage("./auth/hash.session"),
  updates: {
    catchUp: true,
  },
});

const dp = new Dispatcher(tg);

export async function joinChats() {
  const channels = getChannelsData();
  for (let channel of channels) {
    const channelName = channel.channelNameFrom.replace("@", "");
    try {
      await tg.openChat(channelName);
      await delay(500);
    } catch (e) {
      console.error(`[!] Ошибка входа в чат ${channelName}: ${e.message}`);
    }
  }
}

const forwardMessage = async (msg) => {
  if (!isBotEnabled) return;

  // Лог для отладки
  const rawChatId = String(msg.chat.id);
  console.log(
    `[NEW MESSAGE] ID: ${msg.id} | Chat: ${rawChatId} | Text: ${msg.text?.slice(0, 20)}...`,
  );

  let sendFrom;
  if (msg.chat?.inputPeer?._ === "inputPeerChannel") {
    sendFrom = String(calculateChannelId(msg.chat.inputPeer.channelId));
  } else if (
    msg.chat?.inputPeer?._ === "inputPeerUser" &&
    msg.chat.isBot &&
    !msg.sender?.isSelf
  ) {
    sendFrom = rawChatId;
  } else {
    return;
  }

  // Нормализуем ID для сравнения (убираем -100)
  const normalize = (id) => String(id).replace("-100", "").trim();

  const channel = getChannelsData().find(
    (ch) => normalize(ch.channelIdFrom) === normalize(sendFrom),
  );

  if (!channel) return;

  const messageText = msg.text?.toLowerCase() || "";
  const filterWords = channel.filterWords
    ? channel.filterWords.split(",").map((word) => word.trim().toLowerCase())
    : [];

  if (filterWords.some((word) => word && messageText.includes(word))) {
    if (getSettingsValue("logs")) {
      console.log(`[FILTER] Сообщение из ${sendFrom} содержит стоп-слово.`);
    }
    return;
  }

  try {
    const channelIds = String(channel.channelIdTo)
      .split(",")
      .map((id) => id.trim());
    const quotingEnabled = getSettingsValue("quoting");
    const logEnabled = getSettingsValue("logs");

    for (const id of channelIds) {
      try {
        await msg.forwardTo({ toChatId: id, noAuthor: !quotingEnabled });
        if (logEnabled) console.log(`[OK] Переслано из ${sendFrom} в ${id}`);
        await delay(500);
      } catch (error) {
        console.error(`[!] Ошибка пересылки в ${id}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`[CRITICAL] Ошибка пересылки: ${error.message}`);
  }
};

dp.onNewMessage(filters.photo, forwardMessage);
dp.onNewMessage(filters.not(filters.photo), forwardMessage);
dp.onMessageGroup(forwardMessage);

(async () => {
  try {
    const self = await tg.start({
      phone: () => tg.input("Phone > "),
      code: () => tg.input("Code > "),
      password: () => tg.input("Password > "),
    });
    console.log(`Logged in as ${self.displayName}`);
    await joinChats();

    // Запуск бота
    bot.start();

    // Приветственное сообщение
    const introText =
      `Бот запущен! 🚀\n\n` +
      (!sendCurrentChannels()
        ? `В данный момент нет отслеживаемых каналов.`
        : `Список подписок:\n${sendCurrentChannels()}`);
    await bot.api.sendMessage(userId, introText);

    await bot.api.setMyCommands([
      { command: "start", description: "Запустить бота" },
      { command: "add", description: "Добавить канал" },
      { command: "del", description: "Удалить канал" },
      { command: "cur", description: "Текущие подписки" },
      { command: "settings", description: "Настройки" },
    ]);
  } catch (error) {
    console.error("Failed to start client:", error);
  }
})();

bot.command("add", async (ctx) => {
  if (!isBotEnabled) return ctx.reply("Бот выключен :(");
  if (isTwoUsernames(ctx.match)) {
    const [from, to] = ctx.match.split(" ");
    addToDB(ctx, from, to);
  } else {
    await ctx.conversation.enter("addChannelConversation");
  }
});

bot.command("cur", async (ctx) => {
  if (!isBotEnabled) return ctx.reply("Бот выключен :(");
  await ctx.conversation.enter("currentChannelsConversation");
});

bot.command("del", async (ctx) => {
  if (!isBotEnabled) return ctx.reply("Бот выключен :(");
  if (isUserName(ctx.match)) {
    deleteChannel(ctx.match);
    ctx.reply(`Канал "${ctx.match}" удален.`);
  } else {
    await ctx.conversation.enter("deleteChannelConversation");
  }
});

bot.command("settings", async (ctx) => {
  if (!isBotEnabled) return ctx.reply("Бот выключен :(");
  await ctx.conversation.enter("settingsConversation");
});

bot.on("callback_query:data", async (ctx) => {
  if (!isBotEnabled) return;
  const callbackData = ctx.callbackQuery.data;

  if (callbackData === "leave") {
    await ctx.api.deleteMessage(
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
    );
    await ctx.reply("Настройки применены ✅");
  } else {
    updateSettings(callbackData, Number(!getSettingsValue(callbackData)));
    const updated = sendCurrentSettings();
    await ctx.editMessageText(updated.text, {
      reply_markup: updated.reply_markup,
    });
    await ctx.answerCallbackQuery("Обновлено ✅");
  }
});

bot.catch(async (err) => {
  console.error("Grammy error:", err);
  if (devUserId)
    await bot.api
      .sendMessage(devUserId, `⚠️ Ошибка: ${err.message}`)
      .catch(() => {});
});

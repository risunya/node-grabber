import { SqliteStorage, TelegramClient, sleep } from "@mtcute/node";
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

// --- КОНФИГУРАЦИЯ BOT API (grammY) ---
export const bot = new Bot(botApi);

bot.api.config.use(
  autoRetry({
    maxRetryAttempts: 3,
    maxDelaySeconds: 5,
    retryOnInternalServerErrors: true,
  }),
);

bot.use(async (ctx, next) => {
  const targetId = Number(process.env.USER_ID);
  const devId = Number(process.env.DEV_USER_ID);
  const isPrivate = ctx.chat?.type === "private";
  const fromId = ctx.from?.id;

  if (
    isPrivate &&
    !ctx.from?.is_bot &&
    fromId !== targetId &&
    fromId !== devId
  ) {
    return ctx.reply("Извините, вы не авторизованы.");
  }
  await next();
});

let isBotEnabled = true;

bot.command("on", (ctx) => {
  isBotEnabled = true;
  ctx.reply("Бот включен!");
});

bot.command("off", (ctx) => {
  isBotEnabled = false;
  ctx.reply("Бот выключен.");
});

bot
  .use(conversations())
  .use(createConversation(addChannelConversation))
  .use(createConversation(deleteChannelConversation))
  .use(createConversation(currentChannelsConversation))
  .use(createConversation(settingsConversation));

// --- КОНФИГУРАЦИЯ USERBOT (mtcute) ---
export const tg = new TelegramClient({
  apiId: apiId,
  apiHash: apiHash,
  storage: new SqliteStorage("./auth/hash.session"),
  updates: {
    // Убрали groupingInterval, чтобы избежать TimeoutNegativeWarning
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
      await sleep(1000);
    } catch (e) {
      console.error(`[!] Ошибка чата ${channelName}: ${e.message}`);
    }
  }
}

const forwardMessage = async (msg) => {
  // ХАРТБИТ: если видишь это в консоли, значит MTProto работает
  console.log(
    `[NEW MESSAGE] ID: ${msg.id} | Chat: ${msg.chat.id} | Text: ${msg.text?.slice(0, 20)}...`,
  );

  if (!isBotEnabled || !msg.isRegular) return;

  let sendFrom;
  if (msg.chat?.inputPeer?._ === "inputPeerChannel") {
    sendFrom = calculateChannelId(msg.chat.inputPeer.channelId);
  } else if (
    msg.chat?.inputPeer?._ === "inputPeerUser" &&
    msg.chat.isBot &&
    !msg.sender?.isSelf
  ) {
    sendFrom = msg.chat.id;
  } else {
    return;
  }

  const channel = getChannelsData().find((ch) => ch.channelIdFrom == sendFrom);
  if (!channel) return;

  const messageText = msg.text?.toLowerCase() || "";
  const filterWords = channel.filterWords
    ? channel.filterWords.split(",").map((w) => w.trim().toLowerCase())
    : [];

  if (filterWords.some((word) => messageText.includes(word))) {
    if (getSettingsValue("logs"))
      console.log(`[FILTER] Сообщение из ${sendFrom} содержит стоп-слова.`);
    return;
  }

  try {
    const channelIds = channel.channelIdTo
      .split(",")
      .map((id) => Number(id.trim()));
    const quoting = getSettingsValue("quoting");
    const logEnabled = getSettingsValue("logs");

    for (const id of channelIds) {
      try {
        await msg.forwardTo({ toChatId: id, noAuthor: !quoting });
        if (logEnabled) console.log(`[SUCCESS] Из ${sendFrom} -> ${id}`);
        await sleep(500); // Защита от Flood Wait
      } catch (err) {
        console.error(`[!] Ошибка в ${id}: ${err.message}`);
        if (err.message.includes("wait of")) await sleep(3000);
      }
    }
  } catch (err) {
    console.error(`[CRITICAL] Ошибка цикла пересылки: ${err.message}`);
  }
};

// Регистрация обработчиков
dp.onNewMessage(filters.photo, forwardMessage);
dp.onNewMessage(filters.not(filters.photo), forwardMessage);
dp.onMessageGroup(forwardMessage);

// Запуск Bot API
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
    ctx.reply(`Удалено: ${ctx.match}`);
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
  const data = ctx.callbackQuery.data;
  if (data === "leave") {
    await ctx.api.deleteMessage(
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
    );
  } else {
    updateSettings(data, Number(!getSettingsValue(data)));
    const updated = sendCurrentSettings();
    await ctx.editMessageText(updated.text, {
      reply_markup: updated.reply_markup,
    });
  }
  await ctx.answerCallbackQuery("Обновлено ✅");
});

// ГЛАВНЫЙ ЗАПУСК
(async () => {
  try {
    const self = await tg.start({
      phone: () => tg.input("Phone > "),
      code: () => tg.input("Code > "),
      password: () => tg.input("Password > "),
    });
    console.log(`[USERBOT] Авторизован как ${self.displayName}`);

    await joinChats();

    // Запуск grammY
    bot.start();

    // Отправка уведомления о запуске
    const status = !sendCurrentChannels()
      ? "Нет каналов"
      : `Каналы:\n${sendCurrentChannels()}`;
    await bot.api
      .sendMessage(userId, `Бот активен! 🚀\n\n${status}`)
      .catch(() => {});

    // Поддержание статуса online
    setInterval(() => {
      tg.call({ _: "account.updateStatus", offline: false }).catch(() => {});
    }, 60000);
  } catch (error) {
    console.error("[FATAL] Ошибка запуска:", error);
  }
})();

bot.catch((err) => {
  console.error("[GRAMMY ERROR]", err);
});

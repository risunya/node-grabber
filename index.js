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

export const bot = new Bot(botApi);

// Применяем механизм повторных попыток ко всем API-вызовам
bot.api.config.use(
  autoRetry({
    maxRetryAttempts: 3, // Максимум 3 попытки
    maxDelaySeconds: 5, // Максимальная задержка между попытками
    retryOnInternalServerErrors: true, // Повторять при ошибках 5xx
  }),
);

bot.command("crash", (ctx) => {
  // Искусственно вызываем ошибку, аналогичную ECONNRESET
  const err = new Error("Simulated ECONNRESET");
  // Добавим код ошибки
  // @ts-ignore
  err.code = "ECONNRESET";
  throw err;
});

bot.use(async (ctx, next) => {
  const userId = Number(process.env.USER_ID);
  const devUserId = Number(process.env.DEV_USER_ID);
  const isPrivateChat = ctx.chat?.type == "private";
  const fromId = ctx.from?.id;
  const isFromBot = ctx.from?.is_bot;

  // Блокируем всех людей, кроме тебя, в личных сообщениях
  if (
    isPrivateChat &&
    !isFromBot &&
    fromId !== userId &&
    fromId !== devUserId
  ) {
    return ctx.reply(
      "Извините, вы не авторизованы для использования этого бота.",
    );
  }

  await next();
});

let isBotEnabled = true;

// Команда /on
bot.command("on", async (ctx) => {
  if (isBotEnabled) {
    await ctx.reply("Бот уже включен!");
    return;
  }
  isBotEnabled = true;
  ctx.reply("Включен!");
});

// Команда /off
bot.command("off", async (ctx) => {
  if (!isBotEnabled) {
    await ctx.reply("Бот уже выключен!");
    return;
  }
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
    messageGroupingInterval: 250,
    catchUp: true,
  },
});

(async () => {
  try {
    const self = await tg.start({
      phone: () => tg.input("Phone > "),
      code: () => tg.input("Code > "),
      password: () => tg.input("Password > "),
    });
    joinChats();
    console.log(`Logged in as ${self.displayName}`);
  } catch (error) {
    console.error("Failed to start client:", error);
  }
})();

const dp = new Dispatcher(tg);

export async function joinChats() {
  const channels = getChannelsData();
  for (let channel of channels) {
    const channelName = channel.channelNameFrom.replace("@", "");
    await tg.openChat(channelName);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

const forwardMessage = async (msg) => {
  if (!isBotEnabled) {
    return;
  }
  // Определение источника сообщения
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

  // Поиск канала
  const channel = getChannelsData().find((ch) => ch.channelIdFrom == sendFrom);
  if (!channel) return;

  // Проверка фильтров
  const messageText = msg.text?.toLowerCase() || "";
  const filterWords = channel.filterWords
    ? channel.filterWords.split(",").map((word) => word.trim().toLowerCase())
    : [];
  if (filterWords.some((word) => messageText.includes(word))) {
    if (getSettingsValue("logs")) {
      console.log(
        `Сообщение из ${sendFrom} отфильтровано. Содержит слова: ${filterWords.join(
          ", ",
        )}`,
      );
    }
    return;
  }

  // Пересылка сообщения
  try {
    const channelIds = channel.channelIdTo
      .split(",")
      .map((id) => Number(id.trim()));
    const quotingEnabled = getSettingsValue("quoting");
    const logEnabled = getSettingsValue("logs");

    await Promise.all(
      channelIds.map(async (id) => {
        try {
          await msg.forwardTo({ toChatId: id, noAuthor: !quotingEnabled });
          if (logEnabled) {
            console.log(`Сообщение переслано из ${sendFrom} в ${id}`);
          }
        } catch (error) {
          console.error(`Ошибка пересылки в ${id}: ${error.message}`);
        }
      }),
    );
  } catch (error) {
    console.error(`Общая ошибка пересылки: ${error.message}`);
  }
};

dp.onNewMessage(filters.photo, forwardMessage);
dp.onNewMessage(filters.not(filters.photo), forwardMessage);
dp.onMessageGroup(forwardMessage);

const introText =
  `Бот запущен! 🚀\n\n` +
  (!sendCurrentChannels()
    ? `В данный момент нет отслеживаемых каналов. Добавьте их с помощью команды /add !`
    : `Актуальный список отслеживаемых каналов:\n${sendCurrentChannels()}`);
await bot.api.sendMessage(userId, introText);

await bot.api.setMyCommands([
  { command: "start", description: "Запустить бота" },
  { command: "add", description: "Добавить канал" },
  { command: "del", description: "Удалить канал" },
  { command: "cur", description: "Текущие подписки" },
  { command: "settings", description: "Текущие настройки" },
]);

bot.command("add", async (ctx) => {
  if (!isBotEnabled) {
    ctx.reply("Бот выключен :(");
    return;
  }
  const shortcut = ctx.match;
  const [channelNameFrom, channelNameTo] = shortcut.split(" ");

  if (isTwoUsernames(shortcut)) {
    addToDB(ctx, channelNameFrom, channelNameTo);
  } else {
    await ctx.conversation.enter("addChannelConversation");
  }
});

bot.command("cur", async (ctx) => {
  if (!isBotEnabled) {
    ctx.reply("Бот выключен :(");
    return;
  }
  await ctx.conversation.enter("currentChannelsConversation");
});

bot.command("del", async (ctx) => {
  if (!isBotEnabled) {
    ctx.reply("Бот выключен :(");
    return;
  }
  const channelName = ctx.match;
  // если команда + название
  if (isUserName(channelName)) {
    deleteChannel(channelName);
    ctx.reply(`Канал "${channelName}" удален.`);
  } else {
    await ctx.conversation.enter("deleteChannelConversation");
  }
});

bot.command("settings", async (ctx) => {
  if (!isBotEnabled) {
    ctx.reply("Бот выключен :(");
    return;
  }
  await ctx.conversation.enter("settingsConversation");
});

bot.on("callback_query:data", async (ctx) => {
  if (!isBotEnabled) {
    ctx.reply("Бот выключен :(");
    return;
  }
  const callbackData = ctx.callbackQuery.data;

  if (callbackData === "leave") {
    await ctx.api.deleteMessage(
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
    );
    await ctx.reply("Настройки применены ✅");
  } else {
    updateSettings(callbackData, Number(!getSettingsValue(callbackData)));

    const updatedSettings = sendCurrentSettings();
    await ctx.editMessageText(updatedSettings.text, {
      reply_markup: updatedSettings.reply_markup,
    });

    await ctx.answerCallbackQuery("Настройки обновлены ✅");
  }
});

bot.start();

bot.catch(async (err) => {
  await bot.api.sendMessage(devUserId, `⚠️ Бот упал с ошибкой: ${err.message}`);
});

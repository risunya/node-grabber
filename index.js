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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const bot = new Bot(botApi);

// Настройка авто-ретраев для интерфейсного бота
bot.api.config.use(autoRetry());

// Инициализация Telegram клиента (Юзербота)
export const tg = new TelegramClient({
  apiId: apiId,
  apiHash: apiHash,
  storage: new SqliteStorage("./auth/hash.session"),
  updates: {
    // Убираем группировку, чтобы сообщения летели по одному мгновенно
    messageGroupingInterval: 0,
    catchUp: true,
  },
});

const dp = new Dispatcher(tg);
let isBotEnabled = true;

// Функция входа в чаты (чтобы Telegram отдавал обновления)
export async function joinChats() {
  const channels = getChannelsData();
  for (let channel of channels) {
    const channelName = channel.channelNameFrom.replace("@", "");
    try {
      await tg.openChat(channelName);
      await delay(300); // Небольшая пауза, чтобы не спамить запросами к TG
    } catch (e) {
      console.error(`[!] Не удалось открыть чат ${channelName}: ${e.message}`);
    }
  }
}

// ОСНОВНАЯ ЛОГИКА ПЕРЕСЫЛКИ
const forwardMessage = async (msg) => {
  if (!isBotEnabled) return;

  // 1. Получаем чистый ID источника
  let sendFrom;
  if (msg.chat?.inputPeer?._ === "inputPeerChannel") {
    sendFrom = calculateChannelId(msg.chat.inputPeer.channelId);
  } else {
    sendFrom = String(msg.chat.id);
  }

  // 2. Ищем настройки для этого канала
  const normalize = (id) => String(id).replace("-100", "").trim();
  const channelConfig = getChannelsData().find(
    (ch) => normalize(ch.channelIdFrom) === normalize(sendFrom),
  );

  if (!channelConfig) return;

  // 3. Проверка стоп-слов
  const messageText = msg.text?.toLowerCase() || "";
  const filterWords = channelConfig.filterWords
    ? channelConfig.filterWords.split(",").map((w) => w.trim().toLowerCase())
    : [];

  if (filterWords.some((word) => word && messageText.includes(word))) {
    if (getSettingsValue("logs")) {
      console.log(`[FILTER] Пропущено из ${sendFrom} (стоп-слово)`);
    }
    return;
  }

  // 4. ПОСЛЕДОВАТЕЛЬНАЯ ПЕРЕСЫЛКА (чтобы не путать Telegram)
  try {
    const targetIds = String(channelConfig.channelIdTo)
      .split(",")
      .map((id) => id.trim());
    const quoting = getSettingsValue("quoting");

    for (const id of targetIds) {
      try {
        // Важно: приводим к числу, если это ID, иначе TG ругается на "Invalid Username"
        const toChatId =
          id.startsWith("-") || /^\d+$/.test(id) ? Number(id) : id;

        await msg.forwardTo({ toChatId, noAuthor: !quoting });

        if (getSettingsValue("logs")) {
          console.log(
            `[${new Date().toLocaleTimeString()}] OK: ${sendFrom} -> ${toChatId}`,
          );
        }

        // Маленькая пауза между отправками в разные группы (анти-спам)
        await delay(300);
      } catch (err) {
        console.error(`[!] Ошибка отправки в ${id}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[CRITICAL] Ошибка пересылки: ${err.message}`);
  }
};

// Хендлеры на все типы сообщений
dp.onNewMessage(forwardMessage);
dp.onMessageGroup(forwardMessage); // Для альбомов/групп фото

// Запуск
(async () => {
  try {
    const self = await tg.start({
      phone: () => tg.input("Phone > "),
      code: () => tg.input("Code > "),
      password: () => tg.input("Password > "),
    });

    console.log(`Userbot: Logged in as ${self.displayName}`);
    await joinChats();

    bot.start(); // Запуск интерфейсного бота
    console.log("Grammy: Interface bot started");

    const introText =
      `Бот активен! 🚀\n\n` + (sendCurrentChannels() || "Список каналов пуст.");
    await bot.api.sendMessage(userId, introText).catch(() => {});
  } catch (error) {
    console.error("Fatal start error:", error);
  }
})();

// --- Команды интерфейсного бота (оставил как в твоем исходнике) ---

bot.use(conversations());
bot.use(createConversation(addChannelConversation));
bot.use(createConversation(deleteChannelConversation));
bot.use(createConversation(currentChannelsConversation));
bot.use(createConversation(settingsConversation));

bot.command("on", (ctx) => {
  isBotEnabled = true;
  ctx.reply("Включен!");
});
bot.command("off", (ctx) => {
  isBotEnabled = false;
  ctx.reply("Выключен.");
});

bot.command("add", async (ctx) => {
  if (isTwoUsernames(ctx.match)) {
    const [from, to] = ctx.match.split(" ");
    addToDB(ctx, from, to);
  } else {
    await ctx.conversation.enter("addChannelConversation");
  }
});

bot.command("cur", (ctx) =>
  ctx.conversation.enter("currentChannelsConversation"),
);
bot.command("settings", (ctx) =>
  ctx.conversation.enter("settingsConversation"),
);
bot.command("del", (ctx) =>
  ctx.conversation.enter("deleteChannelConversation"),
);

bot.on("callback_query:data", async (ctx) => {
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
    await ctx.answerCallbackQuery("Обновлено ✅");
  }
});

bot.catch((err) => console.error("Grammy error:", err.message));

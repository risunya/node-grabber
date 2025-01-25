const { Bot } = require("grammy");
const { TelegramClient } = require("telegram");
const { Api } = require("telegram/tl");
const input = require("input");
const { StoreSession } = require("telegram/sessions");
require("dotenv").config();

const storeSession = new StoreSession("my_session");
const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const botToken = process.env.BOT_TOKEN;
const userId = process.env.USER_ID;

const targetChannels = ['rhymestg', 'rhymesmorgen', "testrisunya"]; 

(async () => {
    const client = new TelegramClient(storeSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: async () => await input.text("Введите номер телефона: "),
        password: async () => await input.text("Введите пароль: "),
        phoneCode: async () => await input.text("Введите код подтверждения: "),
        onError: (err) => console.log(err),
    });

    console.log("Вы подключены к Telegram!");

    const bot = new Bot(botToken);

    bot.api.sendMessage(userId, "Бот запущен и слушает указанные каналы.");

    // Присоединяемся к каналам
    for (const channel of targetChannels) {
        try {
					const result = await client.invoke(
						new Api.channels.JoinChannel({
							channel: channel,
						})
					);
					console.log(result && `Успешно подключен к @${channel}`);
        } catch (error) {
          console.warn(`Не удалось подключиться к каналу с ID ${channel}:`, error.message);
        }
    }

    client.addEventHandler(async (event) => {
			if (event.className !== "UpdateNewChannelMessage") return;
			const id = (event.message.peerId.channelId).value.toString();

			for (channel of targetChannels) {
					const result = await client.invoke(
						new Api.channels.GetFullChannel({
							channel: channel,
					}))
					if (id == (result.chats[0].id).value.toString()) {
						console.log(`Сообщение из группы ${result.chats[0].title}`)
					};
				};
			} 
    );

})();

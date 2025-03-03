import { InlineKeyboard } from "grammy";
import { getSettingsData } from "../data/index.js"; 

const nameConverter = (name) => {
	const names = {
		quoting: "Цитирование:",
		logs: "Логи:"
	};
	return names[name] || `${name}:`;
};

const sendCurrentSettings = () => {
	const data = getSettingsData();

	const keyboard = new InlineKeyboard();
	data.forEach(({ key, value }) => {
		keyboard.text(value ? `${nameConverter(key)} Включено ✅` : `${nameConverter(key)} Выключено ❌`, key).row();
	});
	keyboard.text("Закрыть меню", "leave");

	const text = "Текущие настройки.";

	return { text, reply_markup: keyboard };
};

const settingsConversation = async (conversation, ctx) => {
	const settings = sendCurrentSettings();
	await ctx.reply(settings.text, { reply_markup: settings.reply_markup });
};

export { settingsConversation, sendCurrentSettings };
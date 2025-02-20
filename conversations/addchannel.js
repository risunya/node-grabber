import { groupId } from "../api/index.js";
import { addChannel } from "../data/index.js";
import { tg } from "../index.js";

/// для получения нормального id с доки https://mtcute.dev/guide/topics/peers#marked-ids

const userConversation = async function (conversation, ctx) {
  const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

  while (true) {
    await ctx.reply("Хорошо. Отправь ссылку на канал или его @username.");

    const answerMessage = await conversation.wait();
    const text = answerMessage?.message?.text;
		const forwardTo = groupId

    if (urlPattern.test(text)) {
      await ctx.reply(`Ты отправил ссылку! ` + text);
      const name = text.split('/').pop();

      try {
        const e = await tg.resolveChannel(name);
        const channelId = (-1000000000000 - Number(e.channelId)).toFixed(0); // Преобразуем обратно
        addChannel(name, text, channelId, forwardTo);
      } catch (err) {
        await ctx.reply(`Ошибка при получении данных: ${err.message}`);
      }
      break;
    } else if (text.startsWith('@')) {
      const url = `https://t.me/${text.replace('@', '')}`;
      await ctx.reply(`Ты отправил юзернейм, но я переделал его в ссылку! Добавляем ? \n` + url);

      try {
        const e = await tg.resolveChannel(text);
        const channelId = (-1000000000000 - Number(e.channelId)).toFixed(0); // Преобразуем обратно
        addChannel(text, url, channelId, forwardTo);
      } catch (err) {
        await ctx.reply(`Ошибка при получении данных: ${err.message}`);
      }
      break;
    } else {
      await ctx.reply("Отправь в формате https://t.me/durov или @durov");
    }
  }
};

export { userConversation };

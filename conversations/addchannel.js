import { groupId } from "../api/index.js";
import { addChannel } from "../data/index.js";
import { tg } from "../index.js";
import { calculateChannelId, isUrl, isUserName, linkToUserName, userNameToLink } from "../utils/helpers.js";


const addChannelConversation = async function (conversation, ctx) {

  while (true) {
    await ctx.reply("Хорошо, для добавления канала - отправь ссылку на канал или его @username.");

    const answerMessage = await conversation.wait();
    const text = answerMessage?.message?.text;
		const forwardTo = groupId

    if (isUrl(text)) {
      await ctx.reply(`Ты отправил ссылку! ` + text);
      const name = linkToUserName(text);

      try {
        const e = await tg.resolveChannel(name);
        const channelId = calculateChannelId(e.channelId); 
        addChannel(name, text, channelId, forwardTo);
      } catch (err) {
        await ctx.reply(`Ошибка при получении данных: ${err.message}`);
      }
      break;
    } else if (isUserName(text)) {
      const url = userNameToLink(text);
      await ctx.reply(`Ты отправил юзернейм, но я переделал его в ссылку! Добавляем ? \n` + url);

      try {
        const e = await tg.resolveChannel(text);
        const channelId = calculateChannelId(e.channelId)
        addChannel(text, url, channelId, forwardTo);
      } catch (err) {
        await ctx.reply(`Ошибка при получении данных: ${err.message}`);
      }
      break;
    } else {
      await ctx.reply("Я не смог разобрать сообщение, оно не похоже на ссылку или юзернейм. Отправь в формате https://t.me/durov или @durov !");
    }
  }
};

export { addChannelConversation };

import { deleteChannel } from "../data/index.js";
import { isUserName } from "../utils/helpers.js";

const deleteChannelConversation = async function (conversation, ctx) {

  while (true) {
    await ctx.reply("Хорошо, для удаления канала - отправь ссылку на канал или его @username.");

    const answerMessage = await conversation.wait();
    const text = answerMessage?.message?.text;

    if (isUserName(text)) {
      await ctx.reply(`Ты отправил юзернейм! Удаляю ` + text);
      try {
        deleteChannel(text);
      } catch (err) {
        await ctx.reply(`Кажется что-то пошло не так: ${err.message}`);
      }
      break;
    } else {
      await ctx.reply("Я не смог разобрать сообщение, оно не похоже на юзернейм. Отправь в формате @durov !");
    }
  }
};

export { deleteChannelConversation };

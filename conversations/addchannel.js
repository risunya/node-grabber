import { addChannel } from "../data/index.js";
import { tg } from "../index.js";
import { calculateChannelId, isUrl, isUserName, linkToUserName, userNameToLink } from "../utils/helpers.js";

const addToDB = async (ctx, channelNameFrom, channelNameTo) => {
	try {
		const e = await tg.resolveChannel(channelNameFrom);
		const channelIdFrom = calculateChannelId(e.channelId)
		const linkFrom = userNameToLink(channelNameFrom)

		const f = await tg.resolveChannel(channelNameTo);
		const channelIdTo = calculateChannelId(f.channelId)
		const linkTo = userNameToLink(channelNameTo)
		addChannel(ctx, channelNameFrom, linkFrom, channelIdFrom, channelNameTo, linkTo, channelIdTo);
	} catch (err) {
		await ctx.reply(`Ошибка при получении данных: ${err.message}. (это означает, что такого канала скорее всего не существует)`);
	}
}

const addChannelConversation = async function (conversation, ctx) {

  while (true) {
    await ctx.reply("Хорошо, для добавления канала - отправь ссылку на канал или его @username.");

    const answerMessage = await conversation.wait();
    const channelNameFrom = answerMessage?.message?.text;

    if (isUrl(channelNameFrom)) {
      const name = linkToUserName(channelNameFrom);

      await ctx.reply(`Ты отправил ссылку! ` + channelNameFrom + ` (${name})\n` + `Теперь отправь юзернейм или id канала, куда бот будет пересылать данную новость! Если ты хочешь пероесылать новость в несколько каналов сразу, то напиши каналы через запятую: @durov,@durov !`, {
			link_preview_options: {is_disabled: true},
			});
				const secondAnswerMessage = await conversation.wait();
				const channelNameTo = secondAnswerMessage?.message?.text;
 
				if (isUserName(channelNameTo)) {
					await addToDB(ctx, channelNameFrom, channelNameTo)
      		break;
				} else {
					await addToDB(ctx, channelNameFrom, channelNameTo)
      		break;
				}

    } else if (isUserName(channelNameFrom)) {
      const url = userNameToLink(channelNameFrom);

      await ctx.reply(`Ты отправил юзернейм\n` + channelNameFrom + ` (${url})\n` + `Теперь отправь юзернейм или id канала, куда бот будет пересылать данную новость! Если ты хочешь пероесылать новость в несколько каналов сразу, то напиши каналы через запятую: @durov,@durov !`, 
				{link_preview_options: {is_disabled: true}},
			);
			const secondAnswerMessage = await conversation.wait();
			const channelNameTo = secondAnswerMessage?.message?.text;
			
			if (isUserName(channelNameTo)) {
				await addToDB(ctx, channelNameFrom, channelNameTo)
				break;
			} else {
				await addToDB(ctx, channelNameFrom, channelNameTo)
				break;
			}
      
    } else {
      await ctx.reply("Я не смог разобрать сообщение, оно не похоже на ссылку или юзернейм. Отправь в формате https://t.me/durov или @durov !");
    }
  }
};

export { addChannelConversation, addToDB };

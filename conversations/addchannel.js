import { addChannel } from "../data/index.js";
import { tg } from "../index.js";
import { calculateChannelId, isUrl, isUserName, linkToUserName, userNameToLink } from "../utils/helpers.js";

const addToDB = async (ctx, channelNameFrom, channelNameTo) => {
	channelNameTo.toString()
	try {
		let e = ''
		let channelIdFrom = 0
		if (channelNameFrom.includes('bot')) {
			e = await tg.getUser(channelNameFrom);
			channelIdFrom = e.id
		} else {
			e = await tg.resolveChannel(channelNameFrom);
			channelIdFrom = calculateChannelId(e.channelId)
		}
		const linkFrom = userNameToLink(channelNameFrom)

		let channelIdTo = []
		let linkTo = []
		if (/,/.test(channelNameTo)) {
			//если linkTo не 1 username
			const channels = (channelNameTo.replace(/ /g,'')).split(',')
			channelIdTo = await Promise.all(
				channels.map(async (el) => {
						const e = await tg.resolveChannel(el);
						const calculatedId = calculateChannelId(e.channelId);
						return calculatedId;
				}));
				linkTo = await Promise.all(
					channels.map(async (el) => {
						return userNameToLink(el)
				}))
		} else {
			const f = await tg.resolveChannel(channelNameTo);
			channelIdTo.push(calculateChannelId(f.channelId))
			linkTo.push(userNameToLink(channelNameTo))
		}

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

      await ctx.reply(`Ты отправил ссылку! ` + channelNameFrom + ` (${name})\n` + `Теперь отправь юзернейм, куда бот будет пересылать данную новость! Если ты хочешь пероесылать новость в несколько каналов сразу, то напиши каналы через запятую: @novostigrabber,@nodegrabber !`, {
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

      await ctx.reply(`Ты отправил юзернейм\n` + channelNameFrom + ` (${url})\n` + `Теперь отправь юзернейм или id канала, куда бот будет пересылать данную новость!\n\nЕсли ты хочешь пересылать новость в несколько каналов сразу, то напиши каналы через запятую: @novostigrabber,@nodegrabber !`, 
				{link_preview_options: {is_disabled: true}},
			);
			const secondAnswerMessage = await conversation.wait();
			const channelNameTo = secondAnswerMessage?.message?.text;
			
			if (isUserName(channelNameTo)) {
				await ctx.reply('Запись добавлена!')
				await addToDB(ctx, channelNameFrom, channelNameTo)
				break;
			} else {
				await ctx.reply('Запись добавлена!')
				await addToDB(ctx, channelNameFrom, channelNameTo)
				break;
			}
      
    } else {
      await ctx.reply("Я не смог разобрать сообщение, оно не похоже на ссылку или юзернейм. Отправь в формате https://t.me/durov или @durov !");
    }
  }
};

export { addChannelConversation, addToDB };

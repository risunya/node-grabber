import { addChannel } from "../data/index.js";
import { tg } from "../index.js";
import { calculateChannelId, isUrl, isUserName, linkToUserName, userNameToLink } from "../utils/helpers.js";
import { InlineKeyboard } from "grammy";

const addToDB = async (ctx, channelNameFrom, channelNameTo, filterWords = []) => {
    channelNameTo.toString();
    try {
        let e = '';
        let channelIdFrom = 0;
        if ((channelNameFrom.toLowerCase()).includes('bot')) {
            e = await tg.getUser(channelNameFrom);
            channelIdFrom = e.id;
        } else {
            e = await tg.resolveChannel(channelNameFrom);
            channelIdFrom = calculateChannelId(e.channelId);
        }
        const linkFrom = userNameToLink(channelNameFrom);

        let channelIdTo = [];
        let linkTo = [];
        if (/,/.test(channelNameTo)) {
            const channels = (channelNameTo.replace(/ /g,'')).split(',');
            channelIdTo = await Promise.all(
                channels.map(async (el) => {
                    const e = await tg.resolveChannel(el);
                    const calculatedId = calculateChannelId(e.channelId);
                    return calculatedId;
                }));
            linkTo = await Promise.all(
                channels.map(async (el) => {
                    return userNameToLink(el);
                }));
        } else {
            const f = await tg.resolveChannel(channelNameTo);
            channelIdTo.push(calculateChannelId(f.channelId));
            linkTo.push(userNameToLink(channelNameTo));
        }

        await addChannel(ctx, channelNameFrom, linkFrom, channelIdFrom, channelNameTo, linkTo, channelIdTo, filterWords);
        await ctx.reply('Запись добавлена!');
    } catch (err) {
        await ctx.reply(`Ошибка при получении данных: ${err.message}. (это означает, что такого канала скорее всего не существует)`);
    }
};

const addChannelConversation = async function (conversation, ctx) {
    while (true) {
        await ctx.reply("Хорошо, для добавления канала - отправь ссылку на канал или его @username.");

        const answerMessage = await conversation.wait();
        const channelNameFrom = answerMessage?.message?.text;

        if (isUrl(channelNameFrom) || isUserName(channelNameFrom)) {
            const name = isUrl(channelNameFrom) ? linkToUserName(channelNameFrom) : channelNameFrom;
            const url = isUrl(channelNameFrom) ? channelNameFrom : userNameToLink(channelNameFrom);

            await ctx.reply(`Ты отправил ${isUrl(channelNameFrom) ? 'ссылку' : 'юзернейм'}! ${name} (${url})\n` +
                `Теперь отправь юзернейм, куда бот будет пересылать данную новость! Если ты хочешь пересылать новость в несколько каналов сразу, то напиши каналы через запятую: @novostigrabber,@nodegrabber !`, {
                link_preview_options: { is_disabled: true }
            });

            const secondAnswerMessage = await conversation.wait();
            const channelNameTo = secondAnswerMessage?.message?.text;

            if (isUserName(channelNameTo) || /,/.test(channelNameTo)) {
                const keyboard = new InlineKeyboard()
                    .text("Фильтры не нужны", "no_filters");

                await ctx.reply(
                    `Отлично! Теперь отправь слова-фильтры через запятую (например: реклама,спам,продам) или нажми кнопку, если фильтры не нужны:`, 
                    { reply_markup: keyboard }
                );

                const filterResponse = await conversation.wait();
                
                if (filterResponse?.message?.text) {
                    const filterWords = filterResponse.message.text.split(',').map(word => word.trim());
                    await addToDB(ctx, channelNameFrom, channelNameTo, filterWords);
                    break;
                } else if (filterResponse?.callbackQuery?.data === "no_filters") {
                    await addToDB(ctx, channelNameFrom, channelNameTo, []);
                    await filterResponse.answerCallbackQuery();
                    break;
                } else {
                    await ctx.reply("Пожалуйста, отправь слова-фильтры через запятую или нажми кнопку 'Фильтры не нужны'");
                }
            } else {
                await ctx.reply("Пожалуйста, отправь корректный юзернейм или список юзернеймов через запятую!");
            }
        } else {
            await ctx.reply("Я не смог разобрать сообщение, оно не похоже на ссылку или юзернейм. Отправь в формате https://t.me/durov или @durov !");
        }
    }
};

export { addChannelConversation, addToDB };
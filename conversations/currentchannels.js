import { getChannelsData } from "../data/index.js"

const sendCurrentChannels = () => {
	const data = getChannelsData()
	const text = (data.length == 0 ? 'В данный момент отслеживается 0 каналов.' : 
		(data.map((e) => {
			return `Канал ${e.channelNameFrom} -> ( ${(e.channelNameTo).split(',').map((el) => {
				return (el + ' ')
			})})\n Исключения: (${e.filterWords})\n` 
		}).toString()).replace(/,/g, '')
	)
	return text 
}
const currentChannelsConversation = async function (conversation, ctx) {
	ctx.reply(sendCurrentChannels())
}

export {
	currentChannelsConversation,
	sendCurrentChannels
}
import { getChannelsData } from "../data/index.js"

const currentChannelsConversation = async function (conversation, ctx) {
	const data = getChannelsData()
	const text = (data.length == 0 ? 'В данный момент отслеживается 0 каналов.' : data
		//(data.map((e) => {
		//	return `Канал ${e.name} перенаправляем в ${e.forwardTo}\n` 
		//}).toString()).replace(/,/g, '')
	)
	await ctx.reply(text) 
}

export {
	currentChannelsConversation
}
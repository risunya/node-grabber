const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const botApi = process.env.BOT_TOKEN;
const userId = process.env.USER_ID;
const groupId = process.env.GROUP_ID
const devUserId = process.env.DEV_USER_ID

if (!apiId || !apiHash || !botApi || !userId || !devUserId) {
	throw new Error('API_ID, API_HASH, BOT_TOKEN, USER_ID должны быть установлены в переменных окружения');
}

export {
	apiId,
	apiHash,
	botApi,
	userId,
	groupId,
	devUserId
}
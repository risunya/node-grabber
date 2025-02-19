const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const botApi = process.env.BOT_TOKEN;
const userId = process.env.USER_ID;

if (!apiId || !apiHash || !botApi || !userId) {
	throw new Error('API_ID, API_HASH, BOT_TOKEN, USER_ID должны быть установлены в переменных окружения');
}

export {
	apiId,
	apiHash,
	botApi,
	userId,
}
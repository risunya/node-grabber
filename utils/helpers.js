const linkToUserName = (e) => {
	return e.split('/').pop();
}

const userNameToLink = (e) => {
	return `https://t.me/${e.replace('@', '')}`;
}

/// для получения нормального id с доки https://mtcute.dev/guide/topics/peers#marked-ids
const calculateChannelId = (e) => {
	return (-1000000000000 - Number(e)).toFixed(0);
}

const isUrl = (e) => {
	return (/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/).test(e);
}

const isUserName = (e) => {
	return e.startsWith('@');
}

export {
	linkToUserName,
	userNameToLink,
	calculateChannelId,
	isUrl,
	isUserName
}
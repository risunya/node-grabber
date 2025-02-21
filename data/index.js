import Database from 'better-sqlite3';

const db = new Database('./data/channels.db');

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY,
        channelNameFrom TEXT NOT NULL UNIQUE,
        linkFrom TEXT NOT NULL UNIQUE,
				channelIdFrom TEXT NOT NULL UNIQUE,
				channelNameTo TEXT NOT NULL,
				linkTo TEXT NOT NULL,
				channelIdTo TEXT NOT NULL
    )
`;

db.exec(createTableQuery);

// Подготовка запроса для вставки данных
const insert = db.prepare('INSERT INTO channels (channelNameFrom, linkFrom, channelIdFrom, channelNameTo, linkTo, channelIdTo) VALUES (?, ?, ?, ?, ?, ?)');

// Подготовка запроса для удаления данных по id
const deleteByName = db.prepare('DELETE FROM channels WHERE channelNameFrom = ?');

// Подготовка запроса для изменения данных по id
//const updateById = db.prepare('UPDATE channels SET name = ?, link = ? WHERE channelId = ?');
//updateById.run('new_hello', 'https://example.com/new_hello', 1);

const findById = db.prepare('SELECT * FROM channels WHERE channelIdFrom = ?');

const getChannelsData = () => {
	return db.prepare('SELECT * FROM channels').all()
}

const addChannel = async (ctx, channelNameFrom, linkFrom, channelIdFrom, channelNameTo, linkTo, channelIdTo) => {
	try {
		insert.run(channelNameFrom, linkFrom, channelIdFrom, channelNameTo, linkTo, channelIdTo)
	} catch (error) {
		ctx.reply('Кажется, что такая запись уже существует!')
	}
}

const deleteChannel = (name) => {
	deleteByName.run(name)
}

const whereToSend = (id) => {
	findById.run(id)
}
export {
	db,
	getChannelsData,
	addChannel,
	deleteChannel,
	whereToSend
}

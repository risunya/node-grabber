import Database from 'better-sqlite3';

const db = new Database('./data/channels.db');

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS channels (
        channelNameFrom TEXT NOT NULL UNIQUE PRIMARY KEY,
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

// удаление строки данных по id
const deleteByName = db.prepare('DELETE FROM channels WHERE channelNameFrom = ?');


// получение всех данных из таблицы
const getChannelsData = () => {
	return db.prepare('SELECT * FROM channels').all()
}

const addChannel = async (ctx, channelNameFrom, linkFrom, channelIdFrom, channelNameTo, linkTo, channelIdTo) => {
	try {
		insert.run(channelNameFrom, linkFrom, channelIdFrom, channelNameTo, linkTo.toString(), channelIdTo.toString())
	} catch (error) {
		ctx.reply('Кажется, что такая запись уже существует!')
	}
}

const deleteChannel = (name) => {
	deleteByName.run(name)
}

export {
	db,
	getChannelsData,
	addChannel,
	deleteChannel
}

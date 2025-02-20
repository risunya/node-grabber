import Database from 'better-sqlite3';

const db = new Database('./data/channels.db');

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        link TEXT NOT NULL UNIQUE,
				channelId TEXT NOT NULL UNIQUE,
				forwardTo TEXT NOT NULL
    )
`;

db.exec(createTableQuery);

// Подготовка запроса для вставки данных
const insert = db.prepare('INSERT INTO channels (name, link, channelId, forwardTo ) VALUES (?, ?, ?, ?)');

// Подготовка запроса для удаления данных по id
const deleteByName = db.prepare('DELETE FROM channels WHERE name = ?');

// Подготовка запроса для изменения данных по id
const updateById = db.prepare('UPDATE channels SET name = ?, link = ? WHERE channelId = ?');
//updateById.run('new_hello', 'https://example.com/new_hello', 1);

const findById = db.prepare('SELECT * FROM channels WHERE id = ?');


const getChannelsData = () => {
	return db.prepare('SELECT * FROM channels').all()
}

const addChannel = async (name, link, channelId, forwardTo) => {
	insert.run(name, link, channelId, forwardTo)
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

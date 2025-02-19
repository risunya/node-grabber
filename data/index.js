import Database from 'better-sqlite3';

const db = new Database('./data/channels.db');

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        link TEXT NOT NULL UNIQUE
				id TEXT NOT NULL UNIQUE
    )
`;

if (!db) {
	db.exec(createTableQuery);
}

// Подготовка запроса для вставки данных
const insert = db.prepare('INSERT INTO channels (name, link, id ) VALUES (?, ?, ?)');

// Подготовка запроса для удаления данных по id
const deleteByName = db.prepare('DELETE FROM channels WHERE name = ?');

// Подготовка запроса для изменения данных по id
const updateById = db.prepare('UPDATE channels SET name = ?, link = ? WHERE id = ?');
//updateById.run('new_hello', 'https://example.com/new_hello', 1);

const getChannelsData = () => {
	return db.prepare('SELECT * FROM channels').all()
}

const addChannel = async (name, link, id) => {
	insert.run(name, link, id)
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

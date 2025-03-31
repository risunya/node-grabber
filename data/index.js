import Database from 'better-sqlite3';
import { joinChats } from '../index.js';

const db = new Database('./data/channels.db');
const sdb = new Database('./data/settings.db');

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

const createSettingsTableQuery = `
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL CHECK (value IN (0, 1))
    );

    INSERT INTO settings (key, value) VALUES  
    ('quoting', 1),
		('logs', 1)
    ON CONFLICT(key) DO NOTHING;
`;

db.exec(createTableQuery);
sdb.exec(createSettingsTableQuery);

// Работа с channels (db)
const insert = db.prepare('INSERT INTO channels (channelNameFrom, linkFrom, channelIdFrom, channelNameTo, linkTo, channelIdTo) VALUES (?, ?, ?, ?, ?, ?)');

const deleteByName = db.prepare('DELETE FROM channels WHERE channelNameFrom = ?');

const getChannelsData = () => {
	return db.prepare('SELECT * FROM channels').all()
}

const addChannel = async (ctx, channelNameFrom, linkFrom, channelIdFrom, channelNameTo, linkTo, channelIdTo) => {
	try {
		insert.run(channelNameFrom, linkFrom, String(channelIdFrom), channelNameTo, linkTo.toString(), channelIdTo.toString())
		joinChats()
	} catch (error) {
		ctx.reply('Кажется, что такая запись уже существует!')
	}
}

const deleteChannel = (name) => {
	deleteByName.run(name)
}

// Работа с settings (sdb)
const getSettingsData = () => {
	return sdb.prepare('SELECT * FROM settings').all()
}

const updateByKey = sdb.prepare(`UPDATE settings SET value = ? WHERE key = ?`)

const updateSettings = (key, value) => {
	return updateByKey.run(value, key)
}

const searchByKey = sdb.prepare('SELECT * FROM settings WHERE key = ?');

const getSettingsValue = (key) => {
	return searchByKey.get(key).value ? 1 : 0
}


export {
	db,
	getChannelsData,
	addChannel,
	deleteChannel,
	getSettingsData,
	updateSettings,
	getSettingsValue
}

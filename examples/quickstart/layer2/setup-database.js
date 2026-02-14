// Setup script: creates the database and table for the Meadow example.
const libMySQL = require('mysql2');

const MYSQL_CONFIG =
	{
		host: '127.0.0.1',
		port: 3306,
		user: 'root',
		password: '123456789'
	};

const tmpConnection = libMySQL.createConnection(MYSQL_CONFIG);

const tmpStatements =
	[
		`CREATE DATABASE IF NOT EXISTS retold_quickstart;`,
		`USE retold_quickstart;`,
		`CREATE TABLE IF NOT EXISTS Book
		(
			IDBook INT UNSIGNED NOT NULL AUTO_INCREMENT,
			GUIDBook CHAR(36) DEFAULT '0x0',
			CreateDate DATETIME,
			CreatingIDUser INT NOT NULL DEFAULT 0,
			UpdateDate DATETIME,
			UpdatingIDUser INT NOT NULL DEFAULT 0,
			Deleted TINYINT NOT NULL DEFAULT 0,
			DeletingIDUser INT NOT NULL DEFAULT 0,
			DeleteDate DATETIME,
			Title CHAR(200) NOT NULL DEFAULT '',
			Author CHAR(200) NOT NULL DEFAULT '',
			YearPublished INT NOT NULL DEFAULT 0,
			PRIMARY KEY (IDBook)
		) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
	];

let tmpIndex = 0;

function runNext()
{
	if (tmpIndex >= tmpStatements.length)
	{
		console.log('Database setup complete.');
		tmpConnection.end();
		return;
	}

	tmpConnection.query(tmpStatements[tmpIndex],
		function (pError)
		{
			if (pError)
			{
				console.error(`Error running statement ${tmpIndex}:`, pError.message);
				tmpConnection.end();
				process.exit(1);
			}
			tmpIndex++;
			runNext();
		});
}

runNext();

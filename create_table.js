const { pool } = require('./db/connect');

async function createTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_elo (
                username VARCHAR(255) NOT NULL,
                track_id INTEGER NOT NULL,
                elo_score INTEGER NOT NULL,
                PRIMARY KEY (username, track_id)
            );
        `);
        console.log("Table created successfully");
    } catch (e) {
        console.error("Error creating table:", e);
    }
    process.exit(0);
}
createTable();

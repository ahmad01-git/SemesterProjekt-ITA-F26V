const { pool } = require('./db/connect');

async function run() {
    try {
        const username = 'Casper';
        const mixtapeName = 'test';
        const resultat = await pool.query(
            `SELECT t.*, um.mixtape_name, ue.elo_score as user_elo_rating 
             FROM user_mixtapes um 
             JOIN tracks t ON t.id = um.track_id 
             LEFT JOIN user_elo ue ON ue.track_id = t.id AND ue.username = um.username
             WHERE um.username = $1 AND um.mixtape_name = $2
             ORDER BY COALESCE(ue.elo_score, t.elo_rating) DESC`,
            [username, mixtapeName]
        );
        console.log(resultat.rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();

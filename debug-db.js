require('dotenv').config();
const mysql = require('mysql2/promise');

async function debug() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS,
        database: process.env.DB_NAME || 'phone_news_db'
    });

    console.log('🔍 Database Debug Info:\n');

    // Total articles
    const [total] = await db.execute('SELECT COUNT(*) as count FROM articles');
    console.log(`Total Articles: ${total[0].count}`);

    // By status
    const [byStatus] = await db.execute(`
        SELECT approval_status, status, COUNT(*) as count 
        FROM articles 
        GROUP BY approval_status, status
    `);
    console.log('\nBy Status:');
    byStatus.forEach(row => {
        console.log(`  ${row.approval_status} / ${row.status}: ${row.count}`);
    });

    // Recent articles
    const [recent] = await db.execute(`
        SELECT id, title, approval_status, status, created_at 
        FROM articles 
        ORDER BY created_at DESC 
        LIMIT 5
    `);
    console.log('\nRecent Articles:');
    recent.forEach(row => {
        console.log(`  ${row.id}. ${row.title.substring(0, 50)}...`);
        console.log(`     Status: ${row.approval_status} / ${row.status}`);
    });

    // Check news_sources
    const [sources] = await db.execute('SELECT COUNT(*) as count FROM news_sources');
    console.log(`\nNews Sources Tracked: ${sources[0].count}`);

    await db.end();
}

debug().catch(console.error);
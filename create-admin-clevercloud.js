require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createAdmin() {
    console.log('🔌 Connecting to Clever Cloud MySQL...');

    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: false,
        connectTimeout: 30000
    });

    console.log('✅ Connected!');

    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await db.execute('DELETE FROM users WHERE username = ?', ['admin']);

        await db.execute(
            `INSERT INTO users 
            (username, email, password, full_name, role, status, email_verified) 
            VALUES (?, ?, ?, ?, 'admin', 'active', TRUE)`,
            ['admin', 'admin@phoneverse.com', hashedPassword, 'Admin User']
        );

        console.log('\n✅ Admin user created!');
        console.log('   Username: admin');
        console.log(`   Password: ${password}`);
        console.log('\n🔗 Login at: https://your-domain.com/admin.html\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    await db.end();
}

createAdmin();
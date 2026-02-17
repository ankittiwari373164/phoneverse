require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function createAdmin() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS,
        database: process.env.DB_NAME || 'phone_news_db'
    });

    console.log('✅ Connected to database');

    // Hash password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('\n📝 Creating admin user...');
    console.log('Username: admin');
    console.log('Password: admin123');

    try {
        // Delete existing admin if any
        await db.execute('DELETE FROM users WHERE username = ?', ['admin']);

        // Insert new admin
        await db.execute(
            `INSERT INTO users (username, email, password, full_name, role, status, email_verified) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['admin', 'admin@phoneverse.com', hashedPassword, 'Admin User', 'admin', 'active', true]
        );

        console.log('\n✅ Admin user created successfully!');
        console.log('\nLogin credentials:');
        console.log('  Username: admin');
        console.log('  Password: admin123');
        console.log('\nLogin at: http://localhost:3000/admin.html\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    await db.end();
}

createAdmin();
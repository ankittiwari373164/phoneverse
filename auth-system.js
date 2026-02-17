const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

class AuthSystem {
    constructor(db) {
        this.db = db;
    }

    // Register new user
    async register(userData) {
        try {
            const { username, email, password, full_name } = userData;

            // Check if user exists
            const [existing] = await this.db.execute(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );

            if (existing.length > 0) {
                throw new Error('Username or email already exists');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // Insert user
            const [result] = await this.db.execute(
                `INSERT INTO users (username, email, password, full_name, role, status) 
                VALUES (?, ?, ?, ?, 'user', 'active')`,
                [username, email, hashedPassword, full_name]
            );

            return {
                id: result.insertId,
                username,
                email,
                full_name
            };

        } catch (error) {
            throw error;
        }
    }

    // Login user
    async login(username, password) {
        try {
            const [users] = await this.db.execute(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, username]
            );

            if (users.length === 0) {
                throw new Error('Invalid credentials');
            }

            const user = users[0];

            // Check if account is active
            if (user.status !== 'active') {
                throw new Error('Account is suspended or pending approval');
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                throw new Error('Invalid credentials');
            }

            // Update last login
            await this.db.execute(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [user.id]
            );

            // Generate token
            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username, 
                    role: user.role 
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Save session
            await this.db.execute(
                `INSERT INTO user_sessions (user_id, session_token, expires_at) 
                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
                [user.id, token]
            );

            return {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    profile_image: user.profile_image
                },
                token
            };

        } catch (error) {
            throw error;
        }
    }

    // Verify token
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // Check if session exists
            const [sessions] = await this.db.execute(
                'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > NOW()',
                [token]
            );

            if (sessions.length === 0) {
                throw new Error('Invalid or expired session');
            }

            // Get user
            const [users] = await this.db.execute(
                'SELECT id, username, email, full_name, role, profile_image FROM users WHERE id = ? AND status = "active"',
                [decoded.id]
            );

            if (users.length === 0) {
                throw new Error('User not found');
            }

            return users[0];

        } catch (error) {
            throw error;
        }
    }

    // Logout
    async logout(token) {
        try {
            await this.db.execute(
                'DELETE FROM user_sessions WHERE session_token = ?',
                [token]
            );
        } catch (error) {
            throw error;
        }
    }

    // Get user profile
    async getUserProfile(userId) {
        try {
            const [users] = await this.db.execute(
                `SELECT id, username, email, full_name, bio, profile_image, role, 
                        article_count, total_views, created_at, last_login
                FROM users WHERE id = ?`,
                [userId]
            );

            if (users.length === 0) {
                throw new Error('User not found');
            }

            return users[0];

        } catch (error) {
            throw error;
        }
    }

    // Update user profile
    async updateProfile(userId, updates) {
        try {
            const { full_name, bio, profile_image } = updates;

            await this.db.execute(
                `UPDATE users SET full_name = ?, bio = ?, profile_image = ? 
                WHERE id = ?`,
                [full_name, bio, profile_image, userId]
            );

            return await this.getUserProfile(userId);

        } catch (error) {
            throw error;
        }
    }
}

// Middleware to protect routes
function authenticateUser(req, res, next) {
    const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

module.exports = {
    AuthSystem,
    authenticateUser,
    requireAdmin,
    JWT_SECRET
};
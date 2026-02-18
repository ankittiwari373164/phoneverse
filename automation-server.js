require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const cookieParser = require('cookie-parser');
const { FreeNewsAggregator } = require('./free-news-scraper');
const ImageGenerator = require('./image-generator');
const GroqRewriter = require('./groq-rewriter');
const GeminiRewriter = require('./gemini-rewriter');
const { AuthSystem, authenticateUser, requireAdmin } = require('./auth-system');

// ==================== CONFIGURATION ====================
const CONFIG = {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASS: process.env.DB_PASS,
    DB_NAME: process.env.DB_NAME || 'phone_news_db',
    PORT: process.env.PORT || 3000,
    CHECK_NEWS_EVERY: process.env.CHECK_NEWS_EVERY || '*/10 * * * *',
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    AUTO_APPROVE: process.env.AUTO_APPROVE === 'true',
    NODE_ENV: process.env.NODE_ENV || 'development'
};

// ==================== DATABASE CONNECTION ====================
let db;
let authSystem;

async function connectDB() {
    try {
        const isProduction = CONFIG.NODE_ENV === 'production';

        db = await mysql.createConnection({
            host: CONFIG.DB_HOST,
            user: CONFIG.DB_USER,
            password: CONFIG.DB_PASS,
            database: CONFIG.DB_NAME,
            ssl: isProduction ? { rejectUnauthorized: true } : false,
            connectTimeout: 60000
        });

        console.log('✅ Database connected');
        await db.execute('SELECT 1');

        // Keep DB connection alive every 30 seconds
        setInterval(async () => {
            try {
                await db.execute('SELECT 1');
            } catch (err) {
                console.log('🔄 Reconnecting to database...');
                try {
                    await connectDB();
                } catch (reconnectErr) {
                    console.error('❌ Reconnect failed:', reconnectErr.message);
                }
            }
        }, 30000);

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

// ==================== ARTICLE PUBLISHER ====================
class ArticlePublisher {
    async publish(article, isManual = false, userId = null, authorName = null) {
        try {
            const slug = this.generateSlug(article.title);

            const isDupe = await this.isDuplicate(article.title, article.sourceUrl);
            if (isDupe) {
                console.log(`⏭️  Duplicate skipped: ${article.title.substring(0, 50)}...`);
                return null;
            }

            const autoApprove = CONFIG.AUTO_APPROVE;
            const approvalStatus = autoApprove ? 'approved' : 'pending';
            const status = autoApprove ? 'published' : 'draft';

            const [result] = await db.execute(
                `INSERT INTO articles 
                (title, slug, content, meta_description, category, featured_image, 
                 source_url, status, approval_status, is_manual, published_at, author_id, 
                 approved_by, approved_at, user_id, author_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1, ?, ?, ?, ?)`,
                [
                    article.title,
                    slug,
                    article.content,
                    article.title.substring(0, 160),
                    article.category,
                    article.image,
                    article.sourceUrl || '',
                    status,
                    approvalStatus,
                    isManual,
                    autoApprove ? 1 : null,
                    autoApprove ? new Date() : null,
                    userId,
                    authorName
                ]
            );

            const statusMsg = autoApprove ? '✅ Published' : '💾 Saved for approval';
            console.log(`${statusMsg}: ${article.title.substring(0, 50)}...`);

            if (article.sourceUrl) {
                try {
                    await db.execute(
                        'INSERT INTO news_sources (original_url, original_title, processed, article_id) VALUES (?, ?, 1, ?)',
                        [article.sourceUrl, article.title, result.insertId]
                    );
                } catch (err) {
                    // Ignore duplicate source URL errors
                }
            }

            if (userId) {
                await db.execute(
                    'UPDATE users SET article_count = article_count + 1 WHERE id = ?',
                    [userId]
                );
            }

            return result.insertId;

        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                console.log(`⏭️  Duplicate entry: ${article.title.substring(0, 50)}...`);
                return null;
            }
            console.error('❌ Publish error:', error.message);
            return null;
        }
    }

    async approve(articleId, adminId = 1) {
        try {
            const [result] = await db.execute(
                `UPDATE articles SET 
                approval_status = 'approved',
                status = 'published',
                approved_by = ?,
                approved_at = NOW()
                WHERE id = ?`,
                [adminId, articleId]
            );

            if (result.affectedRows > 0) {
                console.log(`✅ Article ${articleId} approved`);

                const [articles] = await db.execute(
                    'SELECT user_id FROM articles WHERE id = ?',
                    [articleId]
                );

                if (articles.length > 0 && articles[0].user_id) {
                    await this.updateUserStats(articles[0].user_id);
                }

                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Approve error:', error.message);
            return false;
        }
    }

    async reject(articleId, reason = 'Quality issues') {
        try {
            await db.execute(
                `UPDATE articles SET 
                approval_status = 'rejected',
                status = 'draft',
                rejection_reason = ?
                WHERE id = ?`,
                [reason, articleId]
            );
            console.log(`❌ Article ${articleId} rejected: ${reason}`);
            return true;
        } catch (error) {
            console.error('❌ Reject error:', error.message);
            return false;
        }
    }

    async delete(articleId) {
        try {
            const [articles] = await db.execute(
                'SELECT user_id FROM articles WHERE id = ?',
                [articleId]
            );

            await db.execute('DELETE FROM articles WHERE id = ?', [articleId]);
            console.log(`🗑️  Article ${articleId} deleted`);

            if (articles.length > 0 && articles[0].user_id) {
                await db.execute(
                    'UPDATE users SET article_count = article_count - 1 WHERE id = ? AND article_count > 0',
                    [articles[0].user_id]
                );
            }

            return true;
        } catch (error) {
            console.error('❌ Delete error:', error.message);
            return false;
        }
    }

    async updateUserStats(userId) {
        try {
            const [stats] = await db.execute(
                `SELECT COUNT(*) as count, COALESCE(SUM(views), 0) as total_views
                FROM articles 
                WHERE user_id = ? AND approval_status = 'approved'`,
                [userId]
            );

            await db.execute(
                'UPDATE users SET article_count = ?, total_views = ? WHERE id = ?',
                [stats[0].count, stats[0].total_views, userId]
            );
        } catch (error) {
            console.error('❌ Update user stats error:', error.message);
        }
    }

    generateSlug(title) {
        const baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 80);

        const timestamp = Date.now().toString(36);
        return `${baseSlug}-${timestamp}`;
    }

    async isDuplicate(title, sourceUrl) {
        try {
            if (sourceUrl && sourceUrl.trim() !== '') {
                const [urlResults] = await db.execute(
                    'SELECT id FROM articles WHERE source_url = ? LIMIT 1',
                    [sourceUrl]
                );
                if (urlResults.length > 0) return true;

                const [sourceResults] = await db.execute(
                    'SELECT id FROM news_sources WHERE original_url = ? LIMIT 1',
                    [sourceUrl]
                );
                if (sourceResults.length > 0) return true;
            }

            const [titleResults] = await db.execute(
                'SELECT id FROM articles WHERE title = ? LIMIT 1',
                [title]
            );
            if (titleResults.length > 0) return true;

            const titlePrefix = title.substring(0, 40);
            const [similarResults] = await db.execute(
                'SELECT id FROM articles WHERE title LIKE ? LIMIT 1',
                [`${titlePrefix}%`]
            );

            return similarResults.length > 0;

        } catch (error) {
            console.error('❌ Duplicate check error:', error.message);
            return false;
        }
    }
}

// ==================== AUTOMATION ENGINE ====================
class AutomationEngine {
    constructor() {
        this.newsAggregator = new FreeNewsAggregator();

        // Priority: Gemini > Groq > Basic
        if (CONFIG.GEMINI_API_KEY && process.env.USE_GEMINI === 'true') {
            this.contentRewriter = new GeminiRewriter(CONFIG.GEMINI_API_KEY);
            console.log('✅ Using Gemini AI (FREE) for content rewriting');
        } else if (CONFIG.GROQ_API_KEY && process.env.USE_GROQ === 'true') {
            this.contentRewriter = new GroqRewriter(CONFIG.GROQ_API_KEY);
            console.log('✅ Using Groq AI (FREE) for content rewriting');
        } else {
            console.log('⚠️  No AI configured - using basic rewriter');
            this.contentRewriter = {
                rewriteWithPersonality: async (title, content, category) => ({
                    title: title,
                    content: `<p>${content}</p>`,
                    wordCount: content.split(' ').length
                })
            };
        }

        this.imageGenerator = new ImageGenerator();
        this.publisher = new ArticlePublisher();
        this.processing = false;
    }

    async processNews() {
        if (this.processing) {
            console.log('⏸️  Already processing, skipping...');
            return;
        }

        this.processing = true;
        console.log('\n🚀 Starting news processing...');

        try {
            const newsItems = await this.newsAggregator.fetchAllNews();

            if (newsItems.length === 0) {
                console.log('ℹ️  No recent news found');
                this.processing = false;
                return;
            }

            console.log(`📰 Found ${newsItems.length} recent articles, processing...`);

            let savedCount = 0;
            let skippedCount = 0;
            let processedCount = 0;
            const targetSaves = 10;

            for (const news of newsItems) {
                if (savedCount >= targetSaves) {
                    console.log(`\n✅ Target reached: ${savedCount} articles saved`);
                    break;
                }

                if (processedCount >= 50) {
                    console.log(`\n⚠️  Processed 50 articles, stopping batch`);
                    break;
                }

                processedCount++;

                try {
                    console.log(`\n[${processedCount}/${newsItems.length}] Processing: ${news.originalTitle.substring(0, 60)}...`);

                    const rewritten = await this.contentRewriter.rewriteWithPersonality(
                        news.originalTitle,
                        news.originalContent,
                        news.category
                    );

                    const imagePath = await this.imageGenerator.createFeaturedImage(
                        rewritten.title,
                        news.category
                    );

                    const articleId = await this.publisher.publish({
                        title: rewritten.title,
                        content: rewritten.content,
                        category: news.category,
                        image: imagePath,
                        sourceUrl: news.sourceUrl
                    }, false);

                    if (articleId) {
                        savedCount++;
                        automationStatus.articlesProcessed++;
                        console.log(`✅ Saved (${savedCount}/${targetSaves})`);
                    } else {
                        skippedCount++;
                    }

                    await this.sleep(2000);

                } catch (error) {
                    console.error(`❌ Error processing: ${error.message}`);
                    skippedCount++;
                    continue;
                }
            }

            const autoApproveMsg = CONFIG.AUTO_APPROVE ? ' and published' : ' for approval';
            console.log(`\n✅ Batch complete!`);
            console.log(`   📊 Processed: ${processedCount} articles`);
            console.log(`   ✅ Saved: ${savedCount}${autoApproveMsg}`);
            console.log(`   ⏭️  Skipped: ${skippedCount} (duplicates)`);
            console.log(`   📰 Remaining: ${newsItems.length - processedCount} in queue`);

        } catch (error) {
            console.error('❌ Automation error:', error.message);
        } finally {
            this.processing = false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ==================== AUTOMATION CONTROL STATE ====================
let automationJob = null;
let automationEnabled = true;
let automationStatus = {
    enabled: true,
    running: false,
    lastRun: null,
    totalRuns: 0,
    articlesProcessed: 0
};

// ==================== EXPRESS APP ====================
const app = express();
const engine = new AutomationEngine();

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy for Render/Cloudflare in production
if (CONFIG.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// ==================== FILE UPLOAD ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/images/uploads/';
        const fs = require('fs');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'upload-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Images only!'));
        }
    }
});

// ==================== HEALTH CHECK & PING ====================

// Health check for Render + UptimeRobot
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        automation: automationEnabled ? 'running' : 'stopped',
        processing: automationStatus.running,
        totalRuns: automationStatus.totalRuns,
        articlesProcessed: automationStatus.articlesProcessed,
        environment: CONFIG.NODE_ENV
    });
});

// Ping endpoint for UptimeRobot keep-alive
app.get('/ping', (req, res) => {
    res.status(200).send('pong 🏓');
});

// ==================== PUBLIC API ENDPOINTS ====================

// Get all published articles
app.get('/api/articles', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const [articles] = await db.execute(
            `SELECT id, title, slug, content, category, featured_image, 
                    views, published_at, created_at, author_name, user_id
            FROM articles 
            WHERE approval_status = 'approved' AND status = 'published' 
            ORDER BY published_at DESC 
            LIMIT ${limit}`
        );
        res.json(articles);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to load articles' });
    }
});

// Get single article by slug
app.get('/api/articles/:slug', async (req, res) => {
    try {
        const [articles] = await db.execute(
            `SELECT * FROM articles 
            WHERE slug = ? AND approval_status = 'approved' AND status = 'published'`,
            [req.params.slug]
        );

        if (articles.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Increment view count
        await db.execute(
            'UPDATE articles SET views = views + 1 WHERE slug = ?',
            [req.params.slug]
        );

        // Update user total views if user article
        if (articles[0].user_id) {
            await db.execute(
                `UPDATE users SET total_views = (
                    SELECT COALESCE(SUM(views), 0) FROM articles 
                    WHERE user_id = ? AND approval_status = 'approved'
                ) WHERE id = ?`,
                [articles[0].user_id, articles[0].user_id]
            );
        }

        res.json(articles[0]);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to load article' });
    }
});

// Get articles by category
app.get('/api/category/:category', async (req, res) => {
    try {
        const [articles] = await db.execute(
            `SELECT id, title, slug, content, category, featured_image, 
                    views, published_at, author_name
            FROM articles 
            WHERE category = ? AND approval_status = 'approved' AND status = 'published' 
            ORDER BY published_at DESC 
            LIMIT 30`,
            [req.params.category]
        );
        res.json(articles);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to load category' });
    }
});

// Search articles
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        if (query.length < 2) return res.json([]);

        const searchTerm = `%${query}%`;
        const [articles] = await db.execute(
            `SELECT id, title, slug, category, featured_image, published_at
            FROM articles 
            WHERE (title LIKE ? OR content LIKE ?)
            AND approval_status = 'approved' AND status = 'published'
            ORDER BY published_at DESC 
            LIMIT 20`,
            [searchTerm, searchTerm]
        );
        res.json(articles);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get author profile by username
app.get('/api/author/:username', async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, username, full_name, bio, profile_image, 
                    article_count, total_views, created_at
            FROM users 
            WHERE username = ? AND status = 'active'`,
            [req.params.username]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Author not found' });
        }

        const [articles] = await db.execute(
            `SELECT id, title, slug, category, featured_image, views, published_at
            FROM articles 
            WHERE user_id = ? AND approval_status = 'approved' AND status = 'published'
            ORDER BY published_at DESC 
            LIMIT 20`,
            [users[0].id]
        );

        res.json({ author: users[0], articles });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== AUTH ENDPOINTS ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const user = await authSystem.register({ username, email, password, full_name });
        res.json({ success: true, message: 'Registration successful', user });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Missing credentials' });
        }

        const result = await authSystem.login(username, password);

        res.cookie('authToken', result.token, {
            httpOnly: true,
            secure: CONFIG.NODE_ENV === 'production',
            sameSite: CONFIG.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true, user: result.user, token: result.token });

    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Logout
app.post('/api/auth/logout', authenticateUser, async (req, res) => {
    try {
        const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
        if (token) await authSystem.logout(token);
        res.clearCookie('authToken');
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current logged-in user
app.get('/api/auth/me', authenticateUser, async (req, res) => {
    try {
        const user = await authSystem.getUserProfile(req.user.id);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
app.put('/api/auth/profile', authenticateUser, async (req, res) => {
    try {
        const user = await authSystem.updateProfile(req.user.id, req.body);
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== USER ARTICLE SUBMISSION ====================

// Submit article (any logged-in user)
app.post('/api/user/submit-article', authenticateUser, upload.single('image'), async (req, res) => {
    try {
        const { title, content, category } = req.body;

        if (!title || !content || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const imagePath = req.file ? `/images/uploads/${req.file.filename}` : null;

        const articleId = await engine.publisher.publish({
            title,
            content,
            category,
            image: imagePath
        }, true, req.user.id, req.user.username);

        res.json({
            success: true,
            message: 'Article submitted for approval',
            articleId
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's own articles
app.get('/api/user/my-articles', authenticateUser, async (req, res) => {
    try {
        const [articles] = await db.execute(
            `SELECT id, title, slug, category, approval_status, status, views, 
                    created_at, published_at, rejection_reason
            FROM articles 
            WHERE user_id = ? 
            ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user's own pending article
app.delete('/api/user/article/:id', authenticateUser, async (req, res) => {
    try {
        const [articles] = await db.execute(
            'SELECT * FROM articles WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (articles.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }

        if (articles[0].approval_status !== 'pending') {
            return res.status(403).json({ error: 'Can only delete pending articles' });
        }

        await engine.publisher.delete(req.params.id);
        res.json({ success: true, message: 'Article deleted' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN - USER MANAGEMENT ====================

// Get all users
app.get('/api/admin/users', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, username, email, full_name, role, status, 
                    article_count, total_views, created_at, last_login
            FROM users 
            ORDER BY created_at DESC`
        );
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single user + their articles
app.get('/api/admin/users/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, username, email, full_name, bio, role, status, 
                    article_count, total_views, created_at, last_login
            FROM users WHERE id = ?`,
            [req.params.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [articles] = await db.execute(
            `SELECT id, title, category, approval_status, status, views, created_at 
            FROM articles WHERE user_id = ? 
            ORDER BY created_at DESC`,
            [req.params.id]
        );

        res.json({ user: users[0], articles });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user status (suspend/activate)
app.put('/api/admin/users/:id/status', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await db.execute(
            'UPDATE users SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        res.json({ success: true, message: 'User status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
app.delete('/api/admin/users/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(403).json({ error: 'Cannot delete your own account' });
        }
        await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN - ARTICLE MANAGEMENT ====================

// Get dashboard stats
app.get('/api/admin/stats', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [total] = await db.execute('SELECT COUNT(*) as count FROM articles');
        const [pending] = await db.execute('SELECT COUNT(*) as count FROM articles WHERE approval_status = "pending"');
        const [approved] = await db.execute('SELECT COUNT(*) as count FROM articles WHERE approval_status = "approved"');
        const [today] = await db.execute('SELECT COUNT(*) as count FROM articles WHERE DATE(created_at) = CURDATE()');
        const [views] = await db.execute('SELECT COALESCE(SUM(views), 0) as total FROM articles WHERE approval_status = "approved"');

        res.json({
            total: total[0].count,
            pending: pending[0].count,
            approved: approved[0].count,
            today: today[0].count,
            totalViews: views[0].total || 0,
            autoApprove: CONFIG.AUTO_APPROVE
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pending articles
app.get('/api/admin/pending', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [articles] = await db.execute(
            `SELECT * FROM articles 
            WHERE approval_status = 'pending' 
            ORDER BY created_at DESC`
        );
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all articles
app.get('/api/admin/all', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [articles] = await db.execute(
            `SELECT id, title, category, status, approval_status, views, 
                    published_at, created_at
            FROM articles 
            ORDER BY created_at DESC 
            LIMIT 100`
        );
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve article
app.post('/api/admin/approve/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const success = await engine.publisher.approve(req.params.id, req.user.id);
        if (success) {
            res.json({ success: true, message: 'Article approved' });
        } else {
            res.status(404).json({ error: 'Article not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject article
app.post('/api/admin/reject/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const success = await engine.publisher.reject(req.params.id, reason || 'Quality issues');
        if (success) {
            res.json({ success: true, message: 'Article rejected' });
        } else {
            res.status(404).json({ error: 'Article not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete article (admin)
app.delete('/api/admin/article/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const success = await engine.publisher.delete(req.params.id);
        if (success) {
            res.json({ success: true, message: 'Article deleted' });
        } else {
            res.status(404).json({ error: 'Article not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual article submission (admin)
app.post('/api/admin/submit', authenticateUser, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { title, content, category } = req.body;

        if (!title || !content || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const imagePath = req.file ? `/images/uploads/${req.file.filename}` : null;

        const articleId = await engine.publisher.publish({
            title,
            content,
            category,
            image: imagePath
        }, true);

        res.json({
            success: true,
            message: 'Article submitted successfully',
            articleId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN - AUTOMATION CONTROL ====================

// Get automation status
app.get('/api/admin/automation/status', authenticateUser, requireAdmin, async (req, res) => {
    try {
        res.json({
            enabled: automationEnabled,
            running: automationStatus.running,
            lastRun: automationStatus.lastRun,
            totalRuns: automationStatus.totalRuns,
            articlesProcessed: automationStatus.articlesProcessed,
            schedule: CONFIG.CHECK_NEWS_EVERY,
            autoApprove: CONFIG.AUTO_APPROVE
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start automation
app.post('/api/admin/automation/start', authenticateUser, requireAdmin, async (req, res) => {
    try {
        if (automationEnabled) {
            return res.json({
                success: true,
                message: 'Automation is already running',
                status: automationStatus
            });
        }

        automationEnabled = true;
        automationStatus.enabled = true;
        console.log('✅ Automation started by admin:', req.user.username);

        res.json({
            success: true,
            message: 'Automation started successfully',
            status: automationStatus
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop automation
app.post('/api/admin/automation/stop', authenticateUser, requireAdmin, async (req, res) => {
    try {
        if (!automationEnabled) {
            return res.json({
                success: true,
                message: 'Automation is already stopped',
                status: automationStatus
            });
        }

        automationEnabled = false;
        automationStatus.enabled = false;
        console.log('⏸️  Automation stopped by admin:', req.user.username);

        res.json({
            success: true,
            message: 'Automation stopped successfully',
            status: automationStatus
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual trigger automation (works even when stopped)
app.post('/api/admin/automation/trigger', authenticateUser, requireAdmin, async (req, res) => {
    try {
        if (automationStatus.running) {
            return res.json({
                success: false,
                message: 'Automation is already running. Please wait for it to complete.'
            });
        }

        console.log('🎯 Manual trigger by admin:', req.user.username);

        // Run in background - don't block response
        setTimeout(async () => {
            automationStatus.running = true;
            automationStatus.totalRuns++;
            try {
                await engine.processNews();
            } catch (err) {
                console.error('❌ Manual trigger error:', err.message);
            } finally {
                automationStatus.running = false;
                automationStatus.lastRun = new Date();
            }
        }, 100);

        res.json({
            success: true,
            message: 'News fetch triggered! Check back in a few minutes.',
            status: automationStatus
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATIC FILES ====================
app.use(express.static('public'));

// ==================== 404 HANDLER ====================
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: `API endpoint not found: ${req.path}` });
    }
    // For non-API routes, serve index.html (SPA support)
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) res.status(404).send('Page not found');
    });
});

// ==================== SERVER STARTUP ====================
async function startServer() {
    try {
        // 1. Connect to database
        await connectDB();

        // 2. Initialize auth system
        authSystem = new AuthSystem(db);
        console.log('✅ Auth system initialized');

        // 3. Create uploads directory if not exists
        const fs = require('fs');
        if (!fs.existsSync('./public/images/uploads')) {
            fs.mkdirSync('./public/images/uploads', { recursive: true });
            console.log('✅ Created uploads directory');
        }

        // 4. Schedule automation cron job
        automationJob = cron.schedule(CONFIG.CHECK_NEWS_EVERY, () => {
            if (automationEnabled && !automationStatus.running) {
                console.log('\n⏰ Scheduled news check triggered');
                automationStatus.running = true;
                automationStatus.totalRuns++;
                engine.processNews()
                    .then(() => {
                        automationStatus.running = false;
                        automationStatus.lastRun = new Date();
                    })
                    .catch(err => {
                        console.error('❌ Scheduled run error:', err.message);
                        automationStatus.running = false;
                    });
            } else if (!automationEnabled) {
                console.log('\n⏸️  Automation paused - skipping scheduled run');
            } else {
                console.log('\n⏸️  Already processing - skipping scheduled run');
            }
        });

        console.log('✅ Automation scheduler initialized');

        // 5. Start Express server
        app.listen(CONFIG.PORT, () => {
            console.log('\n╔════════════════════════════════════════╗');
            console.log('║     📱 PhoneVerse News System          ║');
            console.log('╚════════════════════════════════════════╝');
            console.log(`\n🚀 Server:       http://localhost:${CONFIG.PORT}`);
            console.log(`🌐 Environment:  ${CONFIG.NODE_ENV}`);
            console.log(`📰 Schedule:     ${CONFIG.CHECK_NEWS_EVERY}`);
            console.log(`⚡ Auto-Approve: ${CONFIG.AUTO_APPROVE ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`🔄 Automation:   ${automationEnabled ? '✅ RUNNING' : '⏸️  PAUSED'}`);
            console.log(`💓 Health:       http://localhost:${CONFIG.PORT}/health`);
            console.log(`🏓 Ping:         http://localhost:${CONFIG.PORT}/ping`);
            console.log('\n✅ System ready!\n');
        });

        // 6. Run initial news check after 15 seconds
        setTimeout(() => {
            if (automationEnabled) {
                console.log('🎯 Running initial news check...');
                automationStatus.running = true;
                engine.processNews()
                    .then(() => {
                        automationStatus.running = false;
                        automationStatus.lastRun = new Date();
                    })
                    .catch(err => {
                        console.error('❌ Initial run error:', err.message);
                        automationStatus.running = false;
                    });
            }
        }, 15000);

    } catch (error) {
        console.error('❌ Startup failed:', error.message);
        process.exit(1);
    }
}

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    if (automationJob) {
        automationJob.stop();
        console.log('✅ Automation scheduler stopped');
    }
    if (db) {
        await db.end();
        console.log('✅ Database connection closed');
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n\n🛑 SIGTERM received...');
    if (automationJob) automationJob.stop();
    if (db) await db.end();
    process.exit(0);
});

// Prevent crashes from unhandled errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});

// ==================== START SERVER ====================
startServer();
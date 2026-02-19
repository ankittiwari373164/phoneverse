/**
 * PHONEVERSE AUTOMATION SERVER
 * Complete automation system with Google Discover optimization
 * Version: 2.0 (Discover-Optimized)
 */

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const Parser = require('rss-parser');
const path = require('path');

// Import custom modules
const ImageGenerator = require('./image-generator');
const DiscoverContentTransformer = require('./discover-content-transformer');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('public/images'));

// ========================================
// DATABASE CONNECTION
// ========================================

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let db;

async function connectDatabase() {
    try {
        db = await mysql.createPool(dbConfig);
        await db.query('SELECT 1');
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// ========================================
// DISCOVER OPTIMIZATION SETUP
// ========================================

const discoverEnabled = process.env.USE_DISCOVER_OPTIMIZATION === 'true';
const discoverTransformer = discoverEnabled ? new DiscoverContentTransformer() : null;

console.log(discoverEnabled ? '✅ Discover optimization ENABLED' : '⚠️  Discover optimization DISABLED');
console.log(`📋 Manual Phase: ${process.env.MANUAL_PHASE === 'true' ? 'ACTIVE' : 'INACTIVE'}`);

// ========================================
// RSS FEED CONFIGURATION
// ========================================

const RSS_SOURCES = [
    {
        name: 'GSMArena',
        url: 'https://www.gsmarena.com/rss-news-reviews.php3',
        category: 'mobile-news'
    },
    {
        name: 'Android Authority',
        url: 'https://www.androidauthority.com/feed/',
        category: 'android-updates'
    },
    {
        name: 'The Verge',
        url: 'https://www.theverge.com/rss/index.xml',
        category: 'mobile-news'
    },
    {
        name: 'Android Central',
        url: 'https://www.androidcentral.com/feed',
        category: 'reviews'
    },
    {
        name: 'XDA Developers',
        url: 'https://www.xda-developers.com/feed/',
        category: 'android-updates'
    },
    {
        name: 'Android Police',
        url: 'https://www.androidpolice.com/feed/',
        category: 'mobile-news'
    }
];

// ========================================
// RSS PARSER
// ========================================

const parser = new Parser({
    timeout: 10000,
    customFields: {
        item: [
            ['media:content', 'media'],
            ['content:encoded', 'fullContent']
        ]
    }
});

async function fetchRSSFeed(source) {
    try {
        console.log(`📡 Fetching ${source.name}...`);
        const feed = await parser.parseURL(source.url);
        
        const articles = feed.items.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            content: item.contentSnippet || item.content || item.description || '',
            fullContent: item.fullContent || item.content || item.contentSnippet || '',
            category: source.category,
            source: source.name
        }));
        
        console.log(`✅ ${source.name}: ${articles.length} articles`);
        return articles;
        
    } catch (error) {
        console.error(`❌ ${source.name} failed:`, error.message);
        return [];
    }
}

async function fetchAllRSSFeeds() {
    const allArticles = [];
    
    for (const source of RSS_SOURCES) {
        const articles = await fetchRSSFeed(source);
        allArticles.push(...articles);
    }
    
    console.log(`📰 Total articles from all sources: ${allArticles.length}`);
    return allArticles;
}

// ========================================
// ARTICLE PROCESSING
// ========================================

async function isDuplicate(title, sourceUrl) {
    try {
        // Check by title
        const [titleCheck] = await db.execute(
            'SELECT id FROM articles WHERE title = ? LIMIT 1',
            [title]
        );
        
        if (titleCheck.length > 0) {
            return true;
        }
        
        // Check by source URL
        const [urlCheck] = await db.execute(
            'SELECT id FROM news_sources WHERE source_url = ? LIMIT 1',
            [sourceUrl]
        );
        
        return urlCheck.length > 0;
        
    } catch (error) {
        console.error('Error checking duplicate:', error.message);
        return false;
    }
}

async function trackSource(sourceUrl, title) {
    try {
        await db.execute(
            'INSERT INTO news_sources (source_url, title, processed_at) VALUES (?, ?, NOW())',
            [sourceUrl, title]
        );
    } catch (error) {
        console.error('Error tracking source:', error.message);
    }
}

async function processNewsArticle(article) {
    try {
        const { title, link, content, fullContent, category, source } = article;
        
        console.log(`\n[${category}] Processing: ${title.substring(0, 50)}...`);
        
        // Check for duplicates FIRST
        const isDup = await isDuplicate(title, link);
        if (isDup) {
            console.log('⏭️  Duplicate skipped');
            return null;
        }
        
        // Prepare content
        let articleContent = fullContent || content;
        let finalTitle = title;
        let finalContent = articleContent;
        let excerpt = articleContent.substring(0, 155);
        
        // Apply Discover optimization if enabled
        if (discoverTransformer) {
            try {
                const transformed = discoverTransformer.transform(
                    title,
                    articleContent,
                    category,
                    link
                );
                
                finalTitle = transformed.title;
                finalContent = transformed.content;
                excerpt = transformed.excerpt;
                
                console.log(`   🎯 Discover-optimized: ${transformed.wordCount} words`);
            } catch (transformError) {
                console.log('   ⚠️  Transformation failed, using original');
            }
        }
        
        // Generate image
        const imageGenerator = new ImageGenerator();
        const featuredImage = await imageGenerator.createFeaturedImage(finalTitle, category);
        console.log(`   🖼️  Image: ${featuredImage.substring(0, 50)}...`);
        
        // Create slug
        const slug = finalTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 200);
        
        // Determine status based on settings
        let status = 'published';
        if (process.env.REQUIRE_MANUAL_REVIEW === 'true') {
            // Reviews and long articles need manual review
            if (category === 'reviews' || finalContent.split(' ').length > 1000) {
                status = 'pending_review';
            }
        }
        
        // Insert article into database
        const [result] = await db.execute(
            `INSERT INTO articles (
                title, slug, content, excerpt, category, 
                featured_image, source_url, author, 
                status, published_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                finalTitle,
                slug,
                finalContent,
                excerpt,
                category,
                featuredImage,
                link,
                'Tech Editor',
                status
            ]
        );
        
        // Track source
        await trackSource(link, finalTitle);
        
        if (status === 'published') {
            console.log(`✅ Published: ${finalTitle.substring(0, 60)}...`);
        } else {
            console.log(`📋 Pending review: ${finalTitle.substring(0, 60)}...`);
        }
        
        return {
            id: result.insertId,
            title: finalTitle,
            slug: slug,
            status: status
        };
        
    } catch (error) {
        console.error(`❌ Error processing article:`, error.message);
        return null;
    }
}

// ========================================
// AUTOMATION ENGINE
// ========================================

async function runAutomation() {
    console.log('\n' + '='.repeat(60));
    console.log('🤖 AUTOMATION STARTED');
    console.log('='.repeat(60));
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    
    // Check if in manual phase
    if (process.env.MANUAL_PHASE === 'true') {
        console.log('\n⚠️  MANUAL PHASE ACTIVE');
        console.log('   Automation is paused');
        console.log('   Please write 25-30 articles manually');
        console.log('   Then set MANUAL_PHASE=false in .env');
        console.log('\n' + '='.repeat(60) + '\n');
        return;
    }
    
    try {
        // Fetch all RSS feeds
        const allArticles = await fetchAllRSSFeeds();
        
        // Filter recent articles (last 48 hours)
        const recentArticles = allArticles.filter(article => {
            const pubDate = new Date(article.pubDate);
            const now = new Date();
            const hoursDiff = (now - pubDate) / (1000 * 60 * 60);
            return hoursDiff <= 48;
        });
        
        console.log(`📰 Recent articles (last 48h): ${recentArticles.length}`);
        
        if (recentArticles.length === 0) {
            console.log('ℹ️  No recent articles to process');
            return;
        }
        
        console.log(`📰 Found ${recentArticles.length} recent articles, processing...`);
        
        // Process articles
        let processed = 0;
        let published = 0;
        let skipped = 0;
        const maxToProcess = parseInt(process.env.MAX_ARTICLES_PER_BATCH) || 50;
        const maxToPublish = parseInt(process.env.MAX_PUBLISH_PER_BATCH) || 10;
        
        for (const article of recentArticles) {
            // Stop if reached limits
            if (processed >= maxToProcess || published >= maxToPublish) {
                console.log(`\n⏸️  Reached limit (processed: ${processed}, published: ${published})`);
                break;
            }
            
            processed++;
            console.log(`\n[${processed}/${recentArticles.length}]`);
            
            const result = await processNewsArticle(article);
            
            if (result) {
                if (result.status === 'published') {
                    published++;
                }
            } else {
                skipped++;
            }
            
            // Small delay between articles
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ AUTOMATION COMPLETE');
        console.log('='.repeat(60));
        console.log(`📊 Processed: ${processed} articles`);
        console.log(`✅ Published: ${published} articles`);
        console.log(`⏭️  Skipped: ${skipped} duplicates`);
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.error('\n❌ AUTOMATION ERROR:', error.message);
        console.log('='.repeat(60) + '\n');
    }
}

// ========================================
// JWT MIDDLEWARE
// ========================================

function authenticateUser(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ========================================
// PUBLIC API ROUTES
// ========================================

// Get all articles
app.get('/api/articles', async (req, res) => {
    try {
        const { category, limit = 20, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM articles WHERE status = ? ';
        const params = ['published'];
        
        if (category && category !== 'all') {
            query += 'AND category = ? ';
            params.push(category);
        }
        
        query += 'ORDER BY published_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [articles] = await db.execute(query, params);
        res.json(articles);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single article by slug
app.get('/api/articles/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        const [articles] = await db.execute(
            'SELECT * FROM articles WHERE slug = ? AND status = ?',
            [slug, 'published']
        );
        
        if (articles.length === 0) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        // Increment views
        await db.execute(
            'UPDATE articles SET views = views + 1 WHERE id = ?',
            [articles[0].id]
        );
        
        res.json(articles[0]);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get articles by category
app.get('/api/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 20 } = req.query;
        
        const [articles] = await db.execute(
            'SELECT * FROM articles WHERE category = ? AND status = ? ORDER BY published_at DESC LIMIT ?',
            [category, 'published', parseInt(limit)]
        );
        
        res.json(articles);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search articles
app.get('/api/search', async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        
        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }
        
        const [articles] = await db.execute(
            `SELECT * FROM articles 
             WHERE (title LIKE ? OR content LIKE ?) 
             AND status = ? 
             ORDER BY published_at DESC 
             LIMIT ?`,
            [`%${q}%`, `%${q}%`, 'published', parseInt(limit)]
        );
        
        res.json(articles);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// AUTHENTICATION ROUTES
// ========================================

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user exists
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())',
            [username, email, hashedPassword, 'user']
        );
        
        res.json({
            success: true,
            message: 'User registered successfully',
            userId: result.insertId
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// ADMIN ROUTES
// ========================================

// Get all users (admin only)
app.get('/api/admin/users', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
        );
        
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get admin stats
app.get('/api/admin/stats', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [articleCount] = await db.execute('SELECT COUNT(*) as count FROM articles');
        const [publishedCount] = await db.execute('SELECT COUNT(*) as count FROM articles WHERE status = ?', ['published']);
        const [pendingCount] = await db.execute('SELECT COUNT(*) as count FROM articles WHERE status = ?', ['pending_review']);
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [totalViews] = await db.execute('SELECT SUM(views) as total FROM articles');
        
        res.json({
            totalArticles: articleCount[0].count,
            publishedArticles: publishedCount[0].count,
            pendingReview: pendingCount[0].count,
            totalUsers: userCount[0].count,
            totalViews: totalViews[0].total || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pending articles
app.get('/api/admin/pending-review', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [articles] = await db.execute(
            'SELECT * FROM articles WHERE status = ? ORDER BY created_at DESC',
            ['pending_review']
        );
        
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve article
app.post('/api/admin/approve/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.execute(
            'UPDATE articles SET status = ?, published_at = NOW() WHERE id = ?',
            ['published', id]
        );
        
        res.json({ success: true, message: 'Article approved and published' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject article
app.post('/api/admin/reject/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.execute('DELETE FROM articles WHERE id = ?', [id]);
        
        res.json({ success: true, message: 'Article rejected and deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all articles (including drafts)
app.get('/api/admin/all', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [articles] = await db.execute(
            'SELECT * FROM articles ORDER BY created_at DESC LIMIT 100'
        );
        
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete article
app.delete('/api/admin/articles/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.execute('DELETE FROM articles WHERE id = ?', [id]);
        
        res.json({ success: true, message: 'Article deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear news sources tracking
app.post('/api/admin/clear-sources', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM news_sources');
        
        res.json({
            success: true,
            message: `Cleared ${result.affectedRows} tracked sources`,
            cleared: result.affectedRows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual trigger automation
app.post('/api/admin/trigger-automation', authenticateUser, requireAdmin, async (req, res) => {
    try {
        res.json({ success: true, message: 'Automation triggered' });
        
        // Run in background
        runAutomation().catch(error => {
            console.error('Automation error:', error);
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// CRON JOB SETUP
// ========================================

const cronSchedule = process.env.CHECK_NEWS_EVERY || '*/10 * * * *';

cron.schedule(cronSchedule, () => {
    console.log(`\n⏰ Cron triggered: ${new Date().toLocaleString()}`);
    runAutomation().catch(error => {
        console.error('Cron automation error:', error);
    });
});

console.log(`⏰ Cron job scheduled: ${cronSchedule}`);

// ========================================
// SERVER STARTUP
// ========================================

async function startServer() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 PHONEVERSE AUTOMATION SERVER v2.0');
    console.log('='.repeat(60) + '\n');
    
    // Connect to database
    const dbConnected = await connectDatabase();
    
    if (!dbConnected) {
        console.error('❌ Cannot start server without database');
        process.exit(1);
    }
    
    // Start Express server
    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📍 URL: http://localhost:${PORT}`);
        console.log(`\n🎯 Features:`);
        console.log(`   - Google Discover Optimization: ${discoverEnabled ? 'ON' : 'OFF'}`);
        console.log(`   - Manual Phase: ${process.env.MANUAL_PHASE === 'true' ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`   - Auto Publish: ${process.env.AUTO_PUBLISH_TRENDING === 'true' ? 'ON' : 'OFF'}`);
        console.log(`   - Manual Review: ${process.env.REQUIRE_MANUAL_REVIEW === 'true' ? 'ON' : 'OFF'}`);
        console.log(`   - RSS Sources: ${RSS_SOURCES.length}`);
        console.log(`   - Cron Schedule: ${cronSchedule}`);
        console.log('\n' + '='.repeat(60) + '\n');
    });
    
    // Run initial automation after 30 seconds
    setTimeout(() => {
        console.log('🤖 Running initial automation check...');
        runAutomation().catch(error => {
            console.error('Initial automation error:', error);
        });
    }, 30000);
}

// Start the server
startServer().catch(error => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n⚠️  SIGINT received, shutting down gracefully...');
    process.exit(0);
});
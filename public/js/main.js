// ===================================
// HOMEPAGE JAVASCRIPT
// ===================================

let allArticles = [];
let filteredArticles = [];
let displayCount = 9;
let currentCategory = 'all';

// Load on page ready
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    setupFilters();
});

// Load articles from API
async function loadArticles() {
    try {
        console.log('📡 Fetching articles...');
        
        const response = await fetch('/api/articles?limit=100');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response');
        }
        
        allArticles = await response.json();
        
        console.log(`✅ Loaded ${allArticles.length} articles`);
        
        if (allArticles.length === 0) {
            showEmptyState();
            return;
        }

        filteredArticles = allArticles;
        displayHero();
        displayArticles();
        displayTrending();
        updateBreakingNews();
        
    } catch (error) {
        console.error('❌ Error loading articles:', error);
        showErrorState(error.message);
    }
}

// Display Hero Section
function displayHero() {
    const heroSection = document.getElementById('heroSection');
    
    if (!heroSection || allArticles.length === 0) return;
    
    const featured = allArticles[0];
    const sidebar = allArticles.slice(1, 4);
    
    heroSection.innerHTML = `
        <a href="/article.html?slug=${featured.slug}" class="hero-main">
            <img src="${featured.featured_image || '/images/placeholder.png'}" 
                 alt="${escapeHtml(featured.title)}"
                 onerror="this.src='/images/placeholder.png'">
            <div class="hero-content">
                <span class="hero-category">${formatCategory(featured.category)}</span>
                <h2>${escapeHtml(featured.title)}</h2>
                <div class="hero-meta">
                    <span>📅 ${formatDate(featured.published_at)}</span>
                    <span>👁️ ${featured.views || 0} views</span>
                </div>
            </div>
        </a>
        <div class="hero-sidebar">
            ${sidebar.map(article => `
                <a href="/article.html?slug=${article.slug}" class="hero-card">
                    <img src="${article.featured_image || '/images/placeholder.png'}" 
                         alt="${escapeHtml(article.title)}"
                         onerror="this.src='/images/placeholder.png'">
                    <div class="hero-card-content">
                        <h3>${escapeHtml(article.title)}</h3>
                        <div class="hero-card-meta">
                            <span>${formatDate(article.published_at)}</span>
                            <span>•</span>
                            <span>${article.views || 0} views</span>
                        </div>
                    </div>
                </a>
            `).join('')}
        </div>
    `;
}

// Display Articles Grid
function displayArticles() {
    const grid = document.getElementById('articlesGrid');
    if (!grid) return;
    
    // Skip first 4 articles (used in hero)
    const startIndex = 4;
    const articles = filteredArticles.slice(startIndex, startIndex + displayCount);
    
    if (articles.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <p style="color: #666;">No articles found in this category</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = articles.map(article => `
        <a href="/article.html?slug=${article.slug}" class="article-card">
            <div class="article-image">
                <img src="${article.featured_image || '/images/placeholder.png'}" 
                     alt="${escapeHtml(article.title)}"
                     onerror="this.src='/images/placeholder.png'">
                <span class="article-category">${formatCategory(article.category)}</span>
            </div>
            <div class="article-body">
                <h3>${escapeHtml(article.title)}</h3>
                <p class="article-excerpt">${extractText(article.content).substring(0, 120)}...</p>
                <div class="article-meta">
                    <span>📅 ${formatDate(article.published_at)}</span>
                    <span>👁️ ${article.views || 0}</span>
                </div>
            </div>
        </a>
    `).join('');
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = (startIndex + displayCount < filteredArticles.length) ? 'inline-block' : 'none';
    }
}

// Display Trending
function displayTrending() {
    const grid = document.getElementById('trendingGrid');
    if (!grid || allArticles.length === 0) return;
    
    const trending = [...allArticles]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 4);
    
    grid.innerHTML = trending.map(article => `
        <a href="/article.html?slug=${article.slug}" class="trending-card">
            <img src="${article.featured_image || '/images/placeholder.png'}" 
                 alt="${escapeHtml(article.title)}"
                 onerror="this.src='/images/placeholder.png'">
            <div class="trending-card-body">
                <h4>${escapeHtml(article.title)}</h4>
                <div class="trending-card-meta">
                    <span>${formatDate(article.published_at)}</span>
                    <span>•</span>
                    <span>${article.views || 0} views</span>
                </div>
            </div>
        </a>
    `).join('');
}

// Update Breaking News
function updateBreakingNews() {
    const breakingNews = document.getElementById('breakingNews');
    if (breakingNews && allArticles.length > 0) {
        const latest = allArticles[0];
        breakingNews.innerHTML = `
            <span>
                <a href="/article.html?slug=${latest.slug}" style="color: inherit;">
                    ${escapeHtml(latest.title)}
                </a>
                 • ${formatDate(latest.published_at)}
            </span>
        `;
    }
}

// Setup Category Filters
function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter articles
            currentCategory = category;
            displayCount = 9;
            
            if (category === 'all') {
                filteredArticles = allArticles;
            } else {
                filteredArticles = allArticles.filter(a => a.category === category);
            }
            
            displayArticles();
        });
    });
}

// Load More
function loadMore() {
    displayCount += 9;
    displayArticles();
}

// Empty State
function showEmptyState() {
    const articlesGrid = document.getElementById('articlesGrid');
    const heroSection = document.getElementById('heroSection');
    const trendingGrid = document.getElementById('trendingGrid');
    
    if (articlesGrid) {
        articlesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📱</div>
                <h3 style="font-size: 24px; margin-bottom: 10px;">No Articles Yet</h3>
                <p style="color: #666; margin-bottom: 20px;">
                    Articles are being fetched automatically. Please check back in a few minutes!
                </p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 15px;">
                    Refresh Page
                </button>
            </div>
        `;
    }
    
    if (heroSection) {
        heroSection.innerHTML = '<div class="skeleton-loader" style="height: 400px;"></div>';
    }
    
    if (trendingGrid) {
        trendingGrid.innerHTML = '<div class="skeleton-loader" style="height: 200px;"></div>';
    }
}

// Error State
function showErrorState(errorMsg) {
    const articlesGrid = document.getElementById('articlesGrid');
    if (articlesGrid) {
        articlesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                <h3 style="font-size: 24px; margin-bottom: 10px; color: #ef4444;">Error Loading Articles</h3>
                <p style="color: #666; margin-bottom: 10px;">There was a problem loading the articles.</p>
                <p style="color: #999; font-size: 14px; margin-bottom: 20px;">${escapeHtml(errorMsg)}</p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Try Again
                </button>
            </div>
        `;
    }
    
    console.error('Failed to load articles:', errorMsg);
}
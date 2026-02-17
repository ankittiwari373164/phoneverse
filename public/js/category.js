// ===================================
// CATEGORY PAGE JAVASCRIPT
// ===================================

let currentCategory = '';

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentCategory = urlParams.get('cat');
    
    if (currentCategory) {
        loadCategoryArticles(currentCategory);
    } else {
        window.location.href = '/';
    }
});

// Load Category Articles
async function loadCategoryArticles(category) {
    try {
        const response = await fetch(`/api/category/${category}`);
        
        if (!response.ok) {
            throw new Error('Failed to load category');
        }
        
        const articles = await response.json();
        
        // Update page info
        updateCategoryInfo(category, articles.length);
        
        // Display articles
        displayCategoryArticles(articles);
        
    } catch (error) {
        console.error('Error loading category:', error);
        showError();
    }
}

// Update Category Info
function updateCategoryInfo(category, count) {
    const categoryName = getCategoryName(category);
    const categoryDesc = getCategoryDescription(category);
    
    // Update title
    document.getElementById('pageTitle').textContent = `${categoryName} | PhoneVerse`;
    document.title = `${categoryName} | PhoneVerse`;
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('categoryBreadcrumb');
    if (breadcrumb) {
        breadcrumb.textContent = categoryName;
    }
    
    // Update header
    const title = document.getElementById('categoryTitle');
    if (title) {
        title.textContent = categoryName;
    }
    
    const description = document.getElementById('categoryDescription');
    if (description) {
        description.textContent = categoryDesc;
    }
    
    // Update stats
    const stats = document.getElementById('articleCount');
    if (stats) {
        stats.textContent = `${count} article${count !== 1 ? 's' : ''}`;
    }
}

// Get Category Name
function getCategoryName(cat) {
    const names = {
        'mobile-news': '📱 Mobile News',
        'reviews': '⭐ Reviews',
        'android-updates': '🤖 Android Updates',
        'iphone-news': '🍎 iPhone News',
        'comparisons': '⚖️ Comparisons',
        'guides': '📚 Guides'
    };
    return names[cat] || cat;
}

// Get Category Description
function getCategoryDescription(cat) {
    const descriptions = {
        'mobile-news': 'Latest smartphone launches, announcements, and mobile industry news',
        'reviews': 'In-depth reviews and hands-on experiences with the latest mobile devices',
        'android-updates': 'Android OS updates, custom ROMs, and Android ecosystem news',
        'iphone-news': 'iPhone releases, iOS updates, and Apple mobile product news',
        'comparisons': 'Side-by-side comparisons to help you choose the right device',
        'guides': 'How-to guides, tutorials, and tips for getting the most from your phone'
    };
    return descriptions[cat] || 'Browse articles in this category';
}

// Display Category Articles
function displayCategoryArticles(articles) {
    const grid = document.getElementById('categoryArticles');
    
    if (!grid) return;
    
    if (articles.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📱</div>
                <h3 style="font-size: 24px; margin-bottom: 10px;">No Articles Yet</h3>
                <p style="color: #666; margin-bottom: 20px;">
                    No articles found in this category. Check back soon!
                </p>
                <a href="/" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    ← Back to Home
                </a>
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
}

// Show Error
function showError() {
    const grid = document.getElementById('categoryArticles');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <h3 style="color: #ef4444;">Error Loading Category</h3>
                <p style="color: #666;">Please try refreshing the page</p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 20px;">
                    Refresh Page
                </button>
            </div>
        `;
    }
}
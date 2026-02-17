// ===================================
// ARTICLE PAGE JAVASCRIPT
// ===================================

let currentArticle = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    
    if (slug) {
        loadArticle(slug);
        loadTrendingSidebar();
    } else {
        window.location.href = '/';
    }
});

// Load Single Article
async function loadArticle(slug) {
    try {
        const response = await fetch(`/api/articles/${slug}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showNotFound();
            } else {
                throw new Error('Failed to load article');
            }
            return;
        }
        
        currentArticle = await response.json();
        displayArticle(currentArticle);
        loadRelatedArticles(currentArticle.category, currentArticle.id);
        
    } catch (error) {
        console.error('Error loading article:', error);
        showError();
    }
}

// Display Article
function displayArticle(article) {
    // Update page metadata
    document.title = `${article.title} | PhoneVerse`;
    document.getElementById('pageTitle').textContent = `${article.title} | PhoneVerse`;
    
    const metaDesc = document.getElementById('pageDescription');
    if (metaDesc) {
        metaDesc.content = extractText(article.content).substring(0, 160);
    }
    
    // Breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <a href="/">Home</a>
            <span>/</span>
            <a href="/category.html?cat=${article.category}">${formatCategory(article.category)}</a>
            <span>/</span>
            <span>${article.title.substring(0, 50)}${article.title.length > 50 ? '...' : ''}</span>
        `;
    }
    
    // Article Header
    const header = document.getElementById('articleHeader');
    if (header) {
        header.innerHTML = `
            <div class="article-category-badge">
                <span class="category-tag">${formatCategory(article.category)}</span>
            </div>
            <h1>${escapeHtml(article.title)}</h1>
            <div class="article-meta-bar">
                <div class="meta-item">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"></line>
                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"></line>
                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"></line>
                    </svg>
                    ${formatDate(article.published_at)}
                </div>
                <div class="meta-item">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2"></path>
                        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"></circle>
                    </svg>
                    ${article.views || 0} views
                </div>
                <div class="meta-item">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill="none" stroke="currentColor" stroke-width="2"></path>
                        <circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"></circle>
                    </svg>
                    Tech Editor
                </div>
            </div>
            ${article.featured_image ? `
                <div class="article-featured-image">
                    <img src="${article.featured_image}" 
                         alt="${escapeHtml(article.title)}"
                         onerror="this.src='/images/placeholder.png'">
                </div>
            ` : ''}
        `;
    }
    
    // Article Body
    const body = document.getElementById('articleBody');
    if (body) {
        body.innerHTML = article.content;
    }
    
    // Tags (extract from title/content)
    const tags = extractTags(article);
    const tagsDiv = document.getElementById('articleTags');
    if (tagsDiv && tags.length > 0) {
        tagsDiv.innerHTML = `
            <div class="tags-label">Tags:</div>
            ${tags.map(tag => `
                <a href="/search.html?q=${encodeURIComponent(tag)}" class="tag">${tag}</a>
            `).join('')}
        `;
    }
}

// Extract Tags from Article
function extractTags(article) {
    const commonTags = ['Samsung', 'iPhone', 'Android', 'OnePlus', 'Google', 'Pixel', 'Galaxy', 'iOS', '5G', 'Camera', 'Battery', 'Display'];
    const text = (article.title + ' ' + article.content).toLowerCase();
    
    return commonTags.filter(tag => text.includes(tag.toLowerCase())).slice(0, 5);
}

// Load Related Articles
async function loadRelatedArticles(category, currentId) {
    try {
        const response = await fetch(`/api/category/${category}`);
        const articles = await response.json();
        
        const related = articles
            .filter(a => a.id !== currentId)
            .slice(0, 3);
        
        const relatedDiv = document.getElementById('relatedArticles');
        if (relatedDiv) {
            if (related.length === 0) {
                relatedDiv.innerHTML = '<p>No related articles found</p>';
                return;
            }
            
            relatedDiv.innerHTML = related.map(article => `
                <a href="/article.html?slug=${article.slug}" class="related-card">
                    <img src="${article.featured_image || '/images/placeholder.png'}" 
                         alt="${escapeHtml(article.title)}"
                         onerror="this.src='/images/placeholder.png'">
                    <div class="related-card-body">
                        <h4>${escapeHtml(article.title)}</h4>
                        <p>${formatDate(article.published_at)}</p>
                    </div>
                </a>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error loading related articles:', error);
    }
}

// Load Trending Sidebar
async function loadTrendingSidebar() {
    try {
        const response = await fetch('/api/articles?limit=10');
        const articles = await response.json();
        
        const trending = articles
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 5);
        
        const sidebar = document.getElementById('trendingSidebar');
        if (sidebar) {
            sidebar.innerHTML = trending.map((article, index) => `
                <a href="/article.html?slug=${article.slug}" class="trending-item">
                    <span class="trending-number">${index + 1}</span>
                    <div class="trending-info">
                        <h4>${escapeHtml(article.title)}</h4>
                        <p>${article.views || 0} views</p>
                    </div>
                </a>
            `).join('');
        }
        
    } catch (error) {
        console.error('Error loading trending:', error);
    }
}

// Show Not Found
function showNotFound() {
    const header = document.getElementById('articleHeader');
    if (header) {
        header.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📱</div>
                <h1>Article Not Found</h1>
                <p style="color: #666; margin: 20px 0;">The article you're looking for doesn't exist or has been removed.</p>
                <a href="/" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    ← Back to Home
                </a>
            </div>
        `;
    }
    
    document.getElementById('articleBody').innerHTML = '';
}

// Show Error
function showError() {
    const header = document.getElementById('articleHeader');
    if (header) {
        header.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <h1 style="color: #ef4444;">Error Loading Article</h1>
                <p style="color: #666;">Please try refreshing the page</p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 20px;">
                    Refresh Page
                </button>
            </div>
        `;
    }
}
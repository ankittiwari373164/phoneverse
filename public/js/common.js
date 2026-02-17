// ===================================
// COMMON FUNCTIONS - Used Across All Pages
// ===================================

// Utility: Format Category
function formatCategory(cat) {
    const map = {
        'mobile-news': '📱 NEWS',
        'reviews': '⭐ REVIEW',
        'android-updates': '🤖 ANDROID',
        'iphone-news': '🍎 IPHONE',
        'guides': '📚 GUIDE',
        'comparisons': '⚖️ COMPARE'
    };
    return map[cat] || cat.toUpperCase();
}

// Utility: Format Date
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Utility: Extract Text from HTML
function extractText(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

// Utility: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toggle Search Overlay
function toggleSearch() {
    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;
    
    overlay.classList.toggle('active');
    
    if (overlay.classList.contains('active')) {
        document.getElementById('searchInput').focus();
        setupSearchListener();
    } else {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').innerHTML = '';
    }
}

// Setup Search Listener
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let debounceTimer;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performQuickSearch(e.target.value);
        }, 300);
    });
    
    // Enter key to go to search page
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            window.location.href = `/search.html?q=${encodeURIComponent(e.target.value)}`;
        }
    });
}

// Quick Search (for overlay)
async function performQuickSearch(query) {
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        const resultsDiv = document.getElementById('searchResults');
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<p style="color: white; text-align: center; padding: 20px;">No results found</p>';
            return;
        }
        
        resultsDiv.innerHTML = results.slice(0, 5).map(article => `
            <a href="/article.html?slug=${article.slug}" class="search-result-item">
                <img src="${article.featured_image || '/images/placeholder.png'}" 
                     style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;"
                     onerror="this.src='/images/placeholder.png'">
                <div>
                    <h4>${escapeHtml(article.title)}</h4>
                    <p style="color: #ccc; font-size: 14px;">${formatDate(article.published_at)}</p>
                </div>
            </a>
        `).join('');
        
    } catch (error) {
        console.error('Search error:', error);
    }
}

// Toggle Mobile Menu
function toggleMobileMenu() {
    const nav = document.getElementById('mainNav');
    const toggle = document.querySelector('.menu-toggle');
    
    if (nav && toggle) {
        nav.classList.toggle('active');
        toggle.classList.toggle('active');
    }
}

// Subscribe Newsletter
function subscribeNewsletter(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    
    // Here you would send to your backend
    console.log('Newsletter subscription:', email);
    
    alert('Thank you for subscribing! 📧');
    e.target.reset();
}

// Scroll to Top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/Hide Back to Top Button
window.addEventListener('scroll', () => {
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }
});

// Share Functions
function shareTwitter() {
    const url = window.location.href;
    const title = document.title;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank', 'width=600,height=400');
}

function shareFacebook() {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
}

function shareWhatsApp() {
    const url = window.location.href;
    const title = document.title;
    window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard! 📋');
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

// Placeholder Image Fallback
document.addEventListener('DOMContentLoaded', () => {
    // Create placeholder image if it doesn't exist
    const images = document.querySelectorAll('img[src="/images/placeholder.png"]');
    images.forEach(img => {
        if (!img.complete) {
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"%3E%3Crect fill="%23e5e7eb" width="400" height="250"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="60" fill="%239ca3af"%3E📱%3C/text%3E%3C/svg%3E';
        }
    });
});
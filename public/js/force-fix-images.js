/**
 * FINAL FIX: Force correct image loading
 * Add this to your main.js or create a new file and include it in index.html
 */

(function() {
    'use strict';
    
    console.log('🔧 Image fix loaded - forcing correct URLs');
    
    // Method 1: Fix images on page load
    function fixAllImages() {
        const images = document.querySelectorAll('img');
        let fixedCount = 0;
        
        images.forEach(img => {
            const src = img.src || img.getAttribute('src');
            
            // If image is blank, broken, or points to placeholder
            if (!src || 
                src.includes('placeholder.png') || 
                src.includes('/images/uploads/') ||
                img.naturalWidth === 0) {
                
                // Get article data if available
                const card = img.closest('[data-featured-image]') || 
                            img.closest('.article-card') ||
                            img.closest('article');
                
                let newSrc = null;
                
                if (card && card.dataset.featuredImage) {
                    newSrc = card.dataset.featuredImage;
                } else {
                    // Fallback to generic tech image
                    newSrc = 'https://source.unsplash.com/1344x768/?smartphone,technology';
                }
                
                if (newSrc && newSrc.startsWith('http')) {
                    img.src = newSrc;
                    fixedCount++;
                    console.log('✅ Fixed image:', newSrc);
                }
            }
        });
        
        if (fixedCount > 0) {
            console.log(`✅ Fixed ${fixedCount} images`);
        }
    }
    
    // Method 2: Override fetch to add cache busting
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        let [url, options] = args;
        
        // Add cache busting to API calls
        if (url.includes('/api/')) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}_cache=${Date.now()}`;
            args[0] = url;
        }
        
        return originalFetch.apply(this, args);
    };
    
    // Method 3: Fix images after API loads
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
        this.addEventListener('load', function() {
            if (this.responseURL && this.responseURL.includes('/api/')) {
                setTimeout(fixAllImages, 100);
            }
        });
        return originalXHROpen.apply(this, args);
    };
    
    // Run fixes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixAllImages);
    } else {
        fixAllImages();
    }
    
    // Also fix on dynamic content load
    setTimeout(fixAllImages, 1000);
    setTimeout(fixAllImages, 3000);
    
    // Watch for new images being added
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(() => {
            fixAllImages();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
})();
/**
 * NUCLEAR OPTION - DIRECT IMAGE FIX
 * This directly sets image sources from the API data
 * Add this to your HTML right before </body>
 */

document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for articles to load
    setTimeout(fixImages, 500);
    setTimeout(fixImages, 1500);
    setTimeout(fixImages, 3000);
});

async function fixImages() {
    console.log('🔧 Running image fix...');
    
    // Get all article cards
    const cards = document.querySelectorAll('.article-card, article, [data-id]');
    
    if (cards.length === 0) {
        console.log('⚠️  No article cards found');
        return;
    }
    
    console.log(`Found ${cards.length} article cards`);
    
    // Fetch fresh article data
    try {
        const response = await fetch('/api/articles?_=' + Date.now());
        const articles = await response.json();
        
        console.log(`Loaded ${articles.length} articles from API`);
        
        // Fix each image
        cards.forEach((card, index) => {
            const img = card.querySelector('img');
            if (!img) return;
            
            // Get article ID or index
            const article = articles[index];
            if (!article) return;
            
            // Set the correct image URL
            if (article.featured_image && article.featured_image.startsWith('http')) {
                console.log(`✅ Setting image for: ${article.title.substring(0, 30)}...`);
                console.log(`   URL: ${article.featured_image}`);
                img.src = article.featured_image;
                img.style.display = 'block';
            } else {
                // Fallback
                const fallback = 'https://source.unsplash.com/1344x768/?smartphone,technology';
                img.src = fallback;
                console.log(`⚠️  Using fallback for: ${article.title.substring(0, 30)}...`);
            }
        });
        
        console.log('✅ Image fix complete');
        
    } catch (error) {
        console.error('❌ Image fix failed:', error);
        
        // Emergency fallback - set all images to Unsplash
        cards.forEach(card => {
            const img = card.querySelector('img');
            if (img) {
                img.src = 'https://source.unsplash.com/1344x768/?smartphone,technology';
            }
        });
    }
}

// Also run on window load
window.addEventListener('load', () => {
    setTimeout(fixImages, 1000);
});
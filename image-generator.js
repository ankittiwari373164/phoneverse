/**
 * IMAGE GENERATOR - CATEGORY TARGETED PICSUM PHOTOS
 * 
 * Features:
 * - Category-specific image ranges
 * - Keyword detection (iPhone, Samsung, etc.)
 * - Consistent images (same title = same image)
 * - 100% FREE forever
 * - No rate limits
 * - Professional quality photos
 */

class ImageGenerator {
    constructor() {
        console.log('✅ Image generator initialized');
        console.log('   Provider: Picsum Photos (Category-Targeted)');
        console.log('   Cost: FREE FOREVER');
        console.log('   Images: 1000+ professional photos');
    }

    /**
     * Create featured image for article
     * @param {string} title - Article title
     * @param {string} category - Article category
     * @returns {string} Image URL
     */
    async createFeaturedImage(title, category) {
        // Get targeted image ID based on category and keywords
        const imageId = this.getSmartImageId(title, category);
        
        // Picsum Photos URL with specific ID
        const url = `https://picsum.photos/id/${imageId}/1344/768`;
        
        console.log(`✅ Image for "${title.substring(0, 40)}..." → ID: ${imageId} (${category})`);
        return url;
    }

    /**
     * Smart image selection with keyword detection
     * Tries to match keywords first, falls back to category
     */
    getSmartImageId(title, category) {
        const titleLower = title.toLowerCase();
        
        // KEYWORD-BASED DETECTION (Priority 1)
        const keywordMap = {
            // Premium/sleek images for Apple products
            'iphone': [0, 1, 48, 119, 152, 225, 237, 287, 367, 445, 659, 718],
            'apple': [0, 1, 48, 119, 152, 225, 237, 287, 367, 445],
            'macbook': [48, 119, 152, 225, 237, 287, 367, 445, 478, 525],
            'ipad': [1, 48, 152, 225, 287, 367, 445, 525, 659],
            
            // Modern/tech images for Samsung
            'samsung': [10, 28, 63, 82, 96, 180, 200, 250, 381, 426, 548],
            'galaxy': [10, 28, 63, 82, 96, 180, 200, 250, 381, 426],
            
            // Clean tech for Google products
            'pixel': [1, 48, 82, 119, 169, 225, 287, 367, 445, 525, 593],
            'google': [1, 48, 82, 119, 169, 225, 287, 367, 445, 525],
            'android': [10, 28, 63, 96, 180, 287, 381, 445, 571, 593],
            
            // Other brands
            'oneplus': [20, 48, 96, 180, 250, 367, 426, 525, 616],
            'xiaomi': [28, 63, 96, 180, 250, 381, 445, 548, 616],
            'redmi': [28, 63, 96, 180, 250, 381, 445, 548],
            'realme': [20, 63, 96, 180, 250, 381, 426, 548],
            'oppo': [28, 63, 180, 250, 381, 426, 548, 616],
            'vivo': [28, 63, 180, 250, 381, 426, 548, 616],
            'nothing': [1, 48, 96, 169, 287, 367, 445, 525, 593],
            'motorola': [20, 48, 96, 180, 250, 367, 426, 525],
            
            // Topics
            'ai': [1, 10, 82, 96, 180, 287, 381, 445, 571, 659],
            'artificial intelligence': [1, 10, 82, 96, 180, 287, 381, 445],
            'gaming': [20, 96, 103, 152, 250, 367, 426, 525, 616, 718],
            'game': [20, 96, 103, 152, 250, 367, 426, 525, 616],
            'camera': [26, 39, 48, 55, 70, 103, 119, 152, 169, 225],
            'battery': [28, 63, 82, 96, 180, 250, 287, 381, 426],
            '5g': [1, 10, 48, 82, 180, 287, 367, 445, 525, 593],
            'software': [1, 10, 82, 96, 180, 287, 381, 445, 571],
            'update': [10, 48, 82, 180, 287, 367, 445, 525, 593]
        };
        
        // Check for keyword matches
        for (const [keyword, ids] of Object.entries(keywordMap)) {
            if (titleLower.includes(keyword)) {
                const hash = this.hashString(title);
                const index = Math.abs(hash) % ids.length;
                console.log(`   🎯 Keyword match: "${keyword}" → Using specialized image set`);
                return ids[index];
            }
        }
        
        // CATEGORY-BASED SELECTION (Fallback)
        return this.getCategoryImageId(title, category);
    }

    /**
     * Get image ID based on category
     * Each category has curated image IDs that look good
     */
    getCategoryImageId(title, category) {
        // Curated image ranges for each category
        const categoryRanges = {
            // Modern tech, gadgets, sleek devices
            'mobile-news': [
                0, 1, 10, 20, 25, 28, 30, 40, 48, 52, 63, 69, 
                82, 96, 106, 119, 152, 163, 164, 180, 182, 193, 
                201, 206, 225, 237, 244, 250, 287, 367, 381, 403
            ],
            
            // Product shots, close-ups, detailed views
            'reviews': [
                26, 39, 42, 48, 55, 70, 88, 103, 109, 119, 129, 
                152, 158, 169, 177, 180, 200, 225, 237, 239, 250, 
                269, 287, 292, 367, 381, 403, 426, 445, 478
            ],
            
            // Technology, modern, abstract tech
            'android-updates': [
                1, 10, 28, 30, 48, 63, 82, 96, 103, 119, 152, 
                169, 180, 193, 200, 225, 237, 250, 287, 292, 
                367, 381, 403, 426, 445, 478, 525, 548, 571, 593
            ],
            
            // Sleek, minimal, premium feel
            'iphone-news': [
                0, 1, 48, 63, 82, 96, 119, 152, 169, 180, 200, 
                225, 237, 244, 250, 287, 292, 367, 381, 403, 
                426, 445, 478, 503, 525, 548, 571, 593, 659, 718
            ],
            
            // Side-by-side suitable images
            'comparisons': [
                10, 20, 28, 39, 48, 82, 103, 119, 152, 180, 
                200, 225, 237, 250, 287, 292, 367, 381, 403, 
                426, 445, 478, 503, 525, 548, 571, 593, 616, 659
            ],
            
            // Educational, clear, informative
            'guides': [
                26, 48, 70, 82, 103, 119, 152, 169, 180, 200, 
                225, 237, 250, 287, 292, 367, 381, 403, 426, 
                445, 478, 503, 525, 548, 571, 593, 616, 659, 718
            ]
        };
        
        // Get range for category (default to mobile-news)
        const range = categoryRanges[category] || categoryRanges['mobile-news'];
        
        // Pick image from range based on title hash
        const hash = this.hashString(title);
        const index = Math.abs(hash) % range.length;
        
        return range[index];
    }

    /**
     * Simple hash function for consistent image selection
     * Same title always returns same hash
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
}

module.exports = ImageGenerator;
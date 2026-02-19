/**
 * SMART PICSUM GENERATOR
 * Maps article categories to specific photo ranges for relevance
 * 100% FREE FOREVER - No API keys, no rate limits
 */

class ImageGenerator {
    constructor() {
        console.log('✅ Image generator initialized');
        console.log('   Provider: Picsum Photos (Category-Targeted)');
        console.log('   Cost: FREE FOREVER');
        console.log('   Images: 1000+ professional photos');
    }

    /**
     * Get a featured image for an article
     * Uses SMART selection: keyword detection + category targeting
     */
    async createFeaturedImage(title, category) {
        // Try smart keyword-based selection first
        const imageId = this.getSmartImageId(title, category);
        
        // Picsum Photos URL
        const url = `https://picsum.photos/id/${imageId}/1344/768`;
        
        console.log(`✅ Image for "${title.substring(0, 40)}..." → ID: ${imageId} (${category})`);
        return url;
    }

    /**
     * Get image ID based on category preferences
     * Each category has a curated range of IDs that look good for that topic
     */
    getTargetedImageId(title, category) {
        // Hash the title for consistency (same title = same image)
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
            const char = title.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        // Category-specific image ID ranges
        // These IDs have been manually selected to look good for each category
        const categoryRanges = {
            // Modern tech, gadgets, sleek devices (darker, tech-focused)
            'mobile-news': [0, 1, 10, 20, 25, 28, 30, 40, 48, 52, 63, 69, 82, 96, 106, 119, 152, 163, 164, 180, 182, 193, 201, 206, 225, 237, 244, 250, 287, 367],
            
            // Product shots, close-ups, detailed views
            'reviews': [26, 39, 42, 48, 55, 70, 88, 103, 109, 119, 129, 152, 158, 169, 177, 180, 200, 225, 237, 239, 250, 269, 287, 292, 367, 381, 403, 426, 445, 478],
            
            // Technology, modern, abstract tech
            'android-updates': [1, 10, 28, 30, 48, 63, 82, 96, 103, 119, 152, 169, 180, 193, 200, 225, 237, 250, 287, 292, 367, 381, 403, 426, 445, 478, 525, 548, 571, 593],
            
            // Sleek, minimal, premium feel (for iPhone)
            'iphone-news': [0, 1, 48, 63, 82, 96, 119, 152, 169, 180, 200, 225, 237, 244, 250, 287, 292, 367, 381, 403, 426, 445, 478, 503, 525, 548, 571, 593, 659, 718],
            
            // Side-by-side suitable images
            'comparisons': [10, 20, 28, 39, 48, 82, 103, 119, 152, 180, 200, 225, 237, 250, 287, 292, 367, 381, 403, 426, 445, 478, 503, 525, 548, 571, 593, 616, 659, 718],
            
            // Educational, clear, informative feel
            'guides': [26, 48, 70, 82, 103, 119, 152, 169, 180, 200, 225, 237, 250, 287, 292, 367, 381, 403, 426, 445, 478, 503, 525, 548, 571, 593, 616, 659, 718, 783]
        };
        
        // Get the range for this category (or default range)
        const range = categoryRanges[category] || categoryRanges['mobile-news'];
        
        // Pick an image from the range based on the hash
        const index = Math.abs(hash) % range.length;
        return range[index];
    }

    /**
     * Alternative: Get image ID with keyword detection
     * Tries to match specific keywords in title to even more specific images
     */
    getSmartImageId(title, category) {
        const titleLower = title.toLowerCase();
        
        // Special cases for brands/topics
        const keywordMap = {
            // Premium/sleek images for Apple
            'iphone': [0, 1, 48, 119, 152, 225, 237, 287, 367, 445],
            'apple': [0, 1, 48, 119, 152, 225, 237, 287, 367, 445],
            'macbook': [48, 119, 152, 225, 237, 287, 367, 445, 478, 525],
            
            // Modern/tech images for Samsung
            'samsung': [10, 28, 63, 82, 96, 180, 200, 250, 381, 426],
            'galaxy': [10, 28, 63, 82, 96, 180, 200, 250, 381, 426],
            
            // Clean tech for Google
            'pixel': [1, 48, 82, 119, 169, 225, 287, 367, 445, 525],
            'google': [1, 48, 82, 119, 169, 225, 287, 367, 445, 525],
            
            // Abstract/tech for AI/software
            'ai': [1, 10, 82, 96, 180, 287, 381, 445, 571, 659],
            'software': [1, 10, 82, 96, 180, 287, 381, 445, 571, 659],
            
            // Dynamic for gaming
            'gaming': [20, 96, 103, 152, 250, 367, 426, 525, 616, 718],
            'game': [20, 96, 103, 152, 250, 367, 426, 525, 616, 718]
        };
        
        // Check if title contains any keywords
        for (const [keyword, ids] of Object.entries(keywordMap)) {
            if (titleLower.includes(keyword)) {
                // Use keyword-specific range
                let hash = 0;
                for (let i = 0; i < title.length; i++) {
                    hash = ((hash << 5) - hash) + title.charCodeAt(i);
                }
                const index = Math.abs(hash) % ids.length;
                console.log(`   🎯 Keyword match: "${keyword}" → Using specialized image set`);
                return ids[index];
            }
        }
        
        // No keyword match, use category-based selection
        return this.getTargetedImageId(title, category);
    }
}

module.exports = ImageGenerator;
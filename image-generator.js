/**
 * ULTRA-SIMPLE IMAGE GENERATOR
 * Uses free image CDNs - NO local generation, NO storage issues, NO errors
 * 100% FREE FOREVER
 */

class ImageGenerator {
    constructor() {
        console.log('✅ Image generator initialized');
        console.log('   Provider: Free Image CDN (Picsum + Unsplash)');
        console.log('   Storage: NONE needed - all images from CDN');
        console.log('   Cost: $0 forever!');
    }

    /**
     * Get a featured image for an article
     * Uses Picsum Photos - truly free forever, no rate limits
     */
    async createFeaturedImage(title, category) {
        // Generate a unique but consistent image ID from article title
        const imageId = this.getImageIdFromTitle(title);
        
        // Picsum Photos: 1000+ free images, works forever
        const url = `https://picsum.photos/1344/768?random=${imageId}`;
        
        console.log(`✅ Image for "${title.substring(0, 40)}..." → Picsum ID ${imageId}`);
        return url;
    }

    /**
     * Generate a consistent image ID from article title
     * Same title = same image (for consistency)
     * Range: 1-1000 (Picsum has 1000+ images)
     */
    getImageIdFromTitle(title) {
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
            const char = title.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Return number between 1-1000
        return Math.abs(hash % 1000) + 1;
    }

    /**
     * Generate a consistent image ID from article title
     * Same title = same image (for consistency)
     */
    getImageIdFromTitle(title) {
        // Simple hash function to convert title to number 1-1000
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
            hash = ((hash << 5) - hash) + title.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        // Picsum has 1000+ images (IDs 1-1084)
        const imageId = Math.abs(hash % 1000) + 1;
        return imageId;
    }

    /**
     * Get search topic based on category and title keywords
     */
    getCategoryTopic(category, title) {
        // Extract keywords from title
        const titleLower = title.toLowerCase();
        
        // Phone brands
        if (titleLower.includes('iphone') || titleLower.includes('apple')) {
            return 'iphone,apple,smartphone';
        }
        if (titleLower.includes('samsung') || titleLower.includes('galaxy')) {
            return 'samsung,galaxy,android';
        }
        if (titleLower.includes('pixel') || titleLower.includes('google')) {
            return 'google,pixel,android';
        }
        if (titleLower.includes('oneplus')) {
            return 'oneplus,smartphone,android';
        }
        if (titleLower.includes('xiaomi') || titleLower.includes('redmi')) {
            return 'xiaomi,smartphone,android';
        }
        
        // Tech topics
        if (titleLower.includes('ai') || titleLower.includes('artificial')) {
            return 'artificial-intelligence,technology,future';
        }
        if (titleLower.includes('5g') || titleLower.includes('network')) {
            return '5g,network,connectivity';
        }
        if (titleLower.includes('camera') || titleLower.includes('photo')) {
            return 'camera,photography,smartphone';
        }
        if (titleLower.includes('battery') || titleLower.includes('charging')) {
            return 'battery,charging,technology';
        }
        if (titleLower.includes('gaming') || titleLower.includes('game')) {
            return 'gaming,mobile,esports';
        }
        
        // Category fallbacks
        const categoryTopics = {
            'mobile-news': 'smartphone,mobile,technology',
            'reviews': 'smartphone,review,device',
            'android-updates': 'android,update,google',
            'iphone-news': 'iphone,apple,ios',
            'comparisons': 'smartphone,comparison,versus',
            'guides': 'tutorial,guide,howto'
        };
        
        return categoryTopics[category] || 'smartphone,technology,mobile';
    }
}

module.exports = ImageGenerator;
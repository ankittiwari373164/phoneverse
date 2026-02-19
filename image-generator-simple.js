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
     * Uses free CDN services - always works, never fails
     */
    async createFeaturedImage(title, category) {
        // Use Lorem Picsum for consistent, beautiful images
        // Alternative: Use Unsplash for topic-specific images
        
        const useMethod = 'picsum'; // Options: 'picsum' or 'unsplash'
        
        if (useMethod === 'picsum') {
            // Lorem Picsum: Random beautiful images with cache
            // Benefits: Faster, more consistent, better caching
            const imageId = this.getImageIdFromTitle(title);
            const url = `https://picsum.photos/id/${imageId}/1344/768`;
            console.log(`✅ Image URL: ${url.substring(0, 50)}...`);
            return url;
        } else {
            // Unsplash: Topic-specific images
            // Benefits: More relevant to article content
            const topic = this.getCategoryTopic(category, title);
            const url = `https://source.unsplash.com/1344x768/?${topic}`;
            console.log(`✅ Image URL: ${url}`);
            return url;
        }
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
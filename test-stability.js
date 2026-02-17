require('dotenv').config();
const ImageGenerator = require('./image-generator');

async function testStabilityAI() {
    console.log('🧪 Testing Stability AI Image Generation\n');
    console.log('═══════════════════════════════════════════════════════════════');

    // Check if API key is configured
    if (!process.env.STABILITY_API_KEY) {
        console.log('❌ STABILITY_API_KEY not found in .env file');
        console.log('   Get your key from: https://platform.stability.ai/account/keys\n');
        return;
    }

    console.log('✅ API Key found');
    console.log('✅ Starting image generation...\n');

    const generator = new ImageGenerator();

    const testCases = [
        { 
            title: 'Samsung Galaxy S26 Ultra - Revolutionary Camera System', 
            category: 'mobile-news' 
        },
        { 
            title: 'iPhone 16 Pro Max Review - The Best iPhone Ever Made?', 
            category: 'reviews' 
        },
        { 
            title: 'Android 15 Major Update - New Features Revealed', 
            category: 'android-updates' 
        }
    ];

    for (let i = 0; i < testCases.length; i++) {
        const test = testCases[i];
        console.log(`\n[${i + 1}/${testCases.length}] Generating: ${test.title}`);
        console.log(`Category: ${test.category}`);
        console.log('─────────────────────────────────────────────────────────────');

        try {
            const imagePath = await generator.createFeaturedImage(test.title, test.category);
            console.log(`✅ Success! Image saved to: ${imagePath}`);
        } catch (error) {
            console.error(`❌ Failed: ${error.message}`);
        }

        // Wait a bit between generations
        if (i < testCases.length - 1) {
            console.log('\n⏳ Waiting 3 seconds before next generation...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Test complete! Check ./public/images/uploads/ folder\n');
}

testStabilityAI().catch(console.error);
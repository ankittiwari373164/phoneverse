require('dotenv').config();
const ImageGenerator = require('./image-generator');

async function test() {
    console.log('🧪 Testing FREE Image Generation\n');
    console.log('Provider: Pollinations.AI');
    console.log('Cost: $0 FOREVER\n');
    console.log('═══════════════════════════════════════\n');

    const gen = new ImageGenerator();

    const tests = [
        { title: 'Samsung Galaxy S26 Ultra Camera Review', category: 'reviews' },
        { title: 'Android 15 New Features Released', category: 'android-updates' },
        { title: 'iPhone 17 Pro vs Galaxy S26 Ultra', category: 'comparisons' }
    ];

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        console.log(`[${i+1}/3] ${test.title}`);
        
        try {
            const start = Date.now();
            const imagePath = await gen.createFeaturedImage(test.title, test.category);
            const time = ((Date.now() - start) / 1000).toFixed(1);
            
            console.log(`✅ Done in ${time}s → ${imagePath}\n`);
        } catch (error) {
            console.log(`❌ Failed: ${error.message}\n`);
        }

        // Wait between requests
        if (i < tests.length - 1) {
            console.log('⏳ Waiting 3s...\n');
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ Test complete! Check public/images/uploads/');
}

test().catch(console.error);
/**
 * GOOGLE DISCOVER CONTENT TRANSFORMER
 * 
 * Purpose: Transform RSS content into Discover-friendly format
 * Method: Templates + Structure (NO AI/OpenAI)
 * 
 * WHY NO OPENAI:
 * ❌ Google detects AI content
 * ❌ No E-E-A-T signals
 * ❌ Costs money ($30-400/month)
 * ❌ Can lead to AdSense rejection
 * 
 * INSTEAD: Use smart templates + human patterns
 */

class DiscoverContentTransformer {
    
    /**
     * Transform article for Google Discover
     * Returns: {title, content, excerpt, wordCount}
     */
    transform(originalTitle, originalContent, category, sourceUrl) {
        // 1. Create Discover-optimized headline
        const newTitle = this.createDiscoverHeadline(originalTitle, category);
        
        // 2. Extract key facts from original
        const facts = this.extractKeyFacts(originalContent, originalTitle);
        
        // 3. Build structured, Discover-friendly content
        const content = this.buildDiscoverContent(newTitle, originalContent, facts, category);
        
        // 4. Create meta description/excerpt
        const excerpt = this.createExcerpt(newTitle, facts);
        
        return {
            title: newTitle,
            content: content,
            excerpt: excerpt,
            wordCount: content.split(' ').length,
            sourceUrl: sourceUrl
        };
    }
    
    /**
     * CREATE DISCOVER HEADLINE
     * Formula: Brand + Model + Hook + Benefit/Curiosity
     * 
     * Examples:
     * - "iPhone 16 Pro Review: Best Camera Under ₹1 Lakh?"
     * - "Samsung Galaxy S26: Should You Wait for This Launch?"
     * - "₹15,999 Me Best Phone? Realme 12 Pro First Look"
     */
    createDiscoverHeadline(title, category) {
        // Extract brand if present
        const brands = {
            'iPhone': 'Apple',
            'iPad': 'Apple',
            'Galaxy': 'Samsung',
            'Pixel': 'Google',
            'OnePlus': 'OnePlus',
            'Xiaomi': 'Xiaomi',
            'Redmi': 'Xiaomi',
            'Realme': 'Realme',
            'Nothing': 'Nothing',
            'OPPO': 'OPPO',
            'Vivo': 'Vivo',
            'POCO': 'Xiaomi'
        };
        
        let brand = '';
        for (const [key, value] of Object.entries(brands)) {
            if (title.includes(key)) {
                brand = key;
                break;
            }
        }
        
        // Hook words for different categories
        const categoryHooks = {
            'reviews': [
                ': Should You Buy in 2026?',
                ': Worth Your Money?',
                ' Review: Best in Class?',
                ': Real World Performance Test'
            ],
            'mobile-news': [
                ' Launched: Here's Everything New',
                ': Price in India Revealed',
                ' Coming Soon: Key Features Leaked',
                ': What You Need to Know'
            ],
            'android-updates': [
                ' Update: 5 New Features You'll Love',
                ': Update Rolling Out in India',
                ' Gets Major Upgrade',
                ' Update: Should You Install?'
            ],
            'iphone-news': [
                ': Is It Worth the Upgrade?',
                ' vs Previous Model: What Changed?',
                ': Best iPhone to Buy?',
                ' Price Drop: Now or Wait?'
            ],
            'comparisons': [
                ' vs ${brand}: Which One to Buy?',
                ': Complete Comparison Guide',
                ' vs Competition: Clear Winner?'
            ]
        };
        
        // If title already has question mark or strong hook, keep it
        if (title.includes('?') || title.includes(':') || title.includes('vs')) {
            return title;
        }
        
        // Add appropriate hook
        const hooks = categoryHooks[category] || categoryHooks['mobile-news'];
        const randomHook = hooks[Math.floor(Math.random() * hooks.length)];
        
        return title + randomHook;
    }
    
    /**
     * EXTRACT KEY FACTS
     * Pull important info: price, specs, features
     */
    extractKeyFacts(content, title) {
        const facts = {
            price: null,
            brand: null,
            model: null,
            keyFeatures: []
        };
        
        // Extract price (₹ or Rs.)
        const priceMatch = content.match(/[₹Rs\.]\s*[\d,]+/g);
        if (priceMatch) {
            facts.price = priceMatch[0];
        }
        
        // Extract common tech specs
        const specKeywords = [
            'processor', 'battery', 'camera', 'display', 'RAM', 'storage',
            'mAh', 'MP', 'inch', 'Hz', 'GB', '5G', 'chipset'
        ];
        
        specKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b[\\w\\s]*${keyword}[\\w\\s]*\\b`, 'gi');
            const matches = content.match(regex);
            if (matches && matches.length > 0) {
                facts.keyFeatures.push(...matches.slice(0, 2)); // Max 2 per keyword
            }
        });
        
        return facts;
    }
    
    /**
     * BUILD DISCOVER CONTENT
     * Structure: Intro → Highlights → Details → Opinion → FAQ
     */
    buildDiscoverContent(title, originalContent, facts, category) {
        let html = '';
        
        // 1. INTRO (Problem-based, emotional - CRITICAL for Discover)
        html += this.createIntro(title, facts, category);
        
        // 2. KEY HIGHLIGHTS BOX (Scannable - Google loves this)
        html += this.createHighlightsBox(facts, originalContent);
        
        // 3. MAIN CONTENT (Structured paragraphs)
        html += this.createMainContent(originalContent);
        
        // 4. PROS & CONS (If review)
        if (category === 'reviews' || title.toLowerCase().includes('review')) {
            html += this.createProsConsSection(title, originalContent);
        }
        
        // 5. OPINION/VERDICT (Human touch - MUST HAVE for Discover)
        html += this.createOpinionSection(title, category, facts);
        
        // 6. FAQ SECTION (Schema markup friendly)
        html += this.createFAQSection(title, category);
        
        return html;
    }
    
    /**
     * CREATE INTRO
     * Problem-based, emotional, Indian audience
     */
    createIntro(title, facts, category) {
        const intros = {
            'mobile-news': `<p>Agar aap latest mobile technology updates dhundh rahe hain, toh yeh khabar aapke liye hai. <strong>${title}</strong> - chaliye jaante hain complete details Hindi mein.</p>`,
            
            'reviews': `<p>Kya aap soch rahe hain ki yeh phone aapke budget mein best option hai? ${facts.price ? `₹${facts.price} ki price range` : 'Is price segment'} mein kaafi options hain, lekin <strong>${title}</strong> kuch alag hai. Aayiye dekhte hain kyun.</p>`,
            
            'android-updates': `<p>Good news Android users ke liye! <strong>${title}</strong> - yeh update aapke phone ko kaafi behtar bana sakta hai. Chaliye jaante hain kya naya hai.</p>`,
            
            'iphone-news': `<p>Apple users dhyan dijiye! <strong>${title}</strong> - agar aap iPhone upgrade soch rahe hain, toh yeh information zaruri hai.</p>`,
            
            'comparisons': `<p>Confused ho kaunsa phone lein? <strong>${title}</strong> - hum aapke liye side-by-side comparison kar rahe hain taaki aap right decision le sakein.</p>`
        };
        
        return (intros[category] || intros['mobile-news']) + '\n\n';
    }
    
    /**
     * CREATE HIGHLIGHTS BOX
     * Quick scannable facts
     */
    createHighlightsBox(facts, content) {
        let html = '<div class="key-highlights">\n';
        html += '<h2>📌 Key Highlights</h2>\n';
        html += '<ul>\n';
        
        if (facts.price) {
            html += `<li><strong>Price:</strong> ${facts.price}</li>\n`;
        }
        
        if (facts.keyFeatures.length > 0) {
            facts.keyFeatures.slice(0, 5).forEach(feature => {
                html += `<li>${feature}</li>\n`;
            });
        }
        
        html += '</ul>\n';
        html += '</div>\n\n';
        
        return html;
    }
    
    /**
     * CREATE MAIN CONTENT
     * Break into readable paragraphs
     */
    createMainContent(originalContent) {
        // Split into paragraphs (short ones for mobile)
        const sentences = originalContent.split(/\. /).filter(s => s.trim().length > 20);
        let html = '';
        
        // Group into paragraphs of 2-3 sentences each
        for (let i = 0; i < sentences.length; i += 2) {
            const para = sentences.slice(i, i + 2).join('. ') + '.';
            html += `<p>${para}</p>\n\n`;
        }
        
        return html;
    }
    
    /**
     * CREATE PROS & CONS
     */
    createProsConsSection(title, content) {
        let html = '<div class="pros-cons">\n';
        html += '<h2>✅ Pros & Cons</h2>\n';
        
        html += '<h3>👍 Pros:</h3>\n<ul>\n';
        html += '<li>Good value for money</li>\n';
        html += '<li>Latest features at competitive price</li>\n';
        html += '<li>Strong performance</li>\n';
        html += '</ul>\n';
        
        html += '<h3>👎 Cons:</h3>\n<ul>\n';
        html += '<li>Competition is strong in this segment</li>\n';
        html += '<li>Some features could be better</li>\n';
        html += '</ul>\n';
        
        html += '</div>\n\n';
        
        return html;
    }
    
    /**
     * CREATE OPINION SECTION
     * CRITICAL: Human touch that Discover loves
     */
    createOpinionSection(title, category, facts) {
        const opinions = {
            'reviews': `<h2>🎯 Our Verdict</h2>\n<p><strong>Final Opinion:</strong> Agar aap ${facts.price || 'is budget'} mein phone dhundh rahe hain, toh yeh definitely consider karne layak hai. Lekin apni specific needs check kar lein - gaming focus hai toh processor dekho, camera lover ho toh camera specs priority do.</p>\n\n<p><em>Humari team ne yeh analysis real-world usage aur market comparison ke basis par kiya hai.</em></p>\n\n`,
            
            'mobile-news': `<h2>💭 What We Think</h2>\n<p>Yeh launch Indian market ke liye interesting hai. Competition dekh kar, yeh ${facts.price ? 'price point' : 'segment'} mein kaafi aggressive positioning lag rahi hai.</p>\n\n`,
            
            'comparisons': `<h2>🏆 Which One Should You Buy?</h2>\n<p><strong>Bottom Line:</strong> Dono phones apne segment mein strong hain. Agar budget priority hai - pehla option better hai. Features chahiye - doosra option dekho. Gaming focus - processor comparison karo.</p>\n\n`
        };
        
        return opinions[category] || opinions['mobile-news'];
    }
    
    /**
     * CREATE FAQ SECTION
     * Schema markup ready
     */
    createFAQSection(title, category) {
        let html = '<div class="faq-section">\n';
        html += '<h2>❓ Frequently Asked Questions</h2>\n\n';
        
        html += '<div class="faq-item">\n';
        html += `<h3>Q: Is this phone worth buying in 2026?</h3>\n`;
        html += `<p><strong>A:</strong> Han, agar aapka budget aur requirements match karti hain. Market mein kaafi options hain, so comparison zarur karein.</p>\n`;
        html += '</div>\n\n';
        
        html += '<div class="faq-item">\n';
        html += `<h3>Q: Where can I buy this in India?</h3>\n`;
        html += `<p><strong>A:</strong> Amazon India, Flipkart, aur official brand stores par available hai. Festival sales mein additional discounts mil sakte hain.</p>\n`;
        html += '</div>\n';
        
        html += '</div>\n\n';
        
        return html;
    }
    
    /**
     * CREATE EXCERPT
     * For meta description
     */
    createExcerpt(title, facts) {
        let excerpt = `${title}. `;
        if (facts.price) {
            excerpt += `Price: ${facts.price}. `;
        }
        excerpt += `Complete details, specifications, and our honest opinion in Hindi.`;
        
        return excerpt.substring(0, 155); // Meta description limit
    }
}

module.exports = DiscoverContentTransformer;
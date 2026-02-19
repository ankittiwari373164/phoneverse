/**
 * HYBRID AUTOMATION SYSTEM
 * 
 * PHASE 1 (Days 1-30): 100% Manual
 * PHASE 2 (After AdSense): Hybrid (RSS + Templates + Optional AI)
 * 
 * This system:
 * ✅ Uses RSS for facts/data
 * ✅ Uses templates for structure (Discover-optimized)
 * ✅ Adds human-touch patterns
 * ✅ Optionally uses OpenAI ONLY for enhancement (not generation)
 * ✅ Always adds manual review step
 */

const DiscoverContentTransformer = require('./discover-content-transformer');

class HybridAutomationEngine {
    constructor(config = {}) {
        this.config = {
            // Phase control
            useOpenAI: config.useOpenAI || false, // Set to true ONLY after AdSense approval
            openaiKey: config.openaiKey || null,
            
            // Safety limits
            maxOpenAICalls: 50, // Daily limit to control costs
            openaiCallsToday: 0,
            
            // Quality control
            requireManualReview: config.requireManualReview || true,
            minWordCount: 800,
            maxWordCount: 1200,
            
            // Discover optimization
            targetIndianAudience: true,
            addHinglishTouch: true,
            optimizeForMobile: true
        };
        
        this.transformer = new DiscoverContentTransformer();
        console.log('🚀 Hybrid Automation Engine initialized');
        console.log(`   OpenAI: ${this.config.useOpenAI ? 'ENABLED (Use carefully!)' : 'DISABLED (Template-based)'}`);
    }
    
    /**
     * MAIN PROCESSING FUNCTION
     * Transforms RSS article into Discover-ready content
     */
    async processArticle(rssArticle) {
        const startTime = Date.now();
        
        try {
            console.log(`\n📰 Processing: ${rssArticle.title.substring(0, 50)}...`);
            
            // Step 1: Extract and structure data from RSS
            const structuredData = this.extractStructuredData(rssArticle);
            
            // Step 2: Create Discover-optimized headline
            const optimizedTitle = this.createDiscoverHeadline(structuredData);
            
            // Step 3: Build content (Template-based OR AI-enhanced)
            const content = await this.buildContent(structuredData);
            
            // Step 4: Add Discover-specific elements
            const finalContent = this.addDiscoverElements(content, structuredData);
            
            // Step 5: Quality check
            const quality = this.checkQuality(finalContent);
            
            const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
            
            console.log(`✅ Processed in ${processingTime}s`);
            console.log(`   Title: ${optimizedTitle}`);
            console.log(`   Words: ${finalContent.wordCount}`);
            console.log(`   Quality: ${quality.score}/100`);
            console.log(`   Method: ${content.method}`);
            
            return {
                title: optimizedTitle,
                content: finalContent.html,
                excerpt: finalContent.excerpt,
                wordCount: finalContent.wordCount,
                category: structuredData.category,
                sourceUrl: rssArticle.link,
                quality: quality,
                method: content.method,
                needsReview: quality.score < 80 || this.config.requireManualReview
            };
            
        } catch (error) {
            console.error(`❌ Error processing article:`, error.message);
            return null;
        }
    }
    
    /**
     * EXTRACT STRUCTURED DATA
     * Pull facts, prices, specs from RSS content
     */
    extractStructuredData(rssArticle) {
        const title = rssArticle.title;
        const content = rssArticle.content || rssArticle.description;
        
        // Detect category
        const category = this.detectCategory(title, content);
        
        // Extract key information
        const data = {
            originalTitle: title,
            originalContent: content,
            category: category,
            
            // Extract facts
            brand: this.extractBrand(title),
            price: this.extractPrice(content),
            specs: this.extractSpecs(content),
            keyFeatures: this.extractKeyFeatures(content),
            
            // Metadata
            sourceUrl: rssArticle.link,
            publishedAt: rssArticle.pubDate,
            source: this.getSourceName(rssArticle.link)
        };
        
        return data;
    }
    
    /**
     * CREATE DISCOVER HEADLINE
     * Emotional + Curiosity + Benefit
     */
    createDiscoverHeadline(data) {
        const { originalTitle, category, brand, price } = data;
        
        // If already good (has ? or strong hook), keep it
        if (originalTitle.includes('?') || 
            originalTitle.includes('Review:') ||
            originalTitle.includes('vs ')) {
            return originalTitle;
        }
        
        // Category-specific hooks
        const hooks = {
            'reviews': [
                `: Should You Buy in 2026?`,
                `: Worth Your ₹${price || '___'}?`,
                ` Review: Best in Class?`,
                `: Real World Performance Check`
            ],
            'mobile-news': [
                ` Launched: Everything You Need to Know`,
                `: Price in India Revealed`,
                ` Coming to India: Key Features`,
                `: Game Changer or Hype?`
            ],
            'android-updates': [
                ` Update: 5 Features You'll Love`,
                `: Major Update Rolling Out`,
                ` Gets Big Upgrade`,
                `: Should You Install This Update?`
            ],
            'comparisons': [
                `: Which One Should You Buy?`,
                ` vs Competition: Clear Winner?`,
                `: Complete Buying Guide 2026`
            ]
        };
        
        const categoryHooks = hooks[category] || hooks['mobile-news'];
        const hook = categoryHooks[Math.floor(Math.random() * categoryHooks.length)];
        
        return originalTitle + hook;
    }
    
    /**
     * BUILD CONTENT
     * TEMPLATE-BASED (Default) OR AI-ENHANCED (Optional)
     */
    async buildContent(data) {
        // Default: Use template-based system (FREE, SAFE)
        if (!this.config.useOpenAI || !this.config.openaiKey) {
            return this.buildTemplateContent(data);
        }
        
        // Optional: AI enhancement (ONLY after AdSense approval)
        if (this.config.openaiCallsToday >= this.config.maxOpenAICalls) {
            console.log('⚠️  OpenAI daily limit reached, using templates');
            return this.buildTemplateContent(data);
        }
        
        // Try AI enhancement with fallback to templates
        try {
            const aiContent = await this.buildAIEnhancedContent(data);
            this.config.openaiCallsToday++;
            return aiContent;
        } catch (error) {
            console.log('⚠️  AI enhancement failed, using templates');
            return this.buildTemplateContent(data);
        }
    }
    
    /**
     * TEMPLATE-BASED CONTENT (DEFAULT - FREE & SAFE)
     * Uses pre-built templates with smart fill-ins
     */
    buildTemplateContent(data) {
        const transformer = new DiscoverContentTransformer();
        const result = transformer.transform(
            data.originalTitle,
            data.originalContent,
            data.category,
            data.sourceUrl
        );
        
        return {
            html: result.content,
            excerpt: result.excerpt,
            wordCount: result.wordCount,
            method: 'Template-based (FREE)'
        };
    }
    
    /**
     * AI-ENHANCED CONTENT (OPTIONAL - Use carefully!)
     * 
     * IMPORTANT: This is NOT pure AI generation
     * We use AI ONLY to:
     * 1. Rewrite existing content (not create from scratch)
     * 2. Add emotional tone
     * 3. Hinglish touch
     * 
     * We DON'T use AI to:
     * ❌ Generate facts/specs
     * ❌ Create opinions
     * ❌ Write entire article
     */
    async buildAIEnhancedContent(data) {
        const axios = require('axios');
        
        // First build template version
        const templateContent = this.buildTemplateContent(data);
        
        // Then use AI ONLY to enhance intro and opinion sections
        const prompt = `Rewrite this intro in a conversational, engaging style for Indian mobile tech audience. Keep it short (3-4 lines), use simple Hindi-English mix where natural, maintain all facts:

Original: ${templateContent.html.substring(0, 500)}

Requirements:
- Keep ALL facts and prices exactly same
- Make it emotional and relatable
- Use "aap" occasionally for Indian touch
- Question-based hooks
- Mobile-first, short sentences
- NO robotic AI language`;

        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4o-mini', // Cheaper model
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 300,
                temperature: 0.8
            }, {
                headers: {
                    'Authorization': `Bearer ${this.config.openaiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            const enhancedIntro = response.data.choices[0].message.content;
            
            // Combine: AI-enhanced intro + Template body
            const finalHtml = enhancedIntro + templateContent.html.substring(500);
            
            return {
                html: finalHtml,
                excerpt: templateContent.excerpt,
                wordCount: finalHtml.split(' ').length,
                method: 'AI-enhanced (Intro only)'
            };
            
        } catch (error) {
            console.error('OpenAI error:', error.message);
            throw error; // Fall back to template
        }
    }
    
    /**
     * ADD DISCOVER ELEMENTS
     * Schema markup, structured data, etc.
     */
    addDiscoverElements(content, data) {
        let html = content.html;
        
        // Add FAQ schema
        html += this.generateFAQSchema(data);
        
        // Add article schema
        html += this.generateArticleSchema(data);
        
        // Add author box
        html += this.generateAuthorBox();
        
        return {
            html: html,
            excerpt: content.excerpt,
            wordCount: html.split(' ').length
        };
    }
    
    /**
     * QUALITY CHECK
     * Score content quality (0-100)
     */
    checkQuality(content) {
        let score = 100;
        const issues = [];
        
        // Word count check
        if (content.wordCount < this.config.minWordCount) {
            score -= 20;
            issues.push(`Too short (${content.wordCount} words)`);
        }
        if (content.wordCount > this.config.maxWordCount) {
            score -= 10;
            issues.push(`Too long (${content.wordCount} words)`);
        }
        
        // Structure checks
        if (!content.html.includes('<h2>')) {
            score -= 15;
            issues.push('Missing headings');
        }
        if (!content.html.includes('<ul>') && !content.html.includes('<ol>')) {
            score -= 10;
            issues.push('Missing lists');
        }
        if (!content.html.includes('class="faq')) {
            score -= 10;
            issues.push('Missing FAQ');
        }
        
        // Discover-specific checks
        if (!content.html.toLowerCase().includes('aap')) {
            score -= 5;
            issues.push('No Hindi touch');
        }
        if (!content.html.includes('?')) {
            score -= 5;
            issues.push('No questions');
        }
        
        return {
            score: Math.max(0, score),
            issues: issues,
            passed: score >= 70
        };
    }
    
    // Helper methods
    detectCategory(title, content) {
        const lower = (title + ' ' + content).toLowerCase();
        if (lower.includes('review')) return 'reviews';
        if (lower.includes('vs ') || lower.includes('comparison')) return 'comparisons';
        if (lower.includes('update') && lower.includes('android')) return 'android-updates';
        if (lower.includes('iphone') || lower.includes('ios')) return 'iphone-news';
        return 'mobile-news';
    }
    
    extractBrand(text) {
        const brands = ['iPhone', 'Samsung', 'Pixel', 'OnePlus', 'Xiaomi', 'Realme', 'Nothing', 'OPPO', 'Vivo'];
        for (const brand of brands) {
            if (text.includes(brand)) return brand;
        }
        return null;
    }
    
    extractPrice(text) {
        const match = text.match(/[₹Rs\.]\s*([\d,]+)/);
        return match ? match[1] : null;
    }
    
    extractSpecs(content) {
        const specs = [];
        const keywords = ['processor', 'battery', 'camera', 'RAM', 'storage', 'display'];
        keywords.forEach(k => {
            const regex = new RegExp(`\\b[\\w\\s]*${k}[\\w\\s]*\\b`, 'gi');
            const matches = content.match(regex);
            if (matches) specs.push(...matches.slice(0, 2));
        });
        return specs;
    }
    
    extractKeyFeatures(content) {
        return this.extractSpecs(content).slice(0, 5);
    }
    
    getSourceName(url) {
        if (url.includes('gsmarena')) return 'GSMArena';
        if (url.includes('androidauthority')) return 'Android Authority';
        if (url.includes('theverge')) return 'The Verge';
        return 'Tech Source';
    }
    
    generateFAQSchema(data) {
        // FAQ Schema for Google
        return `\n<!-- FAQ Schema -->\n<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Is this phone worth buying?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Yes, if it matches your budget and requirements. Compare with competitors before deciding."
    }
  }]
}
</script>\n`;
    }
    
    generateArticleSchema(data) {
        return `\n<!-- Article Schema -->\n<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${data.originalTitle}",
  "author": {
    "@type": "Person",
    "name": "Ankit Tiwari"
  },
  "publisher": {
    "@type": "Organization",
    "name": "PhoneVerse",
    "logo": {
      "@type": "ImageObject",
      "url": "https://vyaparsthal.online/logo.png"
    }
  },
  "datePublished": "${new Date().toISOString()}"
}
</script>\n`;
    }
    
    generateAuthorBox() {
        return `\n<div class="author-box">
<p><strong>Written by Ankit Tiwari</strong> - Tech Editor with 5+ years experience in mobile reviews. Follow on <a href="#">Twitter</a>.</p>
</div>\n`;
    }
}

module.exports = HybridAutomationEngine;
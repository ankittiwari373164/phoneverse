const Parser = require('rss-parser');
const axios = require('axios');

class FreeNewsAggregator {
    constructor() {
        this.parser = new Parser({
            customFields: {
                item: ['media:content', 'content:encoded']
            }
        });

        this.feeds = [
            {
                name: 'GSMArena',
                url: 'https://www.gsmarena.com/rss-news-reviews.php3',
                category: 'mobile-news'
            },
            {
                name: 'Android Authority',
                url: 'https://www.androidauthority.com/feed/',
                category: 'android-updates'
            },
            {
                name: 'The Verge',
                url: 'https://www.theverge.com/rss/index.xml',
                category: 'mobile-news'
            },
            {
                name: 'PhoneArena',
                url: 'https://www.phonearena.com/feed',
                category: 'reviews'
            },
            {
                name: 'Android Central',
                url: 'https://www.androidcentral.com/feed',
                category: 'android-updates'
            },
            {
                name: 'XDA Developers',
                url: 'https://www.xda-developers.com/feed/',
                category: 'android-updates'
            },
            {
                name: 'Android Police',
                url: 'https://www.androidpolice.com/feed/',
                category: 'mobile-news'
            }
        ];
    }

    async fetchAllNews() {
        console.log('📰 Fetching news from RSS feeds...');
        const allNews = [];

        for (const feed of this.feeds) {
            try {
                const feedData = await this.parser.parseURL(feed.url);
                
                console.log(`✅ ${feed.name}: ${feedData.items.length} articles`);

                // Take ALL articles from feed (not just recent ones)
                feedData.items.forEach(item => {
                    allNews.push({
                        originalTitle: item.title,
                        originalContent: this.extractContent(item),
                        sourceUrl: item.link,
                        publishedAt: new Date(item.pubDate || item.isoDate || Date.now()),
                        category: feed.category,
                        sourceName: feed.name
                    });
                });

            } catch (error) {
                console.error(`❌ Error fetching ${feed.name}:`, error.message);
            }
        }

        // Sort by publish date (newest first)
        allNews.sort((a, b) => b.publishedAt - a.publishedAt);

        // Filter: Last 48 hours (more flexible)
        const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
        const recentNews = allNews.filter(news => 
            news.publishedAt.getTime() > twoDaysAgo
        );

        console.log(`📰 Total articles from all sources: ${allNews.length}`);
        console.log(`📰 Recent articles (last 48h): ${recentNews.length}`);
        
        return recentNews;
    }

    extractContent(item) {
        let content = item['content:encoded'] || 
                     item.content || 
                     item.contentSnippet || 
                     item.description || 
                     '';

        // Remove HTML tags
        content = content.replace(/<[^>]*>/g, '');
        
        // Clean up
        content = content
            .replace(/\s+/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&#039;/g, "'")
            .trim();

        return content;
    }
}

class HumanLikeRewriter {
    constructor(anthropicApiKey) {
        this.apiKey = anthropicApiKey;
    }

    async rewriteWithPersonality(originalTitle, originalContent, category) {
        const prompt = `You are a tech journalist writing for a phone news website.

ORIGINAL TITLE: ${originalTitle}
ORIGINAL CONTENT: ${originalContent}

YOUR TASK:
Write a COMPLETELY ORIGINAL article (800-1200 words) with:
1. NO plagiarism - rewrite everything in your own words
2. Add YOUR OPINION and analysis
3. Use conversational but professional tone
4. Include:
   - Brief overview paragraph
   - Key highlights/specifications
   - Your analysis
   - Comparison with competitors (if relevant)
   - Value/pricing perspective
   - Final verdict

IMPORTANT:
- Write like a human, not AI
- Use varied sentence structure
- Add personal insights
- Category: ${category}

Write the complete article NOW (NO title prefix like "Title:", just start):`;

        try {
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.3-70b-versatile',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.9,
                    max_tokens: 2500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            const content = response.data.choices[0].message.content;
            
            return {
                title: this.extractTitle(content, originalTitle),
                content: this.formatContent(content),
                wordCount: content.split(' ').length
            };

        } catch (error) {
            console.error('❌ Groq error:', error.message);
            return this.fallbackRewrite(originalTitle, originalContent);
        }
    }

    extractTitle(content, originalTitle) {
        // Try to extract title from first line
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
            const firstLine = lines[0].replace(/^#+\s*/, '').trim();
            if (firstLine.length > 10 && firstLine.length < 200) {
                return firstLine;
            }
        }
        return originalTitle;
    }

    formatContent(content) {
        let formatted = content;

        // Remove title if at start
        formatted = formatted.replace(/^#+ .+\n+/m, '');

        // Convert markdown to HTML
        formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Convert paragraphs
        const paragraphs = formatted.split('\n\n');
        formatted = paragraphs.map(p => {
            p = p.trim();
            if (!p) return '';
            if (p.startsWith('<')) return p;
            return `<p>${p}</p>`;
        }).join('\n');

        return formatted;
    }

    fallbackRewrite(title, content) {
        return {
            title: title,
            content: `<p>${content}</p>`,
            wordCount: content.split(' ').length
        };
    }
}

module.exports = {
    FreeNewsAggregator,
    HumanLikeRewriter
};
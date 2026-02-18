const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiRewriter {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }

    async rewriteWithPersonality(originalTitle, originalContent, category) {
        try {
            const prompt = this.buildPrompt(originalTitle, originalContent, category);
            
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Parse response
            const lines = text.split('\n').filter(line => line.trim());
            
            let title = originalTitle;
            let content = text;
            
            // Try to extract title from response
            const titleMatch = text.match(/^#\s+(.+)$/m);
            if (titleMatch) {
                title = titleMatch[1].trim();
                content = text.replace(titleMatch[0], '').trim();
            }
            
            // Ensure HTML formatting
            if (!content.includes('<p>')) {
                const paragraphs = content.split('\n\n').filter(p => p.trim());
                content = paragraphs.map(p => `<p>${p.trim()}</p>`).join('\n');
            }
            
            const wordCount = content.split(/\s+/).length;
            
            console.log(`✅ Gemini rewrote: ${wordCount} words`);
            
            return {
                title: title,
                content: content,
                wordCount: wordCount
            };
            
        } catch (error) {
            console.error('❌ Gemini error:', error.message);
            
            // Fallback to basic rewrite
            return {
                title: originalTitle,
                content: `<p>${originalContent}</p>`,
                wordCount: originalContent.split(/\s+/).length
            };
        }
    }

    buildPrompt(title, content, category) {
        const personalities = {
            'mobile-news': 'tech-savvy journalist',
            'reviews': 'experienced tech reviewer',
            'android-updates': 'Android enthusiast',
            'iphone-news': 'Apple ecosystem expert',
            'comparisons': 'unbiased tech analyst',
            'guides': 'helpful tech educator'
        };

        const personality = personalities[category] || 'tech journalist';

        return `You are a ${personality} writing for PhoneVerse, a mobile technology news website.

ORIGINAL ARTICLE:
Title: ${title}
Content: ${content}

TASK:
Rewrite this article completely in your own words to be:
1. 100% unique and plagiarism-free
2. Engaging and professional
3. Well-structured with clear paragraphs
4. 300-500 words long
5. SEO-optimized with natural keyword usage

IMPORTANT:
- Start with a catchy headline (use # before the title)
- Write in an engaging, conversational tone
- Add context and insights beyond the original
- Break into clear paragraphs (separate with blank lines)
- Do NOT copy any phrases from the original
- Focus on what readers care about

OUTPUT FORMAT:
# Your Catchy Headline Here

Your rewritten article content here with multiple paragraphs...

Each paragraph should be separated by a blank line...

End with a strong conclusion or call-to-action...`;
    }
}

module.exports = GeminiRewriter;
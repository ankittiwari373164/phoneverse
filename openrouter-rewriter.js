const axios = require('axios');

class OpenRouterRewriter {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        // Updated free model that works: meta-llama/llama-3.2-3b-instruct:free
        this.model = 'meta-llama/llama-3.2-3b-instruct:free';
    }

    async rewriteWithPersonality(originalTitle, originalContent, category) {
        try {
            const prompt = this.buildPrompt(originalTitle, originalContent, category);
            
            const response = await axios.post(this.apiUrl, {
                model: this.model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://phoneverse.com',
                    'X-Title': 'PhoneVerse News'
                }
            });

            const text = response.data.choices[0].message.content;
            
            // Parse response
            let title = originalTitle;
            let content = text;
            
            // Try to extract title
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
            
            console.log(`✅ OpenRouter rewrote: ${wordCount} words`);
            
            return {
                title: title,
                content: content,
                wordCount: wordCount
            };
            
        } catch (error) {
            console.error('❌ OpenRouter error:', error.response?.data || error.message);
            
            // Fallback
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
1. 100% unique and plagiarism-free (no copying from original)
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

module.exports = OpenRouterRewriter;
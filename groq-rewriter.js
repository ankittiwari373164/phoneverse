const axios = require('axios');

class GroqRewriter {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    }

    async rewriteWithPersonality(originalTitle, originalContent, category) {
        const prompt = `You are a tech journalist. Rewrite this phone news article in your own words.

ORIGINAL TITLE: ${originalTitle}
ORIGINAL: ${originalContent}

INSTRUCTIONS:
- Rewrite completely (no plagiarism)
- Add your opinion
- 800-1200 words
- Professional but conversational tone
- Include H2 headings
- Category: ${category}

Write the article NOW:`;

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: 'llama-3.3-70b-versatile', // Free model
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional tech journalist writing original phone news articles.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.9,
                    max_tokens: 2000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const content = response.data.choices[0].message.content;
            
            return {
                title: this.extractTitle(content, originalTitle),
                content: content,
                wordCount: content.split(' ').length
            };

        } catch (error) {
            console.error('❌ Groq error:', error.message);
            return this.fallbackRewrite(originalTitle, originalContent);
        }
    }

    extractTitle(content, originalTitle) {
        const titleMatch = content.match(/^#\s*(.+)/m) || 
                          content.match(/Title:\s*(.+)/i);
        return titleMatch ? titleMatch[1].trim() : originalTitle;
    }

    fallbackRewrite(title, content) {
        return {
            title: title,
            content: `${content}\n\n[Note: Article requires manual review]`,
            wordCount: content.split(' ').length
        };
    }
}

module.exports = GroqRewriter;
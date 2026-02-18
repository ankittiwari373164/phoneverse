const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');

class ImageGenerator {
    constructor() {
        this.outputDir = './public/images/uploads';
        this.width = 1344;
        this.height = 768;

        console.log('✅ Image generator initialized');
        console.log('   Provider: Local Canvas (FREE FOREVER)');
        console.log('   No internet needed!');

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async createFeaturedImage(title, category) {
        const filename = `featured-${Date.now()}.png`;
        const filepath = path.join(this.outputDir, filename);

        try {
            await this.generateLocalImage(title, category, filepath);
            console.log(`✅ Image created: ${filename}`);
            return `/images/uploads/${filename}`;
        } catch (error) {
            console.error('❌ Image generation failed:', error.message);
            return '/images/placeholder.png';
        }
    }

    async generateLocalImage(title, category, filepath) {
        const canvas = createCanvas(this.width, this.height);
        const ctx = canvas.getContext('2d');

        // Get category theme
        const theme = this.getCategoryTheme(category);

        // === BACKGROUND GRADIENT ===
        this.drawBackground(ctx, theme);

        // === GEOMETRIC SHAPES (Modern Design) ===
        this.drawGeometricShapes(ctx, theme);

        // === TECH GRID LINES ===
        this.drawTechGrid(ctx, theme);

        // === CATEGORY ICON AREA ===
        this.drawIconArea(ctx, theme, category);

        // === ARTICLE TITLE ===
        this.drawTitle(ctx, title, theme);

        // === CATEGORY BADGE ===
        this.drawCategoryBadge(ctx, category, theme);

        // === BRANDING ===
        this.drawBranding(ctx, theme);

        // === DECORATIVE ELEMENTS ===
        this.drawDecorativeElements(ctx, theme);

        // Save image
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filepath, buffer);
    }

    drawBackground(ctx, theme) {
        // Main gradient background
        const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        gradient.addColorStop(0, theme.bg1);
        gradient.addColorStop(0.5, theme.bg2);
        gradient.addColorStop(1, theme.bg3);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Overlay radial gradient for depth
        const radial = ctx.createRadialGradient(
            this.width * 0.3, this.height * 0.3, 0,
            this.width * 0.3, this.height * 0.3, this.width * 0.6
        );
        radial.addColorStop(0, 'rgba(255,255,255,0.08)');
        radial.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGeometricShapes(ctx, theme) {
        // Large circle - top right
        ctx.beginPath();
        ctx.arc(this.width - 150, -80, 280, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,0.05)`;
        ctx.fill();

        // Medium circle - bottom left
        ctx.beginPath();
        ctx.arc(-60, this.height + 60, 220, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,0.06)`;
        ctx.fill();

        // Small accent circle
        ctx.beginPath();
        ctx.arc(this.width - 80, this.height - 100, 120, 0, Math.PI * 2);
        ctx.fillStyle = theme.accentAlpha;
        ctx.fill();

        // Diagonal stripe
        ctx.save();
        ctx.translate(this.width * 0.7, 0);
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, -200, 60, this.height + 400);
        ctx.fillRect(80, -200, 30, this.height + 400);
        ctx.restore();

        // Top left accent rectangle
        ctx.save();
        ctx.rotate(-0.15);
        const rectGrad = ctx.createLinearGradient(0, 0, 200, 0);
        rectGrad.addColorStop(0, theme.accentAlpha);
        rectGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rectGrad;
        ctx.fillRect(-50, 80, 300, 8);
        ctx.fillRect(-50, 100, 200, 4);
        ctx.restore();
    }

    drawTechGrid(ctx, theme) {
        // Subtle dot grid pattern
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        const dotSpacing = 40;
        for (let x = 0; x < this.width; x += dotSpacing) {
            for (let y = 0; y < this.height; y += dotSpacing) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Horizontal tech lines - right side
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = 150 + i * 30;
            const startX = this.width - 300;
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(this.width - 20, y);
            ctx.stroke();
        }
    }

    drawIconArea(ctx, theme, category) {
        // Large phone icon using shapes
        const iconX = this.width - 220;
        const iconY = this.height / 2 - 100;
        const iconW = 160;
        const iconH = 260;
        const radius = 20;

        // Phone body shadow
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 10;

        // Phone body
        ctx.beginPath();
        ctx.moveTo(iconX + radius, iconY);
        ctx.lineTo(iconX + iconW - radius, iconY);
        ctx.quadraticCurveTo(iconX + iconW, iconY, iconX + iconW, iconY + radius);
        ctx.lineTo(iconX + iconW, iconY + iconH - radius);
        ctx.quadraticCurveTo(iconX + iconW, iconY + iconH, iconX + iconW - radius, iconY + iconH);
        ctx.lineTo(iconX + radius, iconY + iconH);
        ctx.quadraticCurveTo(iconX, iconY + iconH, iconX, iconY + iconH - radius);
        ctx.lineTo(iconX, iconY + radius);
        ctx.quadraticCurveTo(iconX, iconY, iconX + radius, iconY);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Phone screen
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(iconX + 12, iconY + 30, iconW - 24, iconH - 60);

        // Screen content lines (fake UI)
        ctx.fillStyle = theme.accent;
        ctx.fillRect(iconX + 20, iconY + 50, iconW - 40, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(iconX + 20, iconY + 65, (iconW - 40) * 0.7, 4);
        ctx.fillRect(iconX + 20, iconY + 78, (iconW - 40) * 0.5, 4);

        // App icons grid on screen
        const appColors = [theme.accent, '#ff6b6b', '#ffd93d', '#6bcb77'];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                ctx.fillStyle = appColors[(row * 3 + col) % 4];
                ctx.beginPath();
                ctx.roundRect(
                    iconX + 20 + col * 35,
                    iconY + 100 + row * 40,
                    25, 25, 5
                );
                ctx.fill();
            }
        }

        // Phone notch/camera
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(iconX + iconW / 2, iconY + 15, 8, 0, Math.PI * 2);
        ctx.fill();

        // Home button
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(iconX + iconW / 2, iconY + iconH - 18, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Category specific element
        this.drawCategoryElement(ctx, category, theme, iconX - 60, iconY);
    }

    drawCategoryElement(ctx, category, theme, x, y) {
        const elements = {
            'reviews': () => {
                // Stars
                const starColor = '#ffd700';
                for (let i = 0; i < 5; i++) {
                    this.drawStar(ctx, x + i * 28, y + 280, 12, starColor);
                }
            },
            'android-updates': () => {
                // Android-like robot head
                ctx.fillStyle = '#3ddc84';
                ctx.beginPath();
                ctx.arc(x + 30, y + 280, 20, Math.PI, 0);
                ctx.fill();
                ctx.fillRect(x + 10, y + 280, 40, 25);
                // Eyes
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(x + 22, y + 276, 4, 0, Math.PI * 2);
                ctx.arc(x + 38, y + 276, 4, 0, Math.PI * 2);
                ctx.fill();
            },
            'iphone-news': () => {
                // Apple logo style
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = 'bold 50px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('', x + 30, y + 300);
            },
            'comparisons': () => {
                // VS text
                ctx.fillStyle = theme.accent;
                ctx.font = 'bold 30px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('VS', x + 30, y + 290);
            },
            'guides': () => {
                // Lightbulb icon
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(x + 30, y + 265, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(x + 22, y + 283, 16, 8);
                ctx.fillRect(x + 24, y + 292, 12, 4);
            }
        };

        if (elements[category]) {
            elements[category]();
        }
    }

    drawStar(ctx, x, y, radius, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const innerAngle = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
            if (i === 0) {
                ctx.moveTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
            } else {
                ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
            }
            ctx.lineTo(
                x + (radius / 2) * Math.cos(innerAngle),
                y + (radius / 2) * Math.sin(innerAngle)
            );
        }
        ctx.closePath();
        ctx.fill();
    }

    drawTitle(ctx, title, theme) {
        const maxWidth = this.width - 350;
        const startX = 50;
        const startY = 220;

        // Title shadow for readability
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 15;

        // Clean title - remove markdown
        const cleanTitle = title
            .replace(/^#+\s*/gm, '')
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .trim();

        // Break title into lines
        const lines = this.wrapText(ctx, cleanTitle, maxWidth, 52);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 52px Arial';
        ctx.textAlign = 'left';

        lines.slice(0, 3).forEach((line, i) => {
            ctx.fillText(line, startX, startY + i * 65);
        });

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Accent underline
        const lineWidth = Math.min(ctx.measureText(lines[0] || '').width, maxWidth * 0.6);
        const underlineGrad = ctx.createLinearGradient(startX, 0, startX + lineWidth, 0);
        underlineGrad.addColorStop(0, theme.accent);
        underlineGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = underlineGrad;
        ctx.fillRect(startX, startY + 15, lineWidth, 4);
    }

    wrapText(ctx, text, maxWidth, fontSize) {
        ctx.font = `bold ${fontSize}px Arial`;
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }

    drawCategoryBadge(ctx, category, theme) {
        const badgeX = 50;
        const badgeY = 130;
        const categoryNames = {
            'mobile-news': '📱 Mobile News',
            'reviews': '⭐ Reviews',
            'android-updates': '🤖 Android Updates',
            'iphone-news': '🍎 iPhone News',
            'comparisons': '⚖️ Comparisons',
            'guides': '📚 Guides'
        };

        const categoryName = categoryNames[category] || '📱 Tech News';

        // Badge background
        const textWidth = ctx.measureText(categoryName).width + 40;
        const badgeWidth = Math.max(textWidth, 180);

        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, 40, 20);
        ctx.fill();

        // Badge text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(categoryName, badgeX + 20, badgeY + 26);
    }

    drawBranding(ctx, theme) {
        // Bottom branding bar
        const barGrad = ctx.createLinearGradient(0, this.height - 70, 0, this.height);
        barGrad.addColorStop(0, 'rgba(0,0,0,0)');
        barGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(0, this.height - 70, this.width, 70);

        // PhoneVerse logo text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('📱 PhoneVerse', 50, this.height - 25);

        // Tagline
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '16px Arial';
        ctx.fillText('Your Mobile Tech Authority', 50, this.height - 8);

        // Domain
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('phoneverse.com', this.width - 30, this.height - 20);

        // Divider line
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(50, this.height - 65);
        ctx.lineTo(300, this.height - 65);
        ctx.stroke();
    }

    drawDecorativeElements(ctx, theme) {
        // Top accent bar
        const topGrad = ctx.createLinearGradient(0, 0, this.width * 0.7, 0);
        topGrad.addColorStop(0, theme.accent);
        topGrad.addColorStop(0.7, 'rgba(255,255,255,0.2)');
        topGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, this.width * 0.7, 6);

        // Corner accent
        ctx.fillStyle = theme.accent;
        ctx.fillRect(0, 0, 6, 80);

        // Signal bars (tech decoration)
        const barX = 50;
        const barY = 580;
        const barHeights = [10, 16, 22, 28, 34];
        barHeights.forEach((h, i) => {
            ctx.fillStyle = i < 4 ? theme.accent : 'rgba(255,255,255,0.2)';
            ctx.fillRect(barX + i * 14, barY - h, 10, h);
        });

        // Small decorative circles
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(160, 575, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(175, 575, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(187, 575, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    getCategoryTheme(category) {
        const themes = {
            'mobile-news': {
                bg1: '#0f0c29',
                bg2: '#302b63',
                bg3: '#24243e',
                accent: '#7b2ff7',
                accentAlpha: 'rgba(123,47,247,0.15)'
            },
            'reviews': {
                bg1: '#1a1a2e',
                bg2: '#16213e',
                bg3: '#0f3460',
                accent: '#e94560',
                accentAlpha: 'rgba(233,69,96,0.15)'
            },
            'android-updates': {
                bg1: '#0a2342',
                bg2: '#126872',
                bg3: '#1a936f',
                accent: '#3ddc84',
                accentAlpha: 'rgba(61,220,132,0.15)'
            },
            'iphone-news': {
                bg1: '#1c1c1e',
                bg2: '#2c2c2e',
                bg3: '#3a3a3c',
                accent: '#0a84ff',
                accentAlpha: 'rgba(10,132,255,0.15)'
            },
            'comparisons': {
                bg1: '#0d0221',
                bg2: '#190649',
                bg3: '#300a8f',
                accent: '#ff6b35',
                accentAlpha: 'rgba(255,107,53,0.15)'
            },
            'guides': {
                bg1: '#051937',
                bg2: '#004d7a',
                bg3: '#008793',
                accent: '#00d2ff',
                accentAlpha: 'rgba(0,210,255,0.15)'
            }
        };

        return themes[category] || themes['mobile-news'];
    }
}

module.exports = ImageGenerator;
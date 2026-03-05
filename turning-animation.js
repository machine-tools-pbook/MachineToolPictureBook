/* ============================================
   旋削加工アニメーション (Turning Animation)
   page06 の絵をベースにした動画的表現
   ============================================ */

class TurningAnimation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.chips = [];
        this.sparkles = [];
        this.toolX = 0;
        this.toolPhase = 0; // 0: approaching, 1: cutting
        this.running = false;
        this.animId = null;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.time = 0;
        this.chips = [];
        this.sparkles = [];
        this.toolPhase = 0;
        this.animate();
    }

    stop() {
        this.running = false;
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }

    animate() {
        if (!this.running) return;
        this.time += 1 / 60;
        this.update();
        this.draw();
        this.animId = requestAnimationFrame(() => this.animate());
    }

    update() {
        const w = this.width;
        const h = this.height;

        // Tool approach animation
        const approachDuration = 1.5;
        if (this.time < approachDuration) {
            this.toolPhase = 0;
            this.toolX = w * 0.75 - (w * 0.2) * (this.time / approachDuration);
        } else {
            this.toolPhase = 1;
            this.toolX = w * 0.55;

            // Generate chips
            if (Math.random() < 0.15) {
                this.chips.push({
                    x: w * 0.45,
                    y: h * 0.52,
                    vx: -1.5 + Math.random() * -1,
                    vy: 1 + Math.random() * 2,
                    curl: Math.random() * Math.PI * 2,
                    curlSpeed: 0.05 + Math.random() * 0.08,
                    size: 3 + Math.random() * 4,
                    life: 1.0,
                    color: `hsl(${185 + Math.random() * 20}, ${60 + Math.random() * 20}%, ${70 + Math.random() * 15}%)`
                });
            }

            // Generate sparkles
            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 0.8 - Math.PI * 0.4;
                this.sparkles.push({
                    x: w * 0.46,
                    y: h * 0.46,
                    vx: Math.cos(angle) * (2 + Math.random() * 3),
                    vy: Math.sin(angle) * (2 + Math.random() * 3) - 1,
                    life: 1.0,
                    size: 1 + Math.random() * 2.5
                });
            }
        }

        // Update chips
        for (let i = this.chips.length - 1; i >= 0; i--) {
            const c = this.chips[i];
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.05; // gravity
            c.curl += c.curlSpeed;
            c.life -= 0.005;
            if (c.life <= 0 || c.y > h + 20) {
                this.chips.splice(i, 1);
            }
        }

        // Update sparkles
        for (let i = this.sparkles.length - 1; i >= 0; i--) {
            const s = this.sparkles[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life -= 0.03;
            s.size *= 0.98;
            if (s.life <= 0) {
                this.sparkles.splice(i, 1);
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        // Background — soft watercolor wash
        const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
        bgGrad.addColorStop(0, '#f0f8ff');
        bgGrad.addColorStop(1, '#dceaf7');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Soft border card
        this.drawRoundedRect(ctx, w * 0.05, h * 0.05, w * 0.9, h * 0.9, 20);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        ctx.strokeStyle = '#c5d8e8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();

        // --- Chuck (left side) ---
        this.drawChuck(ctx, w * 0.15, h * 0.42, w, h);

        // --- Workpiece (cylinder) ---
        this.drawWorkpiece(ctx, w * 0.22, h * 0.42, w, h);

        // --- Rotation arrows ---
        this.drawRotationArrows(ctx, w * 0.35, h * 0.2, w, h);

        // --- Cutting Tool ---
        this.drawCuttingTool(ctx, this.toolX, h * 0.48, w, h);

        // --- Chips (metal shavings) ---
        this.drawChips(ctx);

        // --- Sparkles ---
        this.drawSparkles(ctx);

        ctx.restore();
    }

    drawRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    drawChuck(ctx, cx, cy, w, h) {
        const size = Math.min(w, h) * 0.18;

        // Main chuck body (circle)
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        const chuckGrad = ctx.createRadialGradient(cx - size * 0.2, cy - size * 0.2, 0, cx, cy, size);
        chuckGrad.addColorStop(0, '#d4c4b0');
        chuckGrad.addColorStop(0.7, '#b8a898');
        chuckGrad.addColorStop(1, '#9a8878');
        ctx.fillStyle = chuckGrad;
        ctx.fill();
        ctx.strokeStyle = '#8a7868';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Chuck jaws (3 jaws)
        for (let i = 0; i < 3; i++) {
            const rotation = this.time * 2;
            const angle = (i * Math.PI * 2 / 3) + rotation;
            const jawX = cx + Math.cos(angle) * size * 0.6;
            const jawY = cy + Math.sin(angle) * size * 0.6;

            ctx.save();
            ctx.translate(jawX, jawY);
            ctx.rotate(angle);
            ctx.fillStyle = '#c4b4a0';
            ctx.fillRect(-size * 0.15, -size * 0.08, size * 0.3, size * 0.16);
            ctx.strokeStyle = '#9a8878';
            ctx.lineWidth = 1;
            ctx.strokeRect(-size * 0.15, -size * 0.08, size * 0.3, size * 0.16);
            ctx.restore();
        }

        // Cute face on chuck
        const faceX = cx - size * 0.15;
        const faceY = cy;
        // Eyes
        ctx.fillStyle = '#4a3a2a';
        ctx.beginPath();
        ctx.arc(faceX - size * 0.12, faceY - size * 0.1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(faceX + size * 0.12, faceY - size * 0.1, 3, 0, Math.PI * 2);
        ctx.fill();
        // Cheeks
        ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.ellipse(faceX - size * 0.2, faceY + size * 0.02, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(faceX + size * 0.2, faceY + size * 0.02, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Smile
        ctx.beginPath();
        ctx.arc(faceX, faceY + size * 0.02, size * 0.1, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    drawWorkpiece(ctx, startX, cy, w, h) {
        const length = w * 0.32;
        const radius = Math.min(w, h) * 0.1;
        const endX = startX + length;
        const rotation = this.time * 2;

        // Workpiece body — cylinder effect with gradient bands
        const wpGrad = ctx.createLinearGradient(startX, cy - radius, startX, cy + radius);
        wpGrad.addColorStop(0, '#b8e8d8');
        wpGrad.addColorStop(0.2, '#8fd8c8');
        wpGrad.addColorStop(0.5, '#a8e0d0');
        wpGrad.addColorStop(0.8, '#7cc8b8');
        wpGrad.addColorStop(1, '#6ab8a8');

        ctx.fillStyle = wpGrad;
        ctx.beginPath();
        ctx.moveTo(startX, cy - radius);
        ctx.lineTo(endX, cy - radius);
        ctx.quadraticCurveTo(endX + radius * 0.3, cy, endX, cy + radius);
        ctx.lineTo(startX, cy + radius);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#5aa898';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Spinning surface lines (to show rotation)
        const numLines = 5;
        for (let i = 0; i < numLines; i++) {
            const offset = ((rotation * 30 + i * (radius * 2 / numLines)) % (radius * 2)) - radius;
            const alpha = 1 - Math.abs(offset) / radius;
            ctx.beginPath();
            ctx.moveTo(startX + 5, cy + offset);
            ctx.lineTo(endX - 5, cy + offset);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Cut portion (right side becomes thinner after tool cuts)
        if (this.toolPhase === 1) {
            const cutProgress = Math.min((this.time - 1.5) / 3, 1);
            const cutLength = length * 0.4 * cutProgress;
            const cutRadius = radius * 0.65;
            const cutStartX = endX - cutLength;

            // Thinner cut portion
            const cutGrad = ctx.createLinearGradient(cutStartX, cy - cutRadius, cutStartX, cy + cutRadius);
            cutGrad.addColorStop(0, '#a8e8d8');
            cutGrad.addColorStop(0.5, '#90d8c8');
            cutGrad.addColorStop(1, '#78c8b8');
            ctx.fillStyle = cutGrad;
            ctx.beginPath();
            ctx.moveTo(cutStartX, cy - cutRadius);
            ctx.lineTo(endX, cy - cutRadius);
            ctx.quadraticCurveTo(endX + cutRadius * 0.3, cy, endX, cy + cutRadius);
            ctx.lineTo(cutStartX, cy + cutRadius);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#5aa898';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Spinning lines on cut portion
            for (let i = 0; i < numLines; i++) {
                const offset = ((rotation * 30 + i * (cutRadius * 2 / numLines)) % (cutRadius * 2)) - cutRadius;
                const alpha = 1 - Math.abs(offset) / cutRadius;
                ctx.beginPath();
                ctx.moveTo(cutStartX + 3, cy + offset);
                ctx.lineTo(endX - 3, cy + offset);
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.35})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // End cap (ellipse)
        ctx.beginPath();
        const capRadius = this.toolPhase === 1 ?
            radius * 0.65 : radius;
        ctx.ellipse(endX, cy, radius * 0.15, capRadius, 0, 0, Math.PI * 2);
        const capGrad = ctx.createRadialGradient(endX, cy - capRadius * 0.2, 0, endX, cy, capRadius);
        capGrad.addColorStop(0, '#c0f0e0');
        capGrad.addColorStop(1, '#70b8a8');
        ctx.fillStyle = capGrad;
        ctx.fill();
        ctx.strokeStyle = '#5aa898';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    drawRotationArrows(ctx, cx, cy, w, h) {
        const arrowSize = Math.min(w, h) * 0.06;
        const rotation = this.time * 1.5;

        ctx.save();
        ctx.translate(cx, cy);

        // Curved arrow 1
        ctx.beginPath();
        ctx.arc(0, 0, arrowSize, -Math.PI * 0.3 + rotation, Math.PI * 0.5 + rotation);
        ctx.strokeStyle = '#5BA8DC';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Arrow head 1
        const a1 = Math.PI * 0.5 + rotation;
        const ax1 = Math.cos(a1) * arrowSize;
        const ay1 = Math.sin(a1) * arrowSize;
        ctx.beginPath();
        ctx.moveTo(ax1, ay1);
        ctx.lineTo(ax1 + Math.cos(a1 + 1.2) * 8, ay1 + Math.sin(a1 + 1.2) * 8);
        ctx.moveTo(ax1, ay1);
        ctx.lineTo(ax1 + Math.cos(a1 - 0.5) * 8, ay1 + Math.sin(a1 - 0.5) * 8);
        ctx.strokeStyle = '#5BA8DC';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Curved arrow 2
        ctx.beginPath();
        ctx.arc(0, 0, arrowSize, Math.PI * 0.7 + rotation, Math.PI * 1.5 + rotation);
        ctx.strokeStyle = '#5BA8DC';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Arrow head 2
        const a2 = Math.PI * 1.5 + rotation;
        const ax2 = Math.cos(a2) * arrowSize;
        const ay2 = Math.sin(a2) * arrowSize;
        ctx.beginPath();
        ctx.moveTo(ax2, ay2);
        ctx.lineTo(ax2 + Math.cos(a2 + 1.2) * 8, ay2 + Math.sin(a2 + 1.2) * 8);
        ctx.moveTo(ax2, ay2);
        ctx.lineTo(ax2 + Math.cos(a2 - 0.5) * 8, ay2 + Math.sin(a2 - 0.5) * 8);
        ctx.strokeStyle = '#5BA8DC';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();
    }

    drawCuttingTool(ctx, x, y, w, h) {
        const toolW = Math.min(w, h) * 0.08;
        const toolH = Math.min(w, h) * 0.22;

        // Tool body
        const toolGrad = ctx.createLinearGradient(x - toolW / 2, y, x + toolW / 2, y);
        toolGrad.addColorStop(0, '#f0d8a0');
        toolGrad.addColorStop(0.5, '#e8cc90');
        toolGrad.addColorStop(1, '#d8bc80');
        ctx.fillStyle = toolGrad;

        // Tool shape (slightly tapered)
        ctx.beginPath();
        ctx.moveTo(x - toolW * 0.4, y - toolH * 0.1);
        ctx.lineTo(x + toolW * 0.4, y - toolH * 0.1);
        ctx.lineTo(x + toolW * 0.5, y + toolH);
        ctx.lineTo(x - toolW * 0.5, y + toolH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#b8a070';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tool tip (cutting edge)
        ctx.beginPath();
        ctx.moveTo(x - toolW * 0.3, y - toolH * 0.1);
        ctx.lineTo(x, y - toolH * 0.2);
        ctx.lineTo(x + toolW * 0.3, y - toolH * 0.1);
        ctx.fillStyle = '#c8c0b0';
        ctx.fill();
        ctx.strokeStyle = '#a09080';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cute face on tool
        const faceY = y + toolH * 0.3;
        // Eyes (determined look)
        ctx.fillStyle = '#5a4030';
        ctx.beginPath();
        ctx.arc(x - toolW * 0.15, faceY - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + toolW * 0.15, faceY - 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Determined eyebrows
        ctx.beginPath();
        ctx.moveTo(x - toolW * 0.25, faceY - 10);
        ctx.lineTo(x - toolW * 0.05, faceY - 8);
        ctx.strokeStyle = '#5a4030';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + toolW * 0.25, faceY - 10);
        ctx.lineTo(x + toolW * 0.05, faceY - 8);
        ctx.stroke();
        // Smile
        ctx.beginPath();
        ctx.arc(x, faceY, 4, 0.2, Math.PI - 0.2);
        ctx.strokeStyle = '#5a4030';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Cheeks
        ctx.fillStyle = 'rgba(255, 140, 140, 0.35)';
        ctx.beginPath();
        ctx.ellipse(x - toolW * 0.25, faceY + 1, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + toolW * 0.25, faceY + 1, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawChips(ctx) {
        for (const c of this.chips) {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.curl);
            ctx.globalAlpha = c.life;

            // Curling chip shape
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (let t = 0; t < Math.PI * 2; t += 0.2) {
                const r = c.size * (1 - t / (Math.PI * 4));
                if (r <= 0) break;
                ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r + t * 1.5);
            }
            ctx.strokeStyle = c.color;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.restore();
        }
    }

    drawSparkles(ctx) {
        for (const s of this.sparkles) {
            ctx.save();
            ctx.globalAlpha = s.life;

            // Star sparkle
            ctx.fillStyle = '#FFE57F';
            ctx.beginPath();
            const spikes = 4;
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (i * Math.PI) / spikes - Math.PI / 2;
                const r = i % 2 === 0 ? s.size : s.size * 0.3;
                ctx.lineTo(s.x + Math.cos(angle) * r, s.y + Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();

            // Glow
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 229, 127, ${s.life * 0.3})`;
            ctx.fill();

            ctx.restore();
        }
    }
}

// Auto-initialize when page 6 becomes active
function initTurningAnimation() {
    const canvas = document.getElementById('turning-canvas');
    if (!canvas) return null;

    const anim = new TurningAnimation(canvas);

    // Observe page visibility to start/stop animation
    const page6 = canvas.closest('.page');
    if (page6) {
        const observer = new MutationObserver(() => {
            if (page6.classList.contains('active')) {
                anim.resize();
                anim.start();
            } else {
                anim.stop();
            }
        });
        observer.observe(page6, { attributes: true, attributeFilter: ['class'] });

        // Check if already active
        if (page6.classList.contains('active')) {
            anim.start();
        }
    }

    return anim;
}

document.addEventListener('DOMContentLoaded', () => {
    initTurningAnimation();
});

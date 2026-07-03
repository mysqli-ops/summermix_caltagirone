/* ============================================================
   SUMMER MIX 2026 — Particle Engine
   Click / touch      → repulsione soft
   Double-click / tap → firework: flash + 2 anelli + burst
   ============================================================ */
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [], maxP = 0, burstFx = [], fireworks = [], fwCounter = 0;
    let mouse = { x: -9999, y: -9999 };
    let emitting = false, emitX = 0, emitY = 0;
    let lastTap = 0, resizeTimer = null;

    const COLORS  = ['#FFA7D7', '#3BB789', '#FFE372', '#FE4F60', '#1D264F'];
    const MAX_SPD = 1.5;

    function resizeCanvas() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        maxP = Math.min(450, Math.floor((canvas.width * canvas.height) / 2500));
    }

    function makeParticle() {
        return {
            x: Math.random() * canvas.width,  y: Math.random() * canvas.height,
            vx: (Math.random() - .5) * .7,    vy: (Math.random() - .5) * .7,
            size: 3 + Math.random() * 4,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            rot: Math.random() * Math.PI * 2,
            fwId: undefined, fwArrived: false, fwExploding: 0, life: undefined
        };
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < maxP; i++) particles.push(makeParticle());
    }

    function emit(x, y) {
        if (particles.length >= maxP) {
            const idx = particles.findIndex(p => p.fwId === undefined && !p.fwExploding && p.life === undefined);
            if (idx !== -1) particles.splice(idx, 1); else return;
        }
        const angle = Math.random() * Math.PI * 2, spd = .5 + Math.random() * 2;
        particles.push({
            x: x + (Math.random() - .5) * 6, y: y + (Math.random() - .5) * 6,
            vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
            size: 3 + Math.random() * 4,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            rot: Math.random() * Math.PI * 2,
            fwId: undefined, fwArrived: false, fwExploding: 0, life: 1.0
        });
    }

    function startFirework(x, y) {
        const used  = fireworks.map(f => f.color);
        const free  = COLORS.filter(c => !used.includes(c));
        const pool  = free.length ? free : COLORS;
        const color = pool[Math.floor(Math.random() * pool.length)];
        const id    = ++fwCounter;
        fireworks.push({ id, color, x, y, timer: 80, arrivedCount: 0 });
        particles.forEach(p => {
            if (p.color === color && p.fwId === undefined) { p.fwId = id; p.fwArrived = false; }
        });
    }

    function burstFirework(fw) {
        particles.forEach(p => {
            if (p.fwId !== fw.id) return;
            const a = Math.random() * Math.PI * 2, s = 5 + Math.random() * 10;
            p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
            p.fwId = undefined; p.fwArrived = false; p.fwExploding = 55;
        });
        const n = Math.min(24, Math.floor(maxP * .05));
        for (let i = 0; i < n; i++) {
            const a = (Math.PI * 2 * i / n) + Math.random() * .3;
            const s = 4 + Math.random() * 11;
            particles.push({
                x: fw.x + (Math.random() - .5) * 8, y: fw.y + (Math.random() - .5) * 8,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                size: 4 + Math.random() * 5, color: fw.color,
                rot: Math.random() * Math.PI * 2,
                fwId: undefined, fwArrived: false, fwExploding: 55,
                life: .9 + Math.random() * .4
            });
        }
        burstFx.push({ x: fw.x, y: fw.y, color: fw.color, t: 0 });
        fireworks = fireworks.filter(f => f.id !== fw.id);
    }

    function drawBurstFx() {
        burstFx = burstFx.filter(fx => fx.t < 1);
        burstFx.forEach(fx => {
            ctx.save();
            if (fx.t < .4) {
                const a = 1 - fx.t / .4, r = fx.t * 35;
                const g = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, r);
                g.addColorStop(0, `rgba(255,255,255,${a * .9})`);
                g.addColorStop(1, `rgba(255,255,255,0)`);
                ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
                ctx.fillStyle = g; ctx.fill();
            }
            { const r = fx.t * 130, a = Math.max(0, 1 - fx.t);
              ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
              ctx.strokeStyle = fx.color; ctx.lineWidth = Math.max(1, 4 * (1 - fx.t));
              ctx.globalAlpha = a * .85; ctx.stroke(); }
            if (fx.t > .15) {
                const t2 = fx.t - .15, r = t2 * 160, a = Math.max(0, 1 - t2 / .85);
                ctx.beginPath(); ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(.5, 2 * (1 - t2));
                ctx.globalAlpha = a * .45; ctx.stroke();
            }
            ctx.restore();
            fx.t += .04;
        });
    }

    function capSpd(p) {
        const s = Math.hypot(p.vx, p.vy);
        if (s > MAX_SPD) { p.vx = p.vx / s * MAX_SPD; p.vy = p.vy / s * MAX_SPD; }
    }

    function drawDiamond(p, alpha) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(0, -p.size); ctx.lineTo(p.size, 0);
        ctx.lineTo(0, p.size);  ctx.lineTo(-p.size, 0);
        ctx.closePath();
        ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.fill();
        ctx.restore();
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBurstFx();

        particles = particles.filter(p => p.life === undefined || p.life > 0);

        particles.forEach(p => {
            if (p.fwExploding > 0) { p.vx *= .95; p.vy *= .95; p.fwExploding--; }
            else capSpd(p);

            p.x += p.vx; p.y += p.vy; p.rot += .002;
            if (p.life !== undefined) p.life -= .02;
            if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height)  p.vy *= -1;

            if (p.fwId === undefined) {
                const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
                if (d < 100 && d > 0) {
                    const f = ((100 - d) / 100) * 1.5, a = Math.atan2(dy, dx);
                    p.x += Math.cos(a) * f; p.y += Math.sin(a) * f;
                }
            }

            if (p.fwId !== undefined && !p.fwArrived) {
                const fw = fireworks.find(f => f.id === p.fwId);
                if (fw) {
                    const fdx = fw.x - p.x, fdy = fw.y - p.y, fd = Math.hypot(fdx, fdy);
                    if (fd > 6) { p.x += fdx / fd * 9; p.y += fdy / fd * 9; }
                    else { p.fwArrived = true; p.vx = p.vy = 0; fw.arrivedCount++; }
                }
            }

            drawDiamond(p, p.life !== undefined ? Math.max(0, p.life) : .55);
        });

        if (emitting) { emit(emitX, emitY); emit(emitX, emitY); }

        fireworks.forEach(fw => {
            fw.timer--;
            const total = particles.filter(p => p.fwId === fw.id).length;
            if (fw.arrivedCount >= total || fw.timer <= 0) fw._burst = true;
        });
        fireworks.filter(fw => fw._burst).forEach(fw => burstFirework(fw));

        requestAnimationFrame(animate);
    }

    window.addEventListener('load', () => {
        resizeCanvas(); initParticles(); animate();

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { resizeCanvas(); initParticles(); }, 200);
        });

        window.addEventListener('dblclick',   e => startFirework(e.clientX, e.clientY));
        window.addEventListener('mousedown',  e => { emitting = true;  emitX = e.clientX; emitY = e.clientY; });
        window.addEventListener('mousemove',  e => { mouse.x = e.clientX; mouse.y = e.clientY; if (emitting) { emitX = e.clientX; emitY = e.clientY; } });
        window.addEventListener('mouseup',    () => { emitting = false; });
        window.addEventListener('mouseleave', () => { emitting = false; mouse.x = mouse.y = -9999; });

        window.addEventListener('touchstart', e => {
            const t = e.touches[0], now = Date.now();
            if (now - lastTap < 300) startFirework(t.clientX, t.clientY);
            lastTap = now; emitting = true;
            emitX = mouse.x = t.clientX; emitY = mouse.y = t.clientY;
        }, { passive: true });
        window.addEventListener('touchmove', e => {
            const t = e.touches[0];
            emitX = mouse.x = t.clientX; emitY = mouse.y = t.clientY;
        }, { passive: true });
        window.addEventListener('touchend', () => { emitting = false; mouse.x = mouse.y = -9999; });
    });
}());
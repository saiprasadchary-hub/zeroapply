/**
 * ZeroApply Motion Ad Studio - Advanced Particle & Laser Physics Engine
 * Real-time 60FPS canvas graphics: ambient dust, laser scanning beam,
 * neural synapse energy beams, magnetic cursor suction, and celebratory shockwaves.
 */

class ParticlePhysicsEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.width = 1920;
    this.height = 1080;
    this.particles = [];
    this.sparkles = [];
    this.laserActive = false;
    this.laserY = 0;
    this.laserSpeed = 4;
    this.laserDirection = 1;
    this.laserBounds = { top: 200, bottom: 850 };
    
    // Neural synapse connections
    this.nodes = [];
    this.neuralPulses = [];
    
    // Shockwaves
    this.shockwaves = [];

    this.mousePos = { x: this.width / 2, y: this.height / 2, active: false };
    this.density = 'ultra'; // 'low', 'medium', 'ultra'

    this.initCanvas();
    this.generateAmbientParticles();
    this.initNeuralNodes();
    this.bindEvents();
    this.startLoop();
  }

  initCanvas() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.generateAmbientParticles();
  }

  bindEvents() {
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      this.mousePos.x = (e.clientX - rect.left) * scaleX;
      this.mousePos.y = (e.clientY - rect.top) * scaleY;
      this.mousePos.active = true;
    });
  }

  generateAmbientParticles() {
    this.particles = [];
    const count = this.density === 'ultra' ? 75 : 35;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2.5 + 1.2,
        baseAlpha: Math.random() * 0.35 + 0.15,
        alpha: 0.2,
        color: Math.random() > 0.4 ? '79, 70, 229' : '16, 185, 129', // Indigo or Mint
        pulseSpeed: Math.random() * 0.03 + 0.01,
        pulseVal: Math.random() * Math.PI
      });
    }
  }

  initNeuralNodes() {
    // Strategic anchor points for Scene 3 ATS scanning connections
    this.nodes = [
      { x: 380, y: 460, label: 'Distributed' },
      { x: 520, y: 520, label: 'TypeScript' },
      { x: 440, y: 640, label: 'Kubernetes' },
      { x: 600, y: 610, label: 'Architecture' },
      { x: 500, y: 730, label: 'Postgres' }
    ];
  }

  // --- Dynamic Particle Triggers ---

  triggerLaserScan(enable = true, top = 280, bottom = 820) {
    this.laserActive = enable;
    this.laserBounds.top = top;
    this.laserBounds.bottom = bottom;
    if (enable) {
      this.laserY = top;
      this.laserDirection = 1;
    }
  }

  triggerShockwave(x, y, color = 'rgba(79, 70, 229, 0.8)') {
    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius: 380,
      opacity: 0.9,
      lineWidth: 8,
      color
    });

    // Spawn 30 directional spark particles
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 4;
      this.sparkles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.015,
        color: Math.random() > 0.5 ? '#4f46e5' : '#10b981',
        size: Math.random() * 4 + 2
      });
    }
  }

  triggerSynapseBurst() {
    if (this.nodes.length < 2) return;
    for (let i = 0; i < 4; i++) {
      const startIdx = Math.floor(Math.random() * this.nodes.length);
      let endIdx = Math.floor(Math.random() * this.nodes.length);
      while (endIdx === startIdx) {
        endIdx = Math.floor(Math.random() * this.nodes.length);
      }
      this.neuralPulses.push({
        start: this.nodes[startIdx],
        end: this.nodes[endIdx],
        t: 0,
        speed: 0.045 + Math.random() * 0.03,
        color: '16, 185, 129' // Radiant Mint pulse
      });
    }
  }

  // --- Animation Render Loop ---

  startLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Render Ambient Floating Dust Particles with gentle fluid flow
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulseVal += p.pulseSpeed;
      p.alpha = p.baseAlpha + Math.sin(p.pulseVal) * 0.12;

      // Wrap boundaries
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      // Draw particle with soft glow
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.color}, ${Math.max(0, p.alpha)})`;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = `rgba(${p.color}, 0.5)`;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // 2. Render Neural Synapse Energy Lines (Scene 3 Live ATS Matching)
    if (this.neuralPulses.length > 0) {
      for (let i = this.neuralPulses.length - 1; i >= 0; i--) {
        const pulse = this.neuralPulses[i];
        pulse.t += pulse.speed;

        // Draw connecting line
        this.ctx.beginPath();
        this.ctx.moveTo(pulse.start.x, pulse.start.y);
        this.ctx.lineTo(pulse.end.x, pulse.end.y);
        this.ctx.strokeStyle = `rgba(${pulse.color}, 0.15)`;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // Draw moving electric packet
        const currX = pulse.start.x + (pulse.end.x - pulse.start.x) * pulse.t;
        const currY = pulse.start.y + (pulse.end.y - pulse.start.y) * pulse.t;

        this.ctx.beginPath();
        this.ctx.arc(currX, currY, 4, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${pulse.color}, 0.95)`;
        this.ctx.shadowBlur = 14;
        this.ctx.shadowColor = `rgba(${pulse.color}, 0.9)`;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        if (pulse.t >= 1) {
          this.neuralPulses.splice(i, 1);
        }
      }
    }

    // 3. Render High-Tech Vertical Laser Scan Line
    if (this.laserActive) {
      this.laserY += this.laserSpeed * this.laserDirection;
      if (this.laserY > this.laserBounds.bottom) {
        this.laserY = this.laserBounds.bottom;
        this.laserDirection = -1;
      } else if (this.laserY < this.laserBounds.top) {
        this.laserY = this.laserBounds.top;
        this.laserDirection = 1;
      }

      // Laser Glow Beam
      const grad = this.ctx.createLinearGradient(0, this.laserY - 25, 0, this.laserY + 25);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0)');
      grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.45)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.fillRect(200, this.laserY - 25, 1520, 50);

      // Core razor line
      this.ctx.beginPath();
      this.ctx.moveTo(220, this.laserY);
      this.ctx.lineTo(1700, this.laserY);
      this.ctx.strokeStyle = '#34d399';
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowBlur = 18;
      this.ctx.shadowColor = '#10b981';
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      // Laser Particle Flakes
      if (Math.random() < 0.4) {
        this.sparkles.push({
          x: 240 + Math.random() * 1440,
          y: this.laserY + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 2,
          life: 0.8,
          decay: 0.04,
          color: '#34d399',
          size: Math.random() * 3 + 1
        });
      }
    }

    // 4. Render Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.12 + 2;
      sw.opacity *= 0.92;
      sw.lineWidth *= 0.95;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = sw.color.replace('0.8', `${sw.opacity}`);
      this.ctx.lineWidth = Math.max(1, sw.lineWidth);
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = sw.color;
      this.ctx.stroke();
      this.ctx.restore();

      if (sw.opacity < 0.02 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 5. Render Sparkles / Confetti
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.15; // gentle gravity
      s.life -= s.decay;

      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
      this.ctx.fillStyle = s.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = s.color;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      if (s.life <= 0) {
        this.sparkles.splice(i, 1);
      }
    }
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.particleEngine = new ParticlePhysicsEngine('particleFxCanvas');
});

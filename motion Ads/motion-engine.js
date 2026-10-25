/**
 * ZeroApply Motion Ad Studio - Advanced Motion Engine 2.0
 * 3D Camera Rig Controller, Inertial Mouse Parallax, Sub-frame Choreography,
 * Audio Spectrum Synchronizer, and Laser/Particle Triggers.
 */

class MotionAdEngine {
  constructor() {
    this.duration = 30000; // 30 seconds
    this.currentTime = 0;
    this.isPlaying = false;
    this.playbackRate = 1;
    this.lastFrameTime = 0;
    this.animationFrameId = null;
    this.aspectRatio = '16-9';
    this.cameraPreset = 'director'; // 'director', 'isometric', 'orbit', 'flat'

    // Scenes Timeline (in seconds)
    this.scenes = [
      { id: 1, name: 'The Struggle', start: 0, end: 6 },
      { id: 2, name: 'Meet ZeroApply', start: 6, end: 12 },
      { id: 3, name: 'Live Engine', start: 12, end: 20 },
      { id: 4, name: 'Interview Rush', start: 20, end: 25 },
      { id: 5, name: 'Own Your Career', start: 25, end: 30 }
    ];

    // Audio triggers
    this.audioTriggers = {
      whoosh1: false,
      whoosh2: false,
      whoosh3: false,
      whoosh4: false,
      impact5: false,
      atsChime: false,
      subDrop1: false,
      subDrop5: false,
      interview1: false,
      interview2: false,
      interview3: false
    };

    // Parallax & Camera state
    this.mouseParallax = { targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
    this.cameraState = { rx: 0, ry: 0, rz: 0, tx: 0, ty: 0, tz: 0, scale: 1 };

    this.initDOM();
    this.bindEvents();
    this.updateScale();
    window.addEventListener('resize', () => this.updateScale());
  }

  initDOM() {
    this.container = document.getElementById('adFrameContainer');
    this.stage = document.getElementById('motionAdStage');
    this.cameraWorld = document.getElementById('cameraGimbalWorld');
    
    // Scene elements
    this.sceneEls = [
      document.getElementById('scene1'),
      document.getElementById('scene2'),
      document.getElementById('scene3'),
      document.getElementById('scene4'),
      document.getElementById('scene5')
    ];

    // Timeline elements
    this.timelineFill = document.getElementById('timelineFillBar');
    this.playheadThumb = document.getElementById('timelinePlayheadThumb');
    this.timeDisplay = document.getElementById('timeDisplay');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.timelineTrack = document.getElementById('timelineTrack');

    // Scene 3 Automation Elements
    this.simMouse = document.getElementById('agentMousePointer');
    this.mouseRipple = document.getElementById('mouseRipple');
    this.atsCounter = document.getElementById('atsScoreCounter');
    this.atsProgressFill = document.getElementById('atsProgressFill');
    this.atsTags = document.querySelectorAll('.ats-tag');
    this.inputName = document.getElementById('simInputName');
    this.inputEmail = document.getElementById('simInputEmail');
    this.inputRole = document.getElementById('simInputRole');
    this.simSubmitBtn = document.getElementById('simSubmitBtn');

    // Scene 4 Elements
    this.stat1 = document.getElementById('statNum1');
    this.stat2 = document.getElementById('statNum2');
    this.stat3 = document.getElementById('statNum3');
    this.interviewCards = document.querySelectorAll('.interview-card');

    // Audio Equalizer bars
    this.eqBars = document.querySelectorAll('.eq-bar');
  }

  bindEvents() {
    this.playPauseBtn.addEventListener('click', () => this.togglePlay());

    // Timeline Scrubbing
    let isScrubbing = false;
    const handleScrub = (e) => {
      const rect = this.timelineTrack.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.seekTo(pos * this.duration);
    };

    this.timelineTrack.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      handleScrub(e);
      window.addEventListener('mousemove', handleScrub);
      window.addEventListener('mouseup', () => {
        isScrubbing = false;
        window.removeEventListener('mousemove', handleScrub);
      }, { once: true });
    });

    // Scene Jump Pills
    document.querySelectorAll('.scene-jump-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const sceneIndex = parseInt(pill.dataset.scene, 10);
        const targetScene = this.scenes[sceneIndex - 1];
        if (targetScene) {
          this.seekTo(targetScene.start * 1000);
        }
      });
    });

    // Aspect Ratio Switcher
    document.querySelectorAll('.aspect-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setAspectRatio(btn.dataset.aspect);
      });
    });

    // Camera Preset Switcher
    document.querySelectorAll('.cam-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cam-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setCameraPreset(btn.dataset.preset);
      });
    });

    // Mouse Parallax movement inside stage container
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      this.mouseParallax.targetX = nx * 18; // Max 18 deg tilt
      this.mouseParallax.targetY = -ny * 14;
    });

    this.container.addEventListener('mouseleave', () => {
      this.mouseParallax.targetX = 0;
      this.mouseParallax.targetY = 0;
    });

    // Playback Speed
    const speedSelect = document.getElementById('playbackSpeedSelect');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.playbackRate = parseFloat(e.target.value);
      });
    }

    // Audio Mute Toggle
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        const isMuted = !window.adSound.isMuted;
        window.adSound.setMuted(isMuted);
        soundToggleBtn.classList.toggle('muted', isMuted);
      });
    }

    // Volume Slider
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        window.adSound.setVolume(parseFloat(e.target.value));
      });
    }

    // Reset Button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.seekTo(0);
        this.play();
      });
    }
  }

  setCameraPreset(preset) {
    this.cameraPreset = preset;
    this.cameraWorld.className = `camera-gimbal-world preset-${preset}`;
  }

  setAspectRatio(ratio) {
    this.aspectRatio = ratio;
    this.container.className = `ad-frame-container aspect-${ratio}`;
    this.updateScale();
    if (window.particleEngine) {
      let w = 1920, h = 1080;
      if (ratio === '9-16') { w = 1080; h = 1920; }
      else if (ratio === '1-1') { w = 1080; h = 1080; }
      window.particleEngine.resize(w, h);
    }
  }

  updateScale() {
    if (!this.container || !this.stage) return;
    const containerRect = this.container.getBoundingClientRect();
    
    let baseWidth = 1920;
    let baseHeight = 1080;
    
    if (this.aspectRatio === '9-16') {
      baseWidth = 1080;
      baseHeight = 1920;
    } else if (this.aspectRatio === '1-1') {
      baseWidth = 1080;
      baseHeight = 1080;
    }

    const scaleX = containerRect.width / baseWidth;
    const scaleY = containerRect.height / baseHeight;
    const scale = Math.min(scaleX, scaleY);

    this.stage.style.transform = `scale(${scale})`;
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.playPauseBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    
    window.adSound.ensureContext();
    window.adSound.startMusic();
    this.tick();
  }

  pause() {
    this.isPlaying = false;
    this.playPauseBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.adSound.stopMusic();
  }

  seekTo(timeMs) {
    this.currentTime = Math.max(0, Math.min(this.duration, timeMs));
    this.renderFrame(this.currentTime);

    const s = this.currentTime / 1000;
    if (s < 0.5) this.audioTriggers.whoosh1 = false;
    if (s < 6) this.audioTriggers.whoosh2 = false;
    if (s < 12) this.audioTriggers.whoosh3 = false;
    if (s < 15) this.audioTriggers.atsChime = false;
    if (s < 20) {
      this.audioTriggers.whoosh4 = false;
      this.audioTriggers.interview1 = false;
      this.audioTriggers.interview2 = false;
      this.audioTriggers.interview3 = false;
    }
    if (s < 25) this.audioTriggers.impact5 = false;
  }

  tick() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = (now - this.lastFrameTime) * this.playbackRate;
    this.lastFrameTime = now;

    this.currentTime += delta;

    if (this.currentTime >= this.duration) {
      this.currentTime = 0;
      this.resetTriggers();
    }

    this.renderFrame(this.currentTime);
    this.updateAudioVisualizer();
    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  resetTriggers() {
    Object.keys(this.audioTriggers).forEach(k => {
      this.audioTriggers[k] = false;
    });
  }

  updateAudioVisualizer() {
    if (!window.adSound || !this.eqBars || this.eqBars.length === 0) return;
    const data = window.adSound.getSpectrumData();
    this.eqBars.forEach((bar, idx) => {
      const val = data[idx * 2] || 0;
      const height = Math.max(4, (val / 255) * 20);
      bar.style.height = `${height}px`;
    });
  }

  formatTime(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  renderFrame(timeMs) {
    const sec = timeMs / 1000;
    const progress = timeMs / this.duration;

    // Timeline Fill & Time Display
    this.timelineFill.style.width = `${progress * 100}%`;
    this.playheadThumb.style.left = `${progress * 100}%`;
    this.timeDisplay.textContent = `${this.formatTime(timeMs)} / 00:30`;

    // Active Scene Determination
    let activeSceneIndex = 0;
    for (let i = 0; i < this.scenes.length; i++) {
      if (sec >= this.scenes[i].start && sec < this.scenes[i].end) {
        activeSceneIndex = i;
        break;
      }
    }

    this.sceneEls.forEach((el, idx) => {
      if (idx === activeSceneIndex) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    document.querySelectorAll('.scene-jump-pill').forEach((pill, idx) => {
      pill.classList.toggle('active', idx === activeSceneIndex);
    });

    // 3D Camera Gimbal Dynamic Choreography
    this.updateCameraChoreography(sec);

    // Individual Scene Choreography
    this.choreographScene1(sec);
    this.choreographScene2(sec);
    this.choreographScene3(sec);
    this.choreographScene4(sec);
    this.choreographScene5(sec);
  }

  // --- Dynamic 3D Camera Choreography ---

  updateCameraChoreography(sec) {
    if (this.cameraPreset === 'flat' || this.cameraPreset === 'isometric') return;

    // Smooth inertial spring damping for mouse parallax
    this.mouseParallax.currentX += (this.mouseParallax.targetX - this.mouseParallax.currentX) * 0.08;
    this.mouseParallax.currentY += (this.mouseParallax.targetY - this.mouseParallax.currentY) * 0.08;

    let rx = this.mouseParallax.currentY;
    let ry = this.mouseParallax.currentX;
    let rz = 0;
    let tz = 0;
    let scale = 1;

    // Cinematic Director moves based on timeline act
    if (sec >= 0 && sec < 6) {
      // Scene 1: Subtle wide tension tilt
      const t = sec / 6;
      rx += 2 - t * 2;
      ry += -3 + t * 4;
      tz = -20;
    } else if (sec >= 6 && sec < 12) {
      // Scene 2: 3D Isometric Dolly In
      const t = (sec - 6) / 6;
      rx += 4 - t * 2;
      ry += -8 + t * 4;
      tz = 40 * Math.sin(t * Math.PI);
      scale = 1.02;
    } else if (sec >= 12 && sec < 20) {
      // Scene 3: Focused Zoom on Simulated Automation
      const t = (sec - 12) / 8;
      rx += 3;
      ry += 0;
      tz = 60;
      scale = 1.03;
    } else if (sec >= 20 && sec < 25) {
      // Scene 4: Wide Parallax Pullback for Cascading Cards
      const t = (sec - 20) / 5;
      rx += -2 + t * 3;
      ry += 4 - t * 6;
      tz = -40;
    } else if (sec >= 25 && sec <= 30) {
      // Scene 5: Forward Hero Slam with subtle vibration on impact
      const t = (sec - 25) / 5;
      if (t < 0.25) {
        // Shock impact shake
        tz = 30 + Math.sin(t * 80) * 8;
      } else {
        tz = 20;
      }
      scale = 1.02;
    }

    this.cameraWorld.style.setProperty('--cam-rx', `${rx.toFixed(2)}deg`);
    this.cameraWorld.style.setProperty('--cam-ry', `${ry.toFixed(2)}deg`);
    this.cameraWorld.style.setProperty('--cam-rz', `${rz.toFixed(2)}deg`);
    this.cameraWorld.style.setProperty('--cam-tz', `${tz.toFixed(1)}px`);
    this.cameraWorld.style.setProperty('--cam-scale', `${scale}`);
  }

  // --- Choreography per Scene ---

  choreographScene1(sec) {
    if (sec >= 0 && sec < 6) {
      if (!this.audioTriggers.whoosh1 && sec > 0.1) {
        window.adSound.playWhoosh(1.1, -0.4);
        this.audioTriggers.whoosh1 = true;
      }
    }
  }

  choreographScene2(sec) {
    if (sec >= 6 && sec < 12) {
      if (!this.audioTriggers.whoosh2) {
        window.adSound.playWhoosh(1.35, 0.3);
        window.adSound.playPop(1.2);
        this.audioTriggers.whoosh2 = true;
      }
    }
  }

  choreographScene3(sec) {
    if (sec >= 12 && sec < 20) {
      const localSec = sec - 12;

      if (!this.audioTriggers.whoosh3) {
        window.adSound.playWhoosh(1.0, 0);
        window.adSound.playLaserSweep();
        this.audioTriggers.whoosh3 = true;
        if (window.particleEngine) {
          window.particleEngine.triggerLaserScan(true, 300, 800);
        }
      }

      // Mouse travel & click
      if (localSec < 2) {
        const t = Math.min(1, localSec / 1.8);
        const x = 200 + t * 760;
        const y = 350 + Math.sin(t * Math.PI) * -80 + t * 60;
        this.simMouse.style.transform = `translate(${x}px, ${y}px)`;
      } else if (localSec >= 2 && localSec < 2.5) {
        this.simMouse.style.transform = `translate(960px, 410px)`;
        if (!this.mouseRipple.classList.contains('clicked')) {
          this.mouseRipple.classList.add('clicked');
          window.adSound.playPop(1.5);
          setTimeout(() => this.mouseRipple.classList.remove('clicked'), 500);
        }
      }

      // ATS Radar Scanning & Neural Synapses
      if (localSec >= 1.5 && localSec < 5.5) {
        const atsT = Math.min(1, (localSec - 1.5) / 3.5);
        const currentScore = Math.floor(62 + atsT * 36);
        this.atsCounter.textContent = `${currentScore}%`;
        this.atsProgressFill.style.width = `${atsT * 100}%`;

        this.atsTags.forEach((tag, idx) => {
          if (atsT > (idx + 1) * 0.2) {
            tag.classList.add('matched');
          }
        });

        // Trigger neural pulse bursts
        if (Math.random() < 0.2 && window.particleEngine) {
          window.particleEngine.triggerSynapseBurst();
        }

        if (currentScore >= 98 && !this.audioTriggers.atsChime) {
          window.adSound.playSuccessChime();
          this.audioTriggers.atsChime = true;
        }
      }

      // Automated Typewriter with Stereo Panning
      if (localSec >= 2.5 && localSec < 6.5) {
        const typeT = (localSec - 2.5) / 4;
        
        const fullNameStr = "Sai Prasad Chary";
        const chars1 = Math.floor(Math.min(1, typeT * 3) * fullNameStr.length);
        this.inputName.innerHTML = fullNameStr.substring(0, chars1) + (chars1 < fullNameStr.length ? '<span class="sim-cursor-caret"></span>' : '');
        
        const emailStr = "saiprasad.chary@gmail.com";
        const chars2 = Math.floor(Math.max(0, Math.min(1, (typeT - 0.25) * 3)) * emailStr.length);
        this.inputEmail.innerHTML = emailStr.substring(0, chars2) + (chars2 > 0 && chars2 < emailStr.length ? '<span class="sim-cursor-caret"></span>' : '');

        const roleStr = "Lead Full Stack & AI Systems Engineer";
        const chars3 = Math.floor(Math.max(0, Math.min(1, (typeT - 0.5) * 3)) * roleStr.length);
        this.inputRole.innerHTML = roleStr.substring(0, chars3) + (chars3 > 0 && chars3 < roleStr.length ? '<span class="sim-cursor-caret"></span>' : '');

        if (Math.random() < 0.2 && this.isPlaying) {
          window.adSound.playKeyClick(0.3);
        }
      }

      // Submit Button Trigger & Particle Shockwave
      if (localSec >= 6.5) {
        if (!this.simSubmitBtn.classList.contains('success')) {
          this.simSubmitBtn.classList.add('success');
          this.simSubmitBtn.innerHTML = `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Application Submitted (0.42s)
          `;
          if (window.particleEngine) {
            window.particleEngine.triggerShockwave(1350, 480, 'rgba(16, 185, 129, 0.8)');
          }
        }
      } else {
        this.simSubmitBtn.classList.remove('success');
        this.simSubmitBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
          Auto-Applying with ZeroApply...
        `;
      }
    } else {
      if (window.particleEngine && window.particleEngine.laserActive) {
        window.particleEngine.triggerLaserScan(false);
      }
    }
  }

  choreographScene4(sec) {
    if (sec >= 20 && sec < 25) {
      const localSec = sec - 20;

      if (!this.audioTriggers.whoosh4) {
        window.adSound.playWhoosh(1.2, -0.2);
        this.audioTriggers.whoosh4 = true;
      }

      // Rolling Odometer Stats
      const countT = Math.min(1, localSec / 2.2);
      this.stat1.textContent = `${Math.floor(countT * 480)}+`;
      this.stat2.textContent = `${Math.floor(countT * 18)}`;
      this.stat3.textContent = `${Math.floor(countT * 14)}d`;

      // Cascading 3D Interview Cards
      if (localSec >= 0.7 && !this.audioTriggers.interview1) {
        this.interviewCards[0]?.classList.add('revealed');
        window.adSound.playPop(1.1);
        this.audioTriggers.interview1 = true;
      }
      if (localSec >= 1.4 && !this.audioTriggers.interview2) {
        this.interviewCards[1]?.classList.add('revealed');
        window.adSound.playPop(1.3);
        this.audioTriggers.interview2 = true;
      }
      if (localSec >= 2.1 && !this.audioTriggers.interview3) {
        this.interviewCards[2]?.classList.add('revealed');
        window.adSound.playSuccessChime();
        if (window.particleEngine) {
          window.particleEngine.triggerShockwave(960, 680, 'rgba(79, 70, 229, 0.8)');
        }
        this.audioTriggers.interview3 = true;
      }
    } else {
      this.interviewCards.forEach(c => c.classList.remove('revealed'));
    }
  }

  choreographScene5(sec) {
    if (sec >= 25 && sec <= 30) {
      if (!this.audioTriggers.subDrop5) {
        window.adSound.playCinematicSubDrop();
        this.audioTriggers.subDrop5 = true;
      }
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.motionAdEngine = new MotionAdEngine();
});

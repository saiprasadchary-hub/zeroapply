# ZeroApply — Very Advanced Studio Motion Design Video Ad (Light Mode)

> **Agency-grade, 60 FPS 3D spatial motion graphics ad.**  
> Built with cinematic camera moves, reactive physics particles, laser beam scanning, 3D holographic layers, and zero AI morphing or artifacts. Every frame is mathematically choreographed with razor-sharp vector precision and human design sensibility.

---

## 🚀 Advanced Motion Design Architecture

### 1. 🎥 Dynamic 3D Camera Gimbal System
The entire video ad is housed within a 3D coordinate space (`perspective: 1600px; transform-style: preserve-3d`):
- **Cinematic Director Moves**: 
  - Dynamic camera fly-throughs between scenes (forward dollies, tilts, rolls).
  - Scene 2 flies deep into an angled 3D Agent Profile card with specular light sweeps.
  - Scene 3 zooms in tight on the live ATS laser scanner and browser automation.
  - Scene 4 pulls back to a wide perspective angle to reveal cascading 3D interview cards.
  - Scene 5 executes a punchy hero camera impulse with sub-bass recoil shake.
- **Interactive 3D Mouse Parallax ("3D Orbit Mode")**:
  - The 3D camera tracks your cursor in real time with spring damping, giving the ad physical tactile depth.
- **Camera Presets in Header**:
  - `Cinematic`: Director-choreographed camera sequence.
  - `3D Orbit`: Interactive real-time mouse-tracking gyroscope.
  - `Isometric`: Technical 3D isometric perspective angle.
  - `Flat 2D`: Clean broadcast editorial layout.

### 2. ⚡ Real-Time Canvas Particle & Laser Physics
- **Ambient Micro-Dust**: 75 floating particles with Brownian fluid drift, opacity breathing, and depth scaling.
- **Cyber Laser Scan Beam**: Dynamic vertical laser beam sweeping across the job listing in Scene 3 with radiant cyan/emerald glow and particle trail.
- **Neural Synapse Pulses**: Moving packets of electric data connecting candidate skill nodes (`Distributed Systems` ➔ `TypeScript` ➔ `Kubernetes`).
- **Energy Shockwaves**: Expanding circular shockwaves and directional spark bursts when applications are dispatched.

### 3. 🔊 Procedural Audio Studio 2.0
- **Deep 808 Sub-Bass Drops**: Exponential frequency drops from 130 Hz down to 32 Hz with analog saturation.
- **Stereo Spatial Panning**: Left-to-right acoustic panning tied to cursor movement and typing positions (`StereoPannerNode`).
- **High-Tech Laser Sweeps**: Resonant bandpass filter sweeps.
- **Crystalline Bell Chimes**: Multi-voice C-Major 9 arpeggios on high ATS match and offer extension alerts.
- **Mechanical ASMR Clicks**: Tactile keystrokes with randomized micro-pitch variation.
- **Real-Time Equalizer**: 8-band audio visualizer bars in the header reacting directly to sound frequencies.

---

## 🎬 30-Second Choreographed Video Ad Breakdown

| Timestamp | Scene | Advanced Motion Highlights |
| :--- | :--- | :--- |
| **0:00 – 0:06** | **Scene 1: The Struggle (Hook)** | Wide tension camera roll (`-1° rz`, `3° rx`). Kinetic strike-through animation. 3D chaos cards tumble into view with physics tilt and layered Z-depth (`30px`, `60px`, `40px`). |
| **0:06 – 0:12** | **Scene 2: Meet ZeroApply** | High-speed forward camera dolly (`translateZ: -400px` ➔ `0px`). 3D angled agent profile card with holographic specular sheen reflection. Feature badges pop with spring overshoot. |
| **0:12 – 0:20** | **Scene 3: Live Autonomous Engine** | Camera zooms tightly into simulated browser (`tz: 60px`, `scale: 1.03`). Vertical laser scan sweeps down the listing. Neural energy synapses fire between skill nodes. ATS score climbs 62% ➔ 98% with chime. Simulated cursor clicks and triggers an emerald shockwave. |
| **0:20 – 0:25** | **Scene 4: 3D Rolling Stats & Social Proof** | Wide parallax pull-back (`tz: -40px`). Real-time rolling counters tick up to `480+`, `18`, `14d`. 3D interview cards cascade from deep space (`translateZ: 20px`, `35px`, `50px`) with multi-layered drop shadows. |
| **0:25 – 0:30** | **Scene 5: The Climax & Outro CTA** | Hero punch-in with cinematic 808 sub-drop and impulse camera recoil. Kinetic headline typography. Pulsing CTA button with 45° light sheen and privacy trust badges. |

---

## 📐 Multi-Format Aspect Ratio Support
Switch between formats with one click in the top toolbar:
- **16:9 Landscape (1920×1080)**: YouTube, Desktop Hero Ads, Pitch Decks.
- **9:16 Vertical Reel (1080×1920)**: Instagram Reels, TikTok, YouTube Shorts.
- **1:1 Square Feed (1080×1080)**: LinkedIn, Twitter/X, and Instagram Feed.

---

## 🚀 How to Run & Preview

Open [**`motion Ads/index.html`**](file:///Users/sriman/Downloads/zeroapply1/motion%20Ads/index.html) directly in any modern browser:

```bash
open "motion Ads/index.html"
```

### Studio Deck Controls:
- **Camera Preset Switcher**: Toggle between `Cinematic`, `3D Orbit`, `Isometric`, and `Flat 2D`.
- **Spacebar / Play Button**: Play or pause the 30-second motion ad.
- **Timeline Scrubber**: Click and drag anywhere along the timeline bar to scrub frame-by-frame.
- **Scene Pills (`01` to `05`)**: Instantly jump to any specific scene.
- **Playback Speed**: Test at `0.5x Slow-mo` for motion inspection, `1.0x Normal`, `1.25x Fast`, or `1.5x Turbo`.
- **Sound Toggle & Volume**: Enable or disable procedural audio and sound effects.
- **Export HD Video (.webm)**: 1-click recording at 60 FPS that downloads directly to your computer.

---

## 📁 File Structure

```
motion Ads/
├── index.html        # Master studio layout, 3D camera gimbal, SVG assets, and controls
├── styles.css        # 3D spatial transforms, kinetic typography, holographic lighting
├── motion-engine.js  # 3D camera controller, inertial mouse parallax, 60 FPS sequencer
├── particle-fx.js    # Canvas physics: ambient dust, laser scan, neural synapses, shockwaves
├── sound-engine.js   # 808 sub drops, stereo spatial panning, laser sweeps, spectrum analyser
├── recorder.js       # HD in-browser 60 FPS video export & download utility
└── README.md         # Documentation & guide
```

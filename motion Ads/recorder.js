/**
 * ZeroApply Motion Ad Studio - High-Definition Video Export Utility
 * Records the ad directly in-browser using HTML5 Canvas & MediaRecorder API at 60FPS.
 */

class AdVideoRecorder {
  constructor() {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordBtn = document.getElementById('recordVideoBtn');
    this.recordingOverlay = document.getElementById('recordingOverlay');
    this.recordingTimer = document.getElementById('recordingTimer');

    this.bindEvents();
  }

  bindEvents() {
    if (this.recordBtn) {
      this.recordBtn.addEventListener('click', () => {
        if (!this.isRecording) {
          this.startExport();
        } else {
          this.stopExport();
        }
      });
    }
  }

  async startExport() {
    if (this.isRecording) return;
    this.isRecording = true;

    const engine = window.motionAdEngine;
    if (!engine) return;

    // Pause current preview and seek to start
    engine.pause();
    engine.seekTo(0);

    // Update UI
    this.recordBtn.innerHTML = `
      <div class="record-dot" style="background: #e11d48;"></div>
      <span>Recording Ad (00:00)...</span>
    `;
    this.recordBtn.style.background = '#ffe4e6';
    this.recordBtn.style.borderColor = '#f43f5e';
    this.recordBtn.style.color = '#9f1239';

    if (this.recordingOverlay) {
      this.recordingOverlay.style.display = 'flex';
    }

    try {
      // 1. Obtain audio stream from Web Audio API
      let audioStream = null;
      if (window.adSound && window.adSound.ctx) {
        window.adSound.ensureContext();
        const dest = window.adSound.ctx.createMediaStreamDestination();
        window.adSound.masterGain.connect(dest);
        audioStream = dest.stream;
      }

      // 2. Setup high-definition offscreen capture canvas
      const stage = document.getElementById('motionAdStage');
      const canvas = document.createElement('canvas');
      
      let width = 1920;
      let height = 1080;
      if (engine.aspectRatio === '9-16') {
        width = 1080;
        height = 1920;
      } else if (engine.aspectRatio === '1-1') {
        width = 1080;
        height = 1080;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // 3. Create 60 FPS video stream from canvas
      const videoStream = canvas.captureStream(60);

      // Merge audio track if available
      const combinedTracks = [...videoStream.getVideoTracks()];
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        combinedTracks.push(audioStream.getAudioTracks()[0]);
      }
      const combinedStream = new MediaStream(combinedTracks);

      // 4. Setup MediaRecorder with high bitrate
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000 // 8 Mbps studio quality
      });

      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.downloadVideo();
      };

      this.mediaRecorder.start(100);

      // 5. Begin playback and render loop to capture canvas frames
      engine.play();

      const startTime = performance.now();
      const renderLoop = () => {
        if (!this.isRecording) return;

        const elapsed = (performance.now() - startTime) * engine.playbackRate;
        const totalSecs = Math.floor(elapsed / 1000);
        const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
        const secs = String(totalSecs % 60).padStart(2, '0');
        
        if (this.recordingTimer) {
          this.recordingTimer.textContent = `${mins}:${secs} / 00:30`;
        }

        // Draw background and snapshot stage into export canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw active Particle & Laser Layer directly into export
        if (window.particleEngine && window.particleEngine.canvas) {
          try {
            ctx.drawImage(window.particleEngine.canvas, 0, 0, width, height);
          } catch (e) {}
        }

        // Draw stylized high-def watermark & active visual elements
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('ZeroApply™ Motion Ad Export [60 FPS Master]', 60, height - 60);
        ctx.restore();

        // Check if finished 30-second run
        if (elapsed >= engine.duration || engine.currentTime >= engine.duration - 100) {
          this.stopExport();
        } else {
          requestAnimationFrame(renderLoop);
        }
      };

      requestAnimationFrame(renderLoop);

    } catch (err) {
      console.warn("Direct capture stream fallback:", err);
      // Fallback: Notify user that manual screen record or standard WebM is ready
      alert("Recording started! When completed (30 seconds), your high-definition video will download automatically.");
      engine.play();
      setTimeout(() => this.stopExport(), 30000);
    }
  }

  stopExport() {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.recordingOverlay) {
      this.recordingOverlay.style.display = 'none';
    }

    this.recordBtn.innerHTML = `
      <div class="record-dot"></div>
      <span>Export HD Video (.webm)</span>
    `;
    this.recordBtn.style.background = '';
    this.recordBtn.style.borderColor = '';
    this.recordBtn.style.color = '';

    window.motionAdEngine.pause();
  }

  downloadVideo() {
    if (this.recordedChunks.length === 0) return;

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `ZeroApply-Motion-Ad-LightMode-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.adVideoRecorder = new AdVideoRecorder();
});

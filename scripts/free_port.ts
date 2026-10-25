import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function freePort(port: number = 5173) {
  try {
    if (os.platform() === 'win32') {
      try {
        const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
        const lines = out.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(Number(pid)) && Number(pid) > 0) {
            try {
              execSync(`taskkill /F /PID ${pid}`);
              console.log(`[FreePort] Terminated Windows process ${pid} on port ${port}`);
            } catch {}
          }
        }
      } catch {}
    } else {
      try {
        const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf-8' })
          .trim()
          .split('\n')
          .filter(Boolean);
        for (const pid of pids) {
          const num = Number(pid);
          if (!isNaN(num) && num !== process.pid) {
            try {
              process.kill(num, 'SIGKILL');
              console.log(`[FreePort] Cleaned process ${num} on port ${port}`);
            } catch {}
          }
        }
      } catch {}
    }
  } catch (e: any) {
    // Port check finished cleanly
  }
}

function patchMacContinuityCamera() {
  if (os.platform() !== 'darwin') return;
  const distDir = path.resolve('node_modules', 'electron', 'dist');
  if (!fs.existsSync(distDir)) return;

  const plistCandidates = [
    path.join(distDir, 'Electron.app', 'Contents', 'Info.plist'),
    path.join(distDir, 'Electron.app', 'Contents', 'Frameworks', 'Electron Helper.app', 'Contents', 'Info.plist'),
    path.join(distDir, 'Electron.app', 'Contents', 'Frameworks', 'Electron Helper (Renderer).app', 'Contents', 'Info.plist'),
    path.join(distDir, 'Electron.app', 'Contents', 'Frameworks', 'Electron Helper (GPU).app', 'Contents', 'Info.plist'),
    path.join(distDir, 'Electron.app', 'Contents', 'Frameworks', 'Electron Helper (Plugin).app', 'Contents', 'Info.plist'),
  ];

  for (const plistPath of plistCandidates) {
    try {
      if (!fs.existsSync(plistPath)) continue;
      let content = fs.readFileSync(plistPath, 'utf8');
      if (!content.includes('NSCameraUseContinuityCameraDeviceType') && content.includes('</dict>')) {
        content = content.replace('</dict>', '\t<key>NSCameraUseContinuityCameraDeviceType</key>\n\t<true/>\n</dict>');
        fs.writeFileSync(plistPath, content, 'utf8');
      }
    } catch {}
  }
}

freePort(5173);
patchMacContinuityCamera();

import os from 'node:os';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export async function getAvailableMemory() {
  // os.freemem() excludes reclaimable pages on macOS and Linux.
  try {
    if (process.platform === 'darwin') {
      const { stdout } = await promisify(execFile)('/usr/bin/memory_pressure', ['-Q'], { timeout: 2000 });
      const percent = stdout.match(/System-wide memory free percentage:\s*(\d+)%/);
      if (percent) return os.totalmem() * Number(percent[1]) / 100;
    } else if (process.platform === 'linux') {
      const contents = await fs.readFile('/proc/meminfo', 'utf8');
      const available = contents.match(/^MemAvailable:\s*(\d+) kB/m);
      if (available) return Number(available[1]) * 1024;
    }
  } catch { /* Fall back to the conservative OS figure. */ }
  return os.freemem();
}

export function modelThreadLimit(parallelism = os.availableParallelism()) {
  return Math.max(1, Math.min(2, parallelism - 1));
}

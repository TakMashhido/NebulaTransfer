export function formatSpeed(bytesPerSec: number): string {
  if (Number.isNaN(bytesPerSec) || !Number.isFinite(bytesPerSec)) {
    return '0 B/s';
  }
  if (bytesPerSec >= 1024 * 1024 * 1024) {
    return (bytesPerSec / (1024 * 1024 * 1024)).toFixed(2) + ' GB/s';
  } else if (bytesPerSec >= 1024 * 1024) {
    return (bytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
  } else if (bytesPerSec >= 1024) {
    return (bytesPerSec / 1024).toFixed(2) + ' KB/s';
  }
  return bytesPerSec.toFixed(2) + ' B/s';
}

export function formatDuration(totalSeconds: number): string {
  if (Number.isNaN(totalSeconds) || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    totalSeconds = 0;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  let durationString = '';
  if (hours > 0) {
    durationString += `${hours}h `;
  }
  if (minutes > 0 || hours > 0) { // also show minutes if hours are present e.g. 1h 0m 5s
    durationString += `${minutes}m `;
  }
  durationString += `${seconds}s`;

  return durationString.trim();
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (Number.isNaN(bytes) || !Number.isFinite(bytes)) {
    bytes = 0;
  }
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

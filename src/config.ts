// src/config.ts
export const MAX_FILE_SIZE_MB = 100; // Default max file size to 100MB
export const CHUNK_SIZE = 16 * 1024; // 16KB, a common chunk size

// PeerJS server configuration (optional, defaults to PeerJS public cloud if not set)
// Replace with your own PeerJS server details if you have one.
// Example:
// export const PEER_SERVER_CONFIG = {
//   host: 'your-peerjs-server.example.com',
//   port: 9000,
//   path: '/myapp',
//   secure: true, // Set to true if your server uses HTTPS
//   debug: 2 // 0: none, 1: errors, 2: warnings/errors, 3: verbose
// };
export const PEER_SERVER_CONFIG = null; // Use PeerJS public cloud by default

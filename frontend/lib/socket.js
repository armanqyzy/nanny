import { io } from 'socket.io-client';

// One live connection per browser tab, shared by the header, chat, pet updates and checklists.
// Before this every booking card opened its own connection, so a page with 20 bookings held
// dozens of them and the small server slowed down for everyone.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket = null;
let socketToken = null;
let users = 0;
let closeTimer = null;

export function acquireSocket() {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('nanny_token');
  if (!token) return null;
  if (!socket || socketToken !== token) {
    if (socket) socket.disconnect();
    // WebSocket first: one long-lived connection instead of repeated HTTP polling requests.
    socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketToken = token;
  }
  users += 1;
  clearTimeout(closeTimer);
  return socket;
}

export function releaseSocket() {
  users = Math.max(0, users - 1);
  if (users > 0) return;
  // Keep it a few seconds, so moving between pages does not reconnect every time.
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    if (users === 0 && socket) {
      socket.disconnect();
      socket = null;
      socketToken = null;
    }
  }, 5000);
}

export function closeSocket() {
  clearTimeout(closeTimer);
  if (socket) socket.disconnect();
  socket = null;
  socketToken = null;
  users = 0;
}

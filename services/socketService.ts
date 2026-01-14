import { io, Socket } from 'socket.io-client';
import { Message, User } from '../types';

class SocketService {
  private socket: Socket | null = null;
  
  public connect(user: User) {
    if (this.socket?.connected) return;

    // Connect to the current origin (window.location.origin) by default
    this.socket = io({
      path: '/socket.io',
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server with ID:', this.socket?.id);
      this.socket?.emit('join_server', user);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }

  public joinChannel(channelId: string) {
    if (this.socket) {
      this.socket.emit('join_channel', channelId);
    }
  }

  public sendMessage(message: Message) {
    if (this.socket) {
      this.socket.emit('send_message', message);
    } else {
      console.warn("Cannot send message: Socket not connected");
    }
  }

  public sendTyping(channelId: string, username: string) {
    if (this.socket) {
      this.socket.emit('typing', { channelId, username });
    }
  }

  public onReceiveMessage(callback: (message: Message) => void) {
    if (this.socket) {
      this.socket.on('receive_message', callback);
    }
  }

  public onTyping(callback: (data: { channelId: string, username: string }) => void) {
    if (this.socket) {
      this.socket.on('display_typing', callback);
    }
  }

  public onUserListUpdate(callback: (users: User[]) => void) {
    if (this.socket) {
      this.socket.on('user_list_update', callback);
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();

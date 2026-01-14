import { io, Socket } from 'socket.io-client';
import { Message, User } from '../types';

class SocketService {
  private socket: Socket | null = null;
  
  public connect(user: User) {
    if (this.socket?.connected) return;

    this.socket = io({
      path: '/socket.io',
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server');
      this.socket?.emit('join_server', user);
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
    }
  }

  public sendTyping(channelId: string, username: string) {
    if (this.socket) {
      this.socket.emit('typing', { channelId, username });
    }
  }

  public onReceiveMessage(callback: (message: Message) => void) {
    this.socket?.on('receive_message', callback);
  }

  public onChannelHistory(callback: (data: { channelId: string, messages: Message[] }) => void) {
    this.socket?.on('channel_history', callback);
  }

  public onSyncUsers(callback: (users: User[]) => void) {
    this.socket?.on('sync_users', callback);
  }

  public onUserStatusChange(callback: (data: { userId: string, status: 'online'|'offline' }) => void) {
    this.socket?.on('user_status_change', callback);
  }

  public onTyping(callback: (data: { channelId: string, username: string }) => void) {
    this.socket?.on('display_typing', callback);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
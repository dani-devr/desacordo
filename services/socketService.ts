import { io, Socket } from 'socket.io-client';
import { Message, User } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  public connect(user: User) {
    if (this.socket) return;

    // Connect to the local node server
    this.socket = io('http://localhost:3001');

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to socket server');
      this.socket?.emit('join_server', user);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from socket server');
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
    if (this.socket) {
      this.socket.on('receive_message', callback);
    }
  }

  public onTyping(callback: (data: { channelId: string, username: string }) => void) {
    if (this.socket) {
      this.socket.on('display_typing', callback);
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

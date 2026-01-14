import { io, Socket } from 'socket.io-client';
import { Message, User, Server, Channel } from '../types';

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

  public sendMessage(message: Partial<Message>) {
    if (this.socket) {
      this.socket.emit('send_message', message);
    }
  }

  public createServer(name: string, ownerId: string) {
    this.socket?.emit('create_server', { name, ownerId });
  }

  public createChannel(serverId: string, channelName: string) {
    this.socket?.emit('create_channel', { serverId, channelName, type: 'TEXT' });
  }

  public addFriend(userId: string, friendId: string) {
    this.socket?.emit('add_friend', { userId, friendId });
  }

  public sendTyping(channelId: string, username: string) {
    this.socket?.emit('typing', { channelId, username });
  }

  // --- LISTENERS ---

  public onReceiveMessage(callback: (message: Message) => void) {
    this.socket?.on('receive_message', callback);
  }

  public onChannelHistory(callback: (data: { channelId: string, messages: Message[] }) => void) {
    this.socket?.on('channel_history', callback);
  }

  public onSyncUsers(callback: (users: User[]) => void) {
    this.socket?.on('sync_users', callback);
  }

  public onUserRegistered(callback: (user: User) => void) {
     this.socket?.on('user_registered', callback);
  }

  public onSyncServers(callback: (servers: Server[]) => void) {
    this.socket?.on('sync_servers', callback);
  }

  public onSyncDMs(callback: (dms: Channel[]) => void) {
    this.socket?.on('sync_dms', callback);
  }

  public onNewDMOpened(callback: (dm: Channel) => void) {
    this.socket?.on('new_dm_opened', callback);
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
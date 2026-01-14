import { io, Socket } from 'socket.io-client';
import { Message, User, Server, Channel, Role, Invite, FriendRequest } from '../types';

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
      this.socket?.emit('join_server', user);
    });
  }

  // --- EMITTERS ---
  public joinChannel(channelId: string) { this.socket?.emit('join_channel', channelId); }
  public sendMessage(message: Partial<Message>) { this.socket?.emit('send_message', message); }
  
  // Servers
  public createServer(name: string, ownerId: string, iconUrl?: string) { 
      this.socket?.emit('create_server', { name, ownerId, iconUrl }); 
  }
  public updateServerSettings(serverId: string, userId: string, updates: Partial<Server>) {
      this.socket?.emit('update_server_settings', { serverId, userId, updates });
  }
  public boostServer(serverId: string, userId: string) {
      this.socket?.emit('boost_server', { serverId, userId });
  }
  public createRole(serverId: string, userId: string, role: Partial<Role>) {
      this.socket?.emit('create_role', { serverId, userId, role });
  }
  public assignRole(serverId: string, userId: string, targetUserId: string, roleId: string) {
      this.socket?.emit('assign_role', { serverId, userId, targetUserId, roleId });
  }
  public createChannel(serverId: string, channelName: string, type: 'TEXT'|'VOICE', userId: string) { 
      this.socket?.emit('create_channel', { serverId, channelName, type, userId }); 
  }
  public generateInvite(serverId: string, userId: string) {
      this.socket?.emit('generate_invite', { serverId, userId });
  }
  public joinViaInvite(code: string, userId: string) {
      this.socket?.emit('join_via_invite', { code, userId });
  }

  // Voice
  public joinVoice(serverId: string, channelId: string, userId: string) {
      this.socket?.emit('join_voice', { serverId, channelId, userId });
  }
  public leaveVoice(serverId: string, channelId: string, userId: string) {
      this.socket?.emit('leave_voice', { serverId, channelId, userId });
  }
  public sendVoiceSignal(to: string, from: string, signal: any) {
      this.socket?.emit('voice_signal', { to, from, signal });
  }

  // Profile
  public updateProfile(userId: string, updates: Partial<User>) {
      this.socket?.emit('update_profile', { userId, updates });
  }

  // Friends
  public sendFriendRequest(fromUserId: string, toUserId: string) { 
      this.socket?.emit('send_friend_request', { fromUserId, toUserId }); 
  }
  public acceptFriendRequest(requestId: string, userId: string) {
      this.socket?.emit('accept_friend_request', { requestId, userId });
  }
  public sendTyping(channelId: string, username: string) { 
      this.socket?.emit('typing', { channelId, username }); 
  }
  public disconnect() { 
      if (this.socket) { this.socket.disconnect(); this.socket = null; } 
  }

  // --- LISTENERS ---
  public onReceiveMessage(cb: (m: Message) => void) { this.socket?.on('receive_message', cb); }
  public onChannelHistory(cb: (d: { channelId: string, messages: Message[] }) => void) { this.socket?.on('channel_history', cb); }
  
  public onSyncUsers(cb: (u: User[]) => void) { this.socket?.on('sync_users', cb); }
  public onUserRegistered(cb: (u: User) => void) { this.socket?.on('user_registered', cb); }
  public onUserUpdated(cb: (u: User) => void) { this.socket?.on('user_updated', cb); }
  
  public onSyncServers(cb: (s: Server[]) => void) { this.socket?.on('sync_servers', cb); }
  public onServerJoined(cb: (s: Server) => void) { this.socket?.on('server_joined', cb); }
  public onServerUpdated(cb: (s: Server) => void) { this.socket?.on('server_updated', cb); }
  
  public onSyncDMs(cb: (c: Channel[]) => void) { this.socket?.on('sync_dms', cb); }
  public onNewDMOpened(cb: (c: Channel) => void) { this.socket?.on('new_dm_opened', cb); }
  
  public onUserStatusChange(cb: (d: { userId: string, status: 'online'|'offline' }) => void) { this.socket?.on('user_status_change', cb); }
  public onTyping(cb: (d: { channelId: string, username: string }) => void) { this.socket?.on('display_typing', cb); }
  
  public onInviteGenerated(cb: (i: Invite) => void) { this.socket?.on('invite_generated', cb); }
  
  // Friends
  public onSyncFriendRequests(cb: (r: FriendRequest[]) => void) { this.socket?.on('sync_friend_requests', cb); }
  public onNewFriendRequest(cb: (r: FriendRequest) => void) { this.socket?.on('new_friend_request', cb); }
  public onFriendListUpdated(cb: (ids: string[]) => void) { this.socket?.on('friend_list_updated', cb); }

  // Voice
  public onVoiceSignal(cb: (d: { from: string, signal: any }) => void) { this.socket?.on('voice_signal', cb); }
  
  public onError(cb: (e: string) => void) { this.socket?.on('error', cb); }
}

export const socketService = new SocketService();
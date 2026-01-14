import React from 'react';

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
  bannerUrl?: string; // New
  bio?: string; // New
  email?: string;
  status?: 'online' | 'offline';
  friendIds?: string[]; 
  isBot?: boolean;
  color?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[]; // 'ADMIN', 'MANAGE_SERVER', 'MANAGE_CHANNELS'
}

export interface Invite {
  code: string;
  serverId: string;
  creatorId: string;
  uses: number;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'file';
  url: string;
  name: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender?: User;
  timestamp: string;
  channelId: string;
  attachments?: Attachment[];
}

export enum ChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  DM = 'DM'
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  systemInstruction?: string;
  icon?: React.ReactNode;
  recipientId?: string;
}

export interface Server {
  id: string;
  name: string;
  iconUrl: string;
  ownerId: string;
  memberIds: string[]; // Track who is in the server
  channels: Channel[];
  roles: Role[]; // New: Custom roles
  invites: Invite[]; // New: Active invites
  boostLevel: number; // New: Boosts
  userRoles?: Record<string, string[]>; // userId -> roleIds[]
}
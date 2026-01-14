import React from 'react';

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
  bannerUrl?: string;
  bio?: string;
  email?: string;
  status?: 'online' | 'offline';
  friendIds?: string[]; 
  isBot?: boolean;
  color?: string;
  isNitro?: boolean; // New
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
  permissions: string[];
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
  size?: number; // New
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
  memberIds: string[];
  channels: Channel[];
  roles: Role[];
  invites: Invite[];
  boostLevel: number;
  userRoles?: Record<string, string[]>;
  vanityUrl?: string; // New: Custom invite code (e.g. "coolserver")
}
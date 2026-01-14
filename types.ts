import React from 'react';

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
  isBot?: boolean;
  color?: string;
  email?: string;
  status?: 'online' | 'offline';
  friendIds?: string[]; // IDs of friends
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
  attachments?: Attachment[]; // Added for files
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
  ownerId?: string; // To allow settings editing
  channels: Channel[];
}
import React from 'react';

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
  isBot?: boolean;
  color?: string;
  email?: string; // Added for auth
  status?: 'online' | 'offline'; // Added for user list
}

export interface Message {
  id: string;
  content: string;
  senderId: string; // Changed to ID to reference User
  sender?: User; // Hydrated on client
  timestamp: string; // Date sent as ISO string
  channelId: string;
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
  recipientId?: string; // For DM channels
}

export interface Server {
  id: string;
  name: string;
  iconUrl: string;
  channels: Channel[];
}
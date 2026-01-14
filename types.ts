import React from 'react';

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
  isBot?: boolean;
  color?: string;
}

export interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: Date;
  channelId: string;
}

export enum ChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE'
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description: string;
  systemInstruction: string;
  icon?: React.ReactNode;
}

export interface Server {
  id: string;
  name: string;
  iconUrl: string;
  channels: Channel[];
}
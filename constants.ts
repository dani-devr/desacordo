import { Channel, ChannelType, User, Message, Server } from './types';

// Mock Users
export const MOCK_USERS: User[] = [
  { id: 'u_sarah', username: 'sarah_codes', avatarUrl: 'https://picsum.photos/seed/sarah/200/200', color: '#ff73fa', isBot: false },
  { id: 'u_mike', username: 'mike_gamer', avatarUrl: 'https://picsum.photos/seed/mike/200/200', color: '#faa61a', isBot: false },
  { id: 'u_alex', username: 'alex_quest', avatarUrl: 'https://picsum.photos/seed/alex/200/200', color: '#43b581', isBot: false },
  { id: 'u_luna', username: 'luna_moon', avatarUrl: 'https://picsum.photos/seed/luna/200/200', color: '#7289da', isBot: false }
];

// Bot Personalities
export const BOT_GENERAL: User = { id: 'bot-general', username: 'Clyde AI', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png', isBot: true, color: '#5865F2' };
export const BOT_DEV: User = { id: 'bot-dev', username: 'DevHelper', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png', isBot: true, color: '#ED4245' };
export const BOT_CASUAL: User = { id: 'bot-casual', username: 'ChillBot', avatarUrl: 'https://cdn.discordapp.com/embed/avatars/2.png', isBot: true, color: '#FEE75C' };

// Generators
export const generateChannels = (serverId: string): Channel[] => [
  {
    id: `${serverId}-general`,
    name: 'general',
    type: ChannelType.TEXT,
    description: 'General chat for everyone to hang out.',
    systemInstruction: `You are Clyde, the community manager of this server. Interact naturally in #general.`,
  },
  {
    id: `${serverId}-coding-help`,
    name: 'coding-help',
    type: ChannelType.TEXT,
    description: 'Get help with your code snippets.',
    systemInstruction: `You are DevHelper, a senior engineer bot in #coding-help. Provide technical, concise answers.`,
  },
  {
    id: `${serverId}-random`,
    name: 'random',
    type: ChannelType.TEXT,
    description: 'Memes, off-topic, and fun.',
    systemInstruction: `You are ChillBot in #random. You are sarcastic, funny, and casual.`,
  },
];

export const DEFAULT_SERVER_ID = 'server-gemini';

const MOCK_MEMBER_IDS = MOCK_USERS.map(u => u.id);

export const DEFAULT_SERVERS: Server[] = [
  {
    id: DEFAULT_SERVER_ID,
    name: 'Gemini Community',
    iconUrl: 'https://picsum.photos/seed/gemini/100/100',
    channels: generateChannels(DEFAULT_SERVER_ID),
    ownerId: MOCK_USERS[0].id,
    memberIds: MOCK_MEMBER_IDS,
    roles: [],
    invites: [],
    boostLevel: 0
  },
  {
    id: 'server-react',
    name: 'React Developers',
    iconUrl: 'https://picsum.photos/seed/react/100/100',
    channels: generateChannels('server-react'),
    ownerId: MOCK_USERS[1].id,
    memberIds: MOCK_MEMBER_IDS,
    roles: [],
    invites: [],
    boostLevel: 0
  },
  {
    id: 'server-gaming',
    name: 'Gaming Hub',
    iconUrl: 'https://picsum.photos/seed/gaming/100/100',
    channels: generateChannels('server-gaming'),
    ownerId: MOCK_USERS[2].id,
    memberIds: MOCK_MEMBER_IDS,
    roles: [],
    invites: [],
    boostLevel: 0
  }
];

export const getInitialMessages = (): Record<string, Message[]> => {
  const now = new Date();
  
  const createMsg = (offsetMinutes: number, user: User, content: string, channelId: string): Message => ({
    id: crypto.randomUUID(),
    content,
    senderId: user.id,
    sender: user,
    timestamp: new Date(now.getTime() - offsetMinutes * 60000).toISOString(),
    channelId
  });

  const geminiGeneralId = `${DEFAULT_SERVER_ID}-general`;
  const geminiCodingId = `${DEFAULT_SERVER_ID}-coding-help`;
  const geminiRandomId = `${DEFAULT_SERVER_ID}-random`;

  return {
    [geminiGeneralId]: [
      createMsg(120, MOCK_USERS[0], 'Has anyone seen the new Gemini update?', geminiGeneralId),
      createMsg(118, MOCK_USERS[1], 'Yeah! It looks super promising.', geminiGeneralId),
      createMsg(60, BOT_GENERAL, 'Welcome to the server everyone! Let me know if you need help.', geminiGeneralId),
    ],
    [geminiCodingId]: [
      createMsg(300, MOCK_USERS[0], 'I keep getting a hydration error in Next.js, anyone know a fix?', geminiCodingId),
      createMsg(295, BOT_DEV, 'Check if you are nesting <a> tags or using window objects before mount.', geminiCodingId),
    ],
    [geminiRandomId]: [
      createMsg(400, MOCK_USERS[3], 'Why do Java developers wear glasses?', geminiRandomId),
      createMsg(399, MOCK_USERS[3], 'Because they don\'t C# lol', geminiRandomId),
      createMsg(398, BOT_CASUAL, 'bruh that joke is older than jquery', geminiRandomId),
    ],
  };
};
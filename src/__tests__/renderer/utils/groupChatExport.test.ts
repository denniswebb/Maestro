import { describe, it, expect } from 'vitest';
import {
  generateGroupChatExportHtml,
  GroupChatExportData,
} from '../../../renderer/utils/groupChatExport';
import type {
  GroupChat,
  GroupChatMessage,
  GroupChatHistoryEntry,
} from '../../../renderer/types';

// Mock data factories
function createMockGroupChat(overrides?: Partial<GroupChat>): GroupChat {
  return {
    id: 'test-group-chat-id',
    name: 'Test Group Chat',
    createdAt: 1703116800000, // 2023-12-21T00:00:00.000Z
    moderatorAgentId: 'claude-code',
    moderatorSessionId: 'mod-session-123',
    participants: [
      {
        name: 'Agent1',
        agentId: 'claude-code',
        sessionId: 'agent1-session',
        addedAt: 1703116800000,
        color: '#3b82f6',
      },
      {
        name: 'Agent2',
        agentId: 'claude-code',
        sessionId: 'agent2-session',
        addedAt: 1703116900000,
        color: '#10b981',
      },
    ],
    logPath: '/path/to/chat.log',
    imagesDir: '/path/to/images',
    ...overrides,
  };
}

function createMockMessages(count = 3): GroupChatMessage[] {
  const messages: GroupChatMessage[] = [];
  const baseTime = new Date('2023-12-21T10:00:00.000Z').getTime();

  for (let i = 0; i < count; i++) {
    const isUser = i % 3 === 0;
    const fromOptions = isUser ? 'user' : i % 3 === 1 ? 'Agent1' : 'Agent2';
    messages.push({
      timestamp: new Date(baseTime + i * 60000).toISOString(),
      from: fromOptions,
      content: `Message ${i + 1} content`,
    });
  }

  return messages;
}

function createMockHistory(): GroupChatHistoryEntry[] {
  return [
    {
      id: 'history-1',
      timestamp: 1703120400000,
      summary: 'Delegated task to Agent1',
      participantName: 'moderator',
      participantColor: '#f59e0b',
      type: 'delegation',
    },
    {
      id: 'history-2',
      timestamp: 1703120500000,
      summary: 'Agent1 completed analysis',
      participantName: 'Agent1',
      participantColor: '#3b82f6',
      type: 'response',
      elapsedTimeMs: 5000,
      tokenCount: 150,
    },
  ];
}

describe('groupChatExport', () => {
  describe('generateGroupChatExportHtml', () => {
    describe('basic HTML structure', () => {
      it('generates valid HTML document', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();
        const history = createMockHistory();

        const html = generateGroupChatExportHtml(groupChat, messages, history, {});

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html lang="en">');
        expect(html).toContain('</html>');
        expect(html).toContain('<head>');
        expect(html).toContain('</head>');
        expect(html).toContain('<body>');
        expect(html).toContain('</body>');
      });

      it('includes group chat name in title', () => {
        const groupChat = createMockGroupChat({ name: 'My Custom Chat' });
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('<title>My Custom Chat - Group Chat Export</title>');
      });

      it('includes group chat name in header', () => {
        const groupChat = createMockGroupChat({ name: 'Test Chat Name' });
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('Test Chat Name');
      });

      it('includes embedded CSS styles', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('<style>');
        expect(html).toContain('</style>');
        expect(html).toContain('--bg-primary');
        expect(html).toContain('--text-primary');
      });
    });

    describe('embedded JSON', () => {
      it('includes JSON script tag with correct id', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('<script type="application/json" id="group-chat-export">');
        expect(html).toContain('</script>');
      });

      it('embeds valid JSON that can be parsed', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();
        const history = createMockHistory();
        const images = { 'test.png': 'data:image/png;base64,abc123' };

        const html = generateGroupChatExportHtml(groupChat, messages, history, images);

        // Extract JSON from HTML
        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        expect(jsonMatch).not.toBeNull();

        const jsonString = jsonMatch![1];
        const parsed = JSON.parse(jsonString) as GroupChatExportData;

        expect(parsed).toHaveProperty('exportedAt');
        expect(parsed).toHaveProperty('version');
        expect(parsed).toHaveProperty('metadata');
        expect(parsed).toHaveProperty('messages');
        expect(parsed).toHaveProperty('history');
        expect(parsed).toHaveProperty('images');
        expect(parsed).toHaveProperty('stats');
      });

      it('includes correct version in JSON', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(parsed.version).toBe('1.0');
      });

      it('includes exportedAt timestamp in JSON', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });

      it('includes all messages in JSON', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages(5);

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(parsed.messages).toHaveLength(5);
      });

      it('includes history entries in JSON', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();
        const history = createMockHistory();

        const html = generateGroupChatExportHtml(groupChat, messages, history, {});

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(parsed.history).toHaveLength(2);
        expect(parsed.history[0].type).toBe('delegation');
      });

      it('includes images in JSON', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();
        const images = {
          'screenshot.png': 'data:image/png;base64,abc123',
          'photo.jpg': 'data:image/jpeg;base64,xyz789',
        };

        const html = generateGroupChatExportHtml(groupChat, messages, [], images);

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(Object.keys(parsed.images)).toHaveLength(2);
        expect(parsed.images['screenshot.png']).toBe('data:image/png;base64,abc123');
      });
    });

    describe('statistics', () => {
      it('calculates correct participant count', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(parsed.stats.participantCount).toBe(2);
      });

      it('calculates correct total message count', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages(10);

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(parsed.stats.totalMessages).toBe(10);
      });

      it('distinguishes user messages from agent messages', () => {
        const groupChat = createMockGroupChat();
        // Create specific messages: 3 user, 4 agent
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'user', content: 'User 1' },
          { timestamp: '2023-12-21T10:01:00Z', from: 'Agent1', content: 'Agent 1' },
          { timestamp: '2023-12-21T10:02:00Z', from: 'user', content: 'User 2' },
          { timestamp: '2023-12-21T10:03:00Z', from: 'Agent2', content: 'Agent 2' },
          { timestamp: '2023-12-21T10:04:00Z', from: 'Agent1', content: 'Agent 3' },
          { timestamp: '2023-12-21T10:05:00Z', from: 'user', content: 'User 3' },
          { timestamp: '2023-12-21T10:06:00Z', from: 'Agent2', content: 'Agent 4' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(parsed.stats.userMessages).toBe(3);
        expect(parsed.stats.agentMessages).toBe(4);
      });

      it('displays stats in HTML', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages(5);

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        // Check for stats cards
        expect(html).toContain('Agents');
        expect(html).toContain('Messages');
        expect(html).toContain('Agent Replies');
        expect(html).toContain('Duration');
      });
    });

    describe('message rendering', () => {
      it('renders user messages with user class', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'user', content: 'Hello' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('message-user');
      });

      it('renders agent messages with agent class', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'Agent1', content: 'Response' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('message-agent');
      });

      it('shows read-only badge for read-only messages', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'user', content: 'Query', readOnly: true },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('read-only');
      });

      it('includes message timestamps', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:30:00Z', from: 'user', content: 'Test' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('message-time');
      });

      it('uses participant colors from groupChat', () => {
        const groupChat = createMockGroupChat({
          participants: [
            { name: 'ColoredAgent', agentId: 'claude-code', sessionId: 's1', addedAt: 0, color: '#ff5500' },
          ],
        });
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'ColoredAgent', content: 'Hi' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('#ff5500');
      });
    });

    describe('content escaping and formatting', () => {
      it('escapes HTML special characters in message content', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'user', content: '<div>test</div>' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        // The message content should be escaped in the rendered HTML
        expect(html).toContain('&lt;div&gt;test&lt;/div&gt;');
      });

      it('escapes HTML in group chat name in title', () => {
        const groupChat = createMockGroupChat({ name: '<b>Bold Name</b>' });
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        // The title should have escaped HTML
        expect(html).toContain('<title>&lt;b&gt;Bold Name&lt;/b&gt; - Group Chat Export</title>');
        // But the JSON will contain the raw name (which is correct for data export)
      });

      it('converts inline code to HTML code tags', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'Agent1', content: 'Use `npm install` to install' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('inline-code');
        expect(html).toContain('npm install');
      });

      it('converts code blocks to pre tags', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          {
            timestamp: '2023-12-21T10:00:00Z',
            from: 'Agent1',
            content: '```javascript\nconst x = 1;\n```',
          },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('code-block');
        expect(html).toContain('const x = 1;');
      });

      it('converts bold markdown to strong tags', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'Agent1', content: 'This is **important**' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('<strong>important</strong>');
      });

      it('converts newlines to br tags', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'Agent1', content: 'Line 1\nLine 2' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('<br>');
      });
    });

    describe('participants section', () => {
      it('renders participants section when participants exist', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('Participants');
        expect(html).toContain('Agent1');
        expect(html).toContain('Agent2');
      });

      it('omits participants section when no participants', () => {
        const groupChat = createMockGroupChat({ participants: [] });
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        // Should not have a participants section header (the word may appear elsewhere)
        expect(html).not.toContain('class="section-title">Participants');
      });

      it('shows participant colors', () => {
        const groupChat = createMockGroupChat({
          participants: [
            { name: 'TestAgent', agentId: 'claude-code', sessionId: 's1', addedAt: 0, color: '#e91e63' },
          ],
        });
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('#e91e63');
      });

      it('shows participant agent IDs', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('claude-code');
      });
    });

    describe('metadata section', () => {
      it('includes group chat ID', () => {
        const groupChat = createMockGroupChat({ id: 'unique-chat-id-123' });
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('unique-chat-id-123');
      });

      it('includes moderator agent ID', () => {
        const groupChat = createMockGroupChat({ moderatorAgentId: 'custom-moderator' });
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('custom-moderator');
      });

      it('includes creation date', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('Created');
      });
    });

    describe('footer', () => {
      it('includes Maestro attribution', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('Maestro');
        expect(html).toContain('https://maestro.sh');
      });

      it('includes JSON extraction tip', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('Tip');
        expect(html).toContain('embedded JSON');
      });
    });

    describe('edge cases', () => {
      it('handles empty messages array', () => {
        const groupChat = createMockGroupChat();

        const html = generateGroupChatExportHtml(groupChat, [], [], {});

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<script type="application/json" id="group-chat-export">');
      });

      it('handles empty history array', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(parsed.history).toEqual([]);
      });

      it('handles empty images object', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        const jsonMatch = html.match(
          /<script type="application\/json" id="group-chat-export">\s*([\s\S]*?)\s*<\/script>/
        );
        const parsed = JSON.parse(jsonMatch![1]) as GroupChatExportData;

        expect(parsed.images).toEqual({});
      });

      it('handles special characters in participant names', () => {
        const groupChat = createMockGroupChat({
          participants: [
            { name: 'Agent <Test>', agentId: 'claude-code', sessionId: 's1', addedAt: 0 },
          ],
        });
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('Agent &lt;Test&gt;');
      });

      it('handles unicode in messages', () => {
        const groupChat = createMockGroupChat();
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'user', content: 'Hello! Caf\u00e9' },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('Caf\u00e9');
      });

      it('handles very long messages', () => {
        const groupChat = createMockGroupChat();
        const longContent = 'A'.repeat(10000);
        const messages: GroupChatMessage[] = [
          { timestamp: '2023-12-21T10:00:00Z', from: 'Agent1', content: longContent },
        ];

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain(longContent);
      });
    });

    describe('CSS responsiveness', () => {
      it('includes mobile media query', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('@media (max-width: 640px)');
      });

      it('includes print media query', () => {
        const groupChat = createMockGroupChat();
        const messages = createMockMessages();

        const html = generateGroupChatExportHtml(groupChat, messages, [], {});

        expect(html).toContain('@media print');
      });
    });
  });
});

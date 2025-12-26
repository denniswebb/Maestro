import { describe, it, expect } from 'vitest';
import { tabAutoRenamePrompt } from '../../../prompts';
import type { LogEntry } from '../../../renderer/types';

describe('Auto Rename Prompt Construction', () => {
  it('should contain the core prompt template', () => {
    expect(tabAutoRenamePrompt).toContain('Analyze the conversation history');
    expect(tabAutoRenamePrompt).toContain('generate a concise tab name');
    expect(tabAutoRenamePrompt).toContain('max 5 words, 40 characters');
    expect(tabAutoRenamePrompt).toContain('{{conversation_history}}');
  });

  it('should contain naming rules', () => {
    expect(tabAutoRenamePrompt).toContain('Focus on the main topic');
    expect(tabAutoRenamePrompt).toContain('Use title case');
    expect(tabAutoRenamePrompt).toContain('Omit common prefixes');
    expect(tabAutoRenamePrompt).toContain('Return ONLY the tab name');
  });

  it('should replace conversation_history placeholder correctly', () => {
    const conversationHistory = 'User: How do I fix authentication?\nAssistant: You should check the JWT token validation.';
    const prompt = tabAutoRenamePrompt.replace('{{conversation_history}}', conversationHistory);

    expect(prompt).not.toContain('{{conversation_history}}');
    expect(prompt).toContain('User: How do I fix authentication?');
    expect(prompt).toContain('Assistant: You should check the JWT token validation.');
  });

  it('should handle conversation history formatting from log entries', () => {
    // Simulate the actual conversation history formatting logic from App.tsx
    const mockLogs: Pick<LogEntry, 'source' | 'text'>[] = [
      { source: 'user', text: 'How do I implement OAuth2.0?' },
      { source: 'ai', text: 'You can use the passport.js library for OAuth2.0 integration.' },
      { source: 'user', text: 'What about JWT tokens?' },
      { source: 'ai', text: 'JWT tokens are great for stateless authentication.' },
    ];

    // Format conversation as done in App.tsx (lines 8778-8782)
    const conversationText = mockLogs.map(log => {
      const role = log.source === 'user' ? 'User' : 'Assistant';
      const text = log.text.substring(0, 200); // Truncate to 200 chars
      return `${role}: ${text}`;
    }).join('\n');

    const prompt = tabAutoRenamePrompt.replace('{{conversation_history}}', conversationText);

    expect(prompt).toContain('User: How do I implement OAuth2.0?');
    expect(prompt).toContain('Assistant: You can use the passport.js library');
    expect(prompt).toContain('User: What about JWT tokens?');
    expect(prompt).toContain('Assistant: JWT tokens are great for stateless authentication.');
  });

  it('should handle long messages with truncation', () => {
    const longMessage = 'A'.repeat(300); // 300 characters
    const mockLogs: Pick<LogEntry, 'source' | 'text'>[] = [
      { source: 'user', text: longMessage },
      { source: 'ai', text: 'Short response' },
    ];

    // Truncate as in App.tsx (line 8780)
    const conversationText = mockLogs.map(log => {
      const role = log.source === 'user' ? 'User' : 'Assistant';
      const text = log.text.substring(0, 200);
      return `${role}: ${text}`;
    }).join('\n');

    const prompt = tabAutoRenamePrompt.replace('{{conversation_history}}', conversationText);

    // Should only contain 200 'A's in the user message
    const userLine = conversationText.split('\n')[0];
    expect(userLine).toBe(`User: ${'A'.repeat(200)}`);
    expect(userLine.length).toBe(206); // "User: " (6) + 200 'A's
  });

  it('should handle empty conversation history', () => {
    const prompt = tabAutoRenamePrompt.replace('{{conversation_history}}', '');

    expect(prompt).not.toContain('{{conversation_history}}');
    expect(prompt).toContain('Analyze the conversation history below');
    expect(prompt).toContain('Tab name:');
  });

  it('should maintain proper prompt structure after replacement', () => {
    const conversationHistory = 'User: Test\nAssistant: Response';
    const prompt = tabAutoRenamePrompt.replace('{{conversation_history}}', conversationHistory);

    // Verify the prompt structure is intact
    const sections = [
      '# Tab Auto Rename Prompt',
      'Analyze the conversation history',
      '## Rules',
      'Focus on the main topic',
      '## Conversation History',
      'User: Test',
      'Assistant: Response',
      '## Task',
      'Generate a tab name',
      'Tab name:',
    ];

    sections.forEach(section => {
      expect(prompt).toContain(section);
    });
  });

  it('should produce a prompt suitable for AI consumption', () => {
    const mockLogs: Pick<LogEntry, 'source' | 'text'>[] = [
      { source: 'user', text: 'I need help debugging the authentication flow' },
      { source: 'ai', text: 'Let me analyze the auth middleware. What specific error are you seeing?' },
      { source: 'user', text: 'Users are getting logged out randomly' },
      { source: 'ai', text: 'This sounds like a token expiration issue. Let me check your JWT configuration.' },
    ];

    const conversationText = mockLogs.map(log => {
      const role = log.source === 'user' ? 'User' : 'Assistant';
      const text = log.text.substring(0, 200);
      return `${role}: ${text}`;
    }).join('\n');

    const prompt = tabAutoRenamePrompt.replace('{{conversation_history}}', conversationText);

    // Verify the prompt is well-formed
    expect(prompt.split('\n').length).toBeGreaterThan(10); // Has multiple lines
    expect(prompt).toContain('User:'); // Contains user messages
    expect(prompt).toContain('Assistant:'); // Contains AI messages
    expect(prompt).toContain('Tab name:'); // Ends with expected output prompt
  });

  it('should handle special characters in conversation', () => {
    const mockLogs: Pick<LogEntry, 'source' | 'text'>[] = [
      { source: 'user', text: 'How do I escape $special & <characters>?' },
      { source: 'ai', text: 'Use proper encoding: &amp; &lt; &gt;' },
    ];

    const conversationText = mockLogs.map(log => {
      const role = log.source === 'user' ? 'User' : 'Assistant';
      const text = log.text.substring(0, 200);
      return `${role}: ${text}`;
    }).join('\n');

    const prompt = tabAutoRenamePrompt.replace('{{conversation_history}}', conversationText);

    // Special characters should be preserved
    expect(prompt).toContain('$special & <characters>');
    expect(prompt).toContain('&amp; &lt; &gt;');
  });

  it('should work with maximum conversation history (10 messages, 20 log entries)', () => {
    // Create 20 log entries (10 user + 10 AI pairs)
    const mockLogs: Pick<LogEntry, 'source' | 'text'>[] = [];
    for (let i = 0; i < 10; i++) {
      mockLogs.push(
        { source: 'user', text: `User message ${i + 1}` },
        { source: 'ai', text: `AI response ${i + 1}` }
      );
    }

    const conversationText = mockLogs.map(log => {
      const role = log.source === 'user' ? 'User' : 'Assistant';
      const text = log.text.substring(0, 200);
      return `${role}: ${text}`;
    }).join('\n');

    const prompt = tabAutoRenamePrompt.replace('{{conversation_history}}', conversationText);

    // Should contain all 20 messages
    expect(prompt).toContain('User message 1');
    expect(prompt).toContain('AI response 1');
    expect(prompt).toContain('User message 10');
    expect(prompt).toContain('AI response 10');

    // Count the lines (should have 20 conversation lines plus prompt structure)
    const lines = prompt.split('\n');
    const conversationLines = lines.filter(line => line.startsWith('User:') || line.startsWith('Assistant:'));
    expect(conversationLines.length).toBe(20);
  });
});

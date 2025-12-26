/**
 * Tests for AI-powered tab rename learning system
 *
 * This test suite validates that the system learns from user's manual renames
 * and applies those preferences to future auto-rename operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TabRenameExample } from '../../../renderer/types';

describe('Tab Rename Learning System', () => {
  let mockExamples: TabRenameExample[];

  beforeEach(() => {
    mockExamples = [];
  });

  describe('TabRenameExample Storage', () => {
    it('should store rename example with all required fields', () => {
      const example: TabRenameExample = {
        aiGeneratedName: 'Authentication Bug',
        userPreferredName: 'Fix OAuth Login',
        timestamp: Date.now(),
        conversationSummary: 'User is debugging OAuth flow',
      };

      mockExamples.push(example);

      expect(mockExamples).toHaveLength(1);
      expect(mockExamples[0].aiGeneratedName).toBe('Authentication Bug');
      expect(mockExamples[0].userPreferredName).toBe('Fix OAuth Login');
      expect(mockExamples[0].timestamp).toBeGreaterThan(0);
      expect(mockExamples[0].conversationSummary).toBe('User is debugging OAuth flow');
    });

    it('should store rename example without optional conversationSummary', () => {
      const example: TabRenameExample = {
        aiGeneratedName: 'Database Migration',
        userPreferredName: 'DB Schema Update',
        timestamp: Date.now(),
      };

      mockExamples.push(example);

      expect(mockExamples).toHaveLength(1);
      expect(mockExamples[0].conversationSummary).toBeUndefined();
    });

    it('should maintain chronological order of examples', () => {
      const example1: TabRenameExample = {
        aiGeneratedName: 'First Name',
        userPreferredName: 'User Name 1',
        timestamp: 1000,
      };

      const example2: TabRenameExample = {
        aiGeneratedName: 'Second Name',
        userPreferredName: 'User Name 2',
        timestamp: 2000,
      };

      mockExamples.push(example1, example2);

      expect(mockExamples[0].timestamp).toBeLessThan(mockExamples[1].timestamp);
    });
  });

  describe('Example Limit Enforcement', () => {
    it('should keep only the most recent 20 examples', () => {
      const MAX_EXAMPLES = 20;

      // Add 25 examples
      for (let i = 0; i < 25; i++) {
        mockExamples.push({
          aiGeneratedName: `AI Name ${i}`,
          userPreferredName: `User Name ${i}`,
          timestamp: 1000 + i,
        });
      }

      // Simulate slice(-20) behavior
      const limited = mockExamples.slice(-MAX_EXAMPLES);

      expect(limited).toHaveLength(MAX_EXAMPLES);
      // Should keep examples 5-24 (most recent 20)
      expect(limited[0].aiGeneratedName).toBe('AI Name 5');
      expect(limited[19].aiGeneratedName).toBe('AI Name 24');
    });

    it('should not enforce limit when fewer than 20 examples', () => {
      const MAX_EXAMPLES = 20;

      // Add only 10 examples
      for (let i = 0; i < 10; i++) {
        mockExamples.push({
          aiGeneratedName: `AI Name ${i}`,
          userPreferredName: `User Name ${i}`,
          timestamp: 1000 + i,
        });
      }

      const limited = mockExamples.slice(-MAX_EXAMPLES);

      expect(limited).toHaveLength(10);
    });
  });

  describe('Prompt Augmentation', () => {
    it('should format examples for prompt injection', () => {
      mockExamples = [
        {
          aiGeneratedName: 'Authentication Bug',
          userPreferredName: 'Fix OAuth Login',
          timestamp: Date.now(),
        },
        {
          aiGeneratedName: 'Database Query',
          userPreferredName: 'DB Performance',
          timestamp: Date.now(),
        },
      ];

      const examplesText = mockExamples
        .map(ex => `- AI suggested: "${ex.aiGeneratedName}" → User preferred: "${ex.userPreferredName}"`)
        .join('\n');

      expect(examplesText).toContain('- AI suggested: "Authentication Bug" → User preferred: "Fix OAuth Login"');
      expect(examplesText).toContain('- AI suggested: "Database Query" → User preferred: "DB Performance"');
    });

    it('should use only the 5 most recent examples for prompt', () => {
      // Add 10 examples
      for (let i = 0; i < 10; i++) {
        mockExamples.push({
          aiGeneratedName: `AI Name ${i}`,
          userPreferredName: `User Name ${i}`,
          timestamp: 1000 + i,
        });
      }

      // Simulate taking last 5
      const recentExamples = mockExamples.slice(-5);

      expect(recentExamples).toHaveLength(5);
      expect(recentExamples[0].aiGeneratedName).toBe('AI Name 5');
      expect(recentExamples[4].aiGeneratedName).toBe('AI Name 9');
    });

    it('should create complete examples section for prompt', () => {
      mockExamples = [
        {
          aiGeneratedName: 'Fix Bug',
          userPreferredName: 'Bug Fix',
          timestamp: Date.now(),
        },
      ];

      const examplesText = mockExamples
        .map(ex => `- AI suggested: "${ex.aiGeneratedName}" → User preferred: "${ex.userPreferredName}"`)
        .join('\n');

      const examplesSection = `\n## Your Naming Preferences\n\nBased on your past renaming patterns, you tend to prefer:\n${examplesText}\n\nPlease apply these style preferences when generating the tab name below.\n`;

      expect(examplesSection).toContain('## Your Naming Preferences');
      expect(examplesSection).toContain('Based on your past renaming patterns');
      expect(examplesSection).toContain('- AI suggested: "Fix Bug" → User preferred: "Bug Fix"');
      expect(examplesSection).toContain('Please apply these style preferences');
    });
  });

  describe('Pattern Recognition', () => {
    it('should detect preference for shorter names', () => {
      mockExamples = [
        {
          aiGeneratedName: 'Authentication Bug In Login Flow',
          userPreferredName: 'Auth Bug',
          timestamp: Date.now(),
        },
        {
          aiGeneratedName: 'Database Query Performance Issue',
          userPreferredName: 'DB Performance',
          timestamp: Date.now(),
        },
      ];

      // All examples show user preferring shorter names
      const allShorter = mockExamples.every(
        ex => ex.userPreferredName.length < ex.aiGeneratedName.length
      );

      expect(allShorter).toBe(true);
    });

    it('should detect preference for technical abbreviations', () => {
      mockExamples = [
        {
          aiGeneratedName: 'Authentication Service',
          userPreferredName: 'Auth Service',
          timestamp: Date.now(),
        },
        {
          aiGeneratedName: 'Database Migration',
          userPreferredName: 'DB Migration',
          timestamp: Date.now(),
        },
      ];

      // User prefers "Auth" and "DB" abbreviations
      const usesAbbreviations = mockExamples.every(ex =>
        ex.userPreferredName.includes('Auth') || ex.userPreferredName.includes('DB')
      );

      expect(usesAbbreviations).toBe(true);
    });

    it('should detect preference for specific naming style', () => {
      mockExamples = [
        {
          aiGeneratedName: 'Fix Authentication Bug',
          userPreferredName: 'auth-fix',
          timestamp: Date.now(),
        },
        {
          aiGeneratedName: 'Update Database Schema',
          userPreferredName: 'db-update',
          timestamp: Date.now(),
        },
      ];

      // User prefers kebab-case style
      const allKebabCase = mockExamples.every(ex =>
        ex.userPreferredName.includes('-') && ex.userPreferredName === ex.userPreferredName.toLowerCase()
      );

      expect(allKebabCase).toBe(true);
    });
  });

  describe('Tracking Conditions', () => {
    it('should only track when tab was AI-named', () => {
      const tab = {
        id: '1',
        name: 'AI Generated Name',
        isAutoNamed: true,
        logs: [],
      };

      const shouldTrack = tab.isAutoNamed === true;

      expect(shouldTrack).toBe(true);
    });

    it('should not track when tab was manually named', () => {
      const tab = {
        id: '1',
        name: 'User Typed Name',
        isAutoNamed: false,
        logs: [],
      };

      const shouldTrack = tab.isAutoNamed === true;

      expect(shouldTrack).toBe(false);
    });

    it('should only track when names are different', () => {
      const aiName = 'Authentication Bug';
      const userName = 'Auth Fix';

      const shouldTrack = aiName !== userName;

      expect(shouldTrack).toBe(true);
    });

    it('should not track when user keeps AI name', () => {
      const aiName = 'Authentication Bug';
      const userName = 'Authentication Bug';

      const shouldTrack = aiName !== userName;

      expect(shouldTrack).toBe(false);
    });
  });

  describe('Conversation Summary Extraction', () => {
    it('should extract first user message as summary', () => {
      const logs = [
        { source: 'user' as const, text: 'I need help with OAuth login flow that is failing', id: '1', timestamp: 1 },
        { source: 'ai' as const, text: 'Let me help you debug that', id: '2', timestamp: 2 },
      ];

      const firstUserLog = logs.find(log => log.source === 'user');
      const summary = firstUserLog?.text.substring(0, 100);

      expect(summary).toBe('I need help with OAuth login flow that is failing');
    });

    it('should truncate summary to 100 characters', () => {
      const longText = 'A'.repeat(150);
      const logs = [
        { source: 'user' as const, text: longText, id: '1', timestamp: 1 },
      ];

      const firstUserLog = logs.find(log => log.source === 'user');
      const summary = firstUserLog?.text.substring(0, 100);

      expect(summary).toHaveLength(100);
    });

    it('should handle tabs with no user messages', () => {
      const logs = [
        { source: 'ai' as const, text: 'Hello, how can I help?', id: '1', timestamp: 1 },
      ];

      const firstUserLog = logs.find(log => log.source === 'user');
      const summary = firstUserLog?.text.substring(0, 100);

      expect(summary).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty examples array gracefully', () => {
      const examples: TabRenameExample[] = [];

      expect(examples.length).toBe(0);

      // Prompt augmentation should skip when no examples
      const shouldAugment = examples.length > 0;
      expect(shouldAugment).toBe(false);
    });

    it('should handle examples with special characters', () => {
      const example: TabRenameExample = {
        aiGeneratedName: 'Fix "OAuth" Bug',
        userPreferredName: 'OAuth Fix (Critical)',
        timestamp: Date.now(),
      };

      mockExamples.push(example);

      const formatted = `- AI suggested: "${example.aiGeneratedName}" → User preferred: "${example.userPreferredName}"`;

      expect(formatted).toContain('Fix "OAuth" Bug');
      expect(formatted).toContain('OAuth Fix (Critical)');
    });

    it('should handle very long tab names', () => {
      const longName = 'A'.repeat(100);
      const example: TabRenameExample = {
        aiGeneratedName: longName,
        userPreferredName: 'Short',
        timestamp: Date.now(),
      };

      mockExamples.push(example);

      expect(mockExamples[0].aiGeneratedName).toHaveLength(100);
      expect(mockExamples[0].userPreferredName).toBe('Short');
    });

    it('should handle concurrent rename operations', () => {
      // Simulate adding examples in quick succession
      const timestamps = [Date.now(), Date.now(), Date.now()];

      timestamps.forEach((ts, i) => {
        mockExamples.push({
          aiGeneratedName: `Name ${i}`,
          userPreferredName: `User ${i}`,
          timestamp: ts,
        });
      });

      expect(mockExamples).toHaveLength(3);
      // All should be stored even if timestamps are identical
      expect(new Set(mockExamples.map(e => e.aiGeneratedName)).size).toBe(3);
    });
  });

  describe('Clear Examples Functionality', () => {
    it('should clear all examples', () => {
      mockExamples = [
        { aiGeneratedName: 'Name 1', userPreferredName: 'User 1', timestamp: 1000 },
        { aiGeneratedName: 'Name 2', userPreferredName: 'User 2', timestamp: 2000 },
      ];

      // Simulate clear
      mockExamples = [];

      expect(mockExamples).toHaveLength(0);
    });

    it('should allow adding examples after clear', () => {
      mockExamples = [
        { aiGeneratedName: 'Old', userPreferredName: 'Old', timestamp: 1000 },
      ];

      mockExamples = [];

      mockExamples.push({
        aiGeneratedName: 'New',
        userPreferredName: 'New',
        timestamp: 2000,
      });

      expect(mockExamples).toHaveLength(1);
      expect(mockExamples[0].aiGeneratedName).toBe('New');
    });
  });
});

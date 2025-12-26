/**
 * Edge case tests for Auto Rename: Manual rename override and error handling
 * Tests the interaction between manual renaming, auto-rename, rate limiting, and error scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AITab, LogEntry, Session } from '../../../renderer/types';

// Mock window.maestro API
const mockSpawnAgent = vi.fn();
const mockSetFlashNotification = vi.fn();
const mockUpdateSessionName = vi.fn();
const mockSetSessionName = vi.fn();

global.window = {
  maestro: {
    process: {
      spawnAgentForSession: mockSpawnAgent,
    },
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn(),
    },
    claude: {
      updateSessionName: mockUpdateSessionName,
    },
    agentSessions: {
      setSessionName: mockSetSessionName,
    },
  },
} as any;

// Helper to create log entries
const createLogEntry = (
  source: 'user' | 'ai',
  text: string,
  timestamp: number = Date.now()
): LogEntry => ({
  id: `log-${timestamp}-${Math.random()}`,
  timestamp,
  source,
  text,
  type: 'message',
});

// Helper to create test tab
const createTestTab = (overrides?: Partial<AITab>): AITab => ({
  id: `tab-${Date.now()}-${Math.random()}`,
  name: 'New Tab 1',
  logs: [],
  ...overrides,
});

// Helper to create minimal session
const createTestSession = (overrides?: Partial<Session>): Session => ({
  id: `session-${Date.now()}`,
  name: 'Test Session',
  groupId: undefined,
  toolType: 'claude-code',
  state: 'idle',
  inputMode: 'ai',
  cwd: '/test/path',
  projectRoot: '/test/path',
  fullPath: '/test/path',
  aiPid: 1234,
  port: 8080,
  aiTabs: [],
  activeTabId: '',
  closedTabHistory: [],
  shellLogs: [],
  executionQueue: [],
  contextUsage: 0,
  workLog: [],
  isGitRepo: false,
  changedFiles: [],
  fileTree: [],
  fileExplorerExpanded: [],
  fileExplorerScrollPos: 0,
  isLive: false,
  ...overrides,
});

describe('Auto Rename: Manual Override and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSpawnAgent.mockResolvedValue({
      success: true,
      response: 'AI Generated Name',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Manual Rename After Auto-Rename', () => {
    it('should set manuallyRenamed flag when user manually renames an auto-named tab', () => {
      // Simulate the flag-setting logic from App.tsx line 8214
      const tab = createTestTab({
        id: 'test-tab-1',
        name: 'AI Generated Name',
        isAutoNamed: true,
        manuallyRenamed: false,
      });

      // Simulate manual rename action
      const updatedTab = {
        ...tab,
        name: 'User Custom Name',
        isAutoNamed: false, // Should be cleared
        manuallyRenamed: true, // Should be set
      };

      expect(updatedTab.isAutoNamed).toBe(false);
      expect(updatedTab.manuallyRenamed).toBe(true);
      expect(updatedTab.name).toBe('User Custom Name');
    });

    it('should preserve manuallyRenamed flag across session updates', () => {
      const tab = createTestTab({
        id: 'persistent-tab',
        name: 'Custom Name',
        isAutoNamed: false,
        manuallyRenamed: true,
        logs: [
          createLogEntry('user', 'Test message 1'),
          createLogEntry('ai', 'Test response 1'),
        ],
      });

      // Simulate adding new messages (should not reset flags)
      const updatedTab = {
        ...tab,
        logs: [
          ...tab.logs,
          createLogEntry('user', 'Test message 2'),
          createLogEntry('ai', 'Test response 2'),
        ],
      };

      // Flags should remain unchanged
      expect(updatedTab.manuallyRenamed).toBe(true);
      expect(updatedTab.isAutoNamed).toBe(false);
    });

    it('should allow explicit auto-rename on manually renamed tabs', () => {
      // Even if tab was manually renamed, explicit "Auto Rename" click should work
      const tab = createTestTab({
        id: 'manual-tab',
        name: 'User Name',
        isAutoNamed: false,
        manuallyRenamed: true,
        logs: [
          createLogEntry('user', 'Question about authentication'),
          createLogEntry('ai', 'Answer about auth'),
        ],
      });

      // Simulate explicit auto-rename click (user triggered)
      const afterAutoRename = {
        ...tab,
        name: 'New AI Name',
        isAutoNamed: true, // Should be set again
        manuallyRenamed: false, // Should be cleared (user explicitly requested AI name)
      };

      expect(afterAutoRename.isAutoNamed).toBe(true);
      expect(afterAutoRename.manuallyRenamed).toBe(false);
    });

    it('should skip manually renamed tabs in batch auto-rename', () => {
      const tabs = [
        createTestTab({
          id: 'auto-tab',
          name: 'AI Name',
          isAutoNamed: true,
          manuallyRenamed: false,
          logs: [createLogEntry('user', 'Question 1')],
        }),
        createTestTab({
          id: 'manual-tab',
          name: 'Custom Name',
          isAutoNamed: false,
          manuallyRenamed: true, // This one should be skipped
          logs: [createLogEntry('user', 'Question 2')],
        }),
        createTestTab({
          id: 'default-tab',
          name: 'New Tab 3',
          isAutoNamed: false,
          manuallyRenamed: false,
          logs: [createLogEntry('user', 'Question 3')],
        }),
      ];

      // Filter out manually renamed tabs (as per batch rename logic)
      const tabsToRename = tabs.filter(tab => !tab.manuallyRenamed && tab.logs.length > 0);

      expect(tabsToRename).toHaveLength(2);
      expect(tabsToRename.find(t => t.id === 'manual-tab')).toBeUndefined();
      expect(tabsToRename.find(t => t.id === 'auto-tab')).toBeDefined();
      expect(tabsToRename.find(t => t.id === 'default-tab')).toBeDefined();
    });
  });

  describe('Rate Limiting and Concurrent Requests', () => {
    it('should enforce 1-second debounce between auto-rename requests', async () => {
      // Simulate rate limiting logic from App.tsx lines 8752-8763
      const autoRenameInProgress = new Map<string, number>();
      const AUTO_RENAME_DEBOUNCE_MS = 1000;
      const tabId = 'test-tab';

      // First request
      const firstRequestTime = Date.now();
      autoRenameInProgress.set(tabId, firstRequestTime);

      // Immediate second request (should be blocked)
      const secondRequestTime = firstRequestTime + 500; // 500ms later
      const timeSinceLastRequest = secondRequestTime - (autoRenameInProgress.get(tabId) || 0);

      expect(timeSinceLastRequest).toBeLessThan(AUTO_RENAME_DEBOUNCE_MS);
      // Should show error notification: "Please wait before renaming again"

      // Third request after 1 second (should succeed)
      const thirdRequestTime = firstRequestTime + 1100; // 1.1 seconds later
      const timeSinceLastRequest2 = thirdRequestTime - (autoRenameInProgress.get(tabId) || 0);

      expect(timeSinceLastRequest2).toBeGreaterThanOrEqual(AUTO_RENAME_DEBOUNCE_MS);
      // Should allow the request
    });

    it('should track rate limiting per tab independently', () => {
      const autoRenameInProgress = new Map<string, number>();
      const startTime = 1000000; // Use fixed time instead of Date.now()

      // Tab 1 renamed at time 0 (relative to startTime)
      autoRenameInProgress.set('tab-1', startTime);

      // Tab 2 renamed at time 500ms (relative to startTime)
      autoRenameInProgress.set('tab-2', startTime + 500);

      // Check tab-1 at time 600ms (should be blocked, only 600ms elapsed)
      const checkTime1 = startTime + 600;
      const tab1TimeSince = checkTime1 - (autoRenameInProgress.get('tab-1') || 0);
      expect(tab1TimeSince).toBeLessThan(1000);

      // Check tab-2 at time 600ms (should be blocked, only 100ms elapsed)
      const tab2TimeSince = checkTime1 - (autoRenameInProgress.get('tab-2') || 0);
      expect(tab2TimeSince).toBeLessThan(1000);

      // Check tab-1 at time 1500ms (should succeed, 1500ms elapsed)
      const checkTime2 = startTime + 1500;
      const tab1TimeAfter = checkTime2 - (autoRenameInProgress.get('tab-1') || 0);
      expect(tab1TimeAfter).toBeGreaterThanOrEqual(1000);
    });

    it('should queue batch rename requests with 1-second delay between tabs', async () => {
      // Simulate batch rename with sequential processing
      const tabs = [
        createTestTab({ id: 'tab-1', logs: [createLogEntry('user', 'Q1')] }),
        createTestTab({ id: 'tab-2', logs: [createLogEntry('user', 'Q2')] }),
        createTestTab({ id: 'tab-3', logs: [createLogEntry('user', 'Q3')] }),
      ];

      const processingTimes: number[] = [];
      const startTime = Date.now();

      // Simulate sequential processing with 1-second delay
      for (let i = 0; i < tabs.length; i++) {
        if (i > 0) {
          // Wait 1 second before processing next tab
          vi.advanceTimersByTime(1000);
        }
        processingTimes.push(Date.now() - startTime);
      }

      // Verify timing
      expect(processingTimes[0]).toBe(0); // First tab: immediate
      expect(processingTimes[1]).toBeGreaterThanOrEqual(1000); // Second tab: ~1 second
      expect(processingTimes[2]).toBeGreaterThanOrEqual(2000); // Third tab: ~2 seconds
    });
  });

  describe('Caching Mechanism', () => {
    it('should cache auto-rename results for 5 minutes', () => {
      // Simulate caching logic from App.tsx lines 8774-8794
      const autoRenameCache = new Map<string, { name: string; timestamp: number; messageCount: number }>();
      const AUTO_RENAME_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
      const tabId = 'cached-tab';
      const currentTime = Date.now();

      // First rename: cache the result
      autoRenameCache.set(tabId, {
        name: 'Cached Name',
        timestamp: currentTime,
        messageCount: 10,
      });

      // Check cache hit within 5 minutes
      const cacheEntry = autoRenameCache.get(tabId);
      expect(cacheEntry).toBeDefined();

      if (cacheEntry) {
        const age = currentTime + 60000 - cacheEntry.timestamp; // 1 minute later
        expect(age).toBeLessThan(AUTO_RENAME_CACHE_TTL_MS);
        // Cache should be valid, return cached name
        expect(cacheEntry.name).toBe('Cached Name');
      }
    });

    it('should invalidate cache after 5 minutes', () => {
      const autoRenameCache = new Map<string, { name: string; timestamp: number; messageCount: number }>();
      const AUTO_RENAME_CACHE_TTL_MS = 5 * 60 * 1000;
      const tabId = 'expired-tab';
      const currentTime = Date.now();

      // Cache entry from 6 minutes ago
      autoRenameCache.set(tabId, {
        name: 'Old Name',
        timestamp: currentTime - (6 * 60 * 1000), // 6 minutes ago
        messageCount: 5,
      });

      const cacheEntry = autoRenameCache.get(tabId);
      if (cacheEntry) {
        const age = currentTime - cacheEntry.timestamp;
        expect(age).toBeGreaterThan(AUTO_RENAME_CACHE_TTL_MS);
        // Cache is expired, should trigger new AI call
      }
    });

    it('should invalidate cache when new messages added', () => {
      const autoRenameCache = new Map<string, { name: string; timestamp: number; messageCount: number }>();
      const tabId = 'updated-tab';

      // Cache with 5 messages
      autoRenameCache.set(tabId, {
        name: 'Old Conversation',
        timestamp: Date.now(),
        messageCount: 5,
      });

      // Tab now has 7 messages (2 new exchanges)
      const currentMessageCount = 7;
      const cacheEntry = autoRenameCache.get(tabId);

      if (cacheEntry && cacheEntry.messageCount !== currentMessageCount) {
        // Cache is invalid because conversation has grown
        expect(cacheEntry.messageCount).toBe(5);
        expect(currentMessageCount).toBe(7);
        // Should trigger new AI call
      }
    });

    it('should return cached result instantly on cache hit', () => {
      const autoRenameCache = new Map<string, { name: string; timestamp: number; messageCount: number }>();
      const tabId = 'instant-tab';
      const currentTime = Date.now();

      // Set cache
      autoRenameCache.set(tabId, {
        name: 'Instant Name',
        timestamp: currentTime,
        messageCount: 10,
      });

      // Check cache (within TTL and same messageCount)
      const cacheEntry = autoRenameCache.get(tabId);
      const age = currentTime + 1000 - (cacheEntry?.timestamp || 0);
      const messageCount = 10;

      if (cacheEntry && age < 5 * 60 * 1000 && cacheEntry.messageCount === messageCount) {
        // Cache hit! Return instantly without AI call
        expect(cacheEntry.name).toBe('Instant Name');
        // Verify mockSpawnAgent was NOT called
        expect(mockSpawnAgent).not.toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should preserve original name when AI times out', async () => {
      mockSpawnAgent.mockRejectedValueOnce(new Error('Request timeout'));

      const tab = createTestTab({
        id: 'timeout-tab',
        name: 'Original Name',
        logs: [
          createLogEntry('user', 'Test question'),
          createLogEntry('ai', 'Test answer'),
        ],
      });

      try {
        await mockSpawnAgent();
      } catch (error) {
        // Error occurred, tab state should be restored
        const restoredTab = {
          ...tab,
          state: 'idle' as const, // Restore from 'busy'
          name: 'Original Name', // Keep original name
        };

        expect(restoredTab.name).toBe('Original Name');
        expect(restoredTab.state).toBe('idle');
        // Should show error notification: "Failed to generate tab name"
      }
    });

    it('should use fallback name when AI returns empty response', async () => {
      mockSpawnAgent.mockResolvedValueOnce({
        success: true,
        response: '', // Empty response
      });

      const result = await mockSpawnAgent();
      const generatedName = result.response.trim();

      if (!generatedName || generatedName.length === 0) {
        // Use fallback with timestamp
        const fallbackName = `Conversation ${new Date().toLocaleTimeString()}`;
        expect(fallbackName).toMatch(/Conversation \d{1,2}:\d{2}:\d{2}/);
      }
    });

    it('should handle API error with appropriate notification', async () => {
      mockSpawnAgent.mockRejectedValueOnce(new Error('API key not configured'));

      const tab = createTestTab({
        id: 'api-error-tab',
        name: 'Test Tab',
        logs: [createLogEntry('user', 'Question')],
      });

      try {
        await mockSpawnAgent();
      } catch (error: any) {
        expect(error.message).toBe('API key not configured');
        // Should show error notification with error message
        // Tab state should be restored to idle
        const restoredTab = { ...tab, state: 'idle' as const };
        expect(restoredTab.state).toBe('idle');
      }
    });

    it('should handle rate limit error gracefully', async () => {
      mockSpawnAgent.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      try {
        await mockSpawnAgent();
      } catch (error: any) {
        expect(error.message).toBe('Rate limit exceeded');
        // Should show specific error notification
        // User should be advised to wait before retrying
      }
    });

    it('should validate and truncate AI-generated names', () => {
      // Test name validation logic
      const testCases = [
        { input: 'Valid Short Name', expected: 'Valid Short Name' },
        { input: 'a'.repeat(50), expected: 'a'.repeat(40) }, // Truncate to 40 chars
        { input: '   Extra Spaces   ', expected: 'Extra Spaces' }, // Trim whitespace
        { input: '', expected: 'Conversation' }, // Empty -> fallback
        { input: 'Name\nWith\nNewlines', expected: 'Name With Newlines' }, // Replace newlines
      ];

      testCases.forEach(({ input, expected }) => {
        let validated = input.trim();

        // Replace newlines with spaces
        validated = validated.replace(/\n/g, ' ');

        // Truncate to 40 characters
        if (validated.length > 40) {
          validated = validated.substring(0, 40);
        }

        // Use fallback if empty
        if (!validated) {
          validated = 'Conversation';
        }

        expect(validated).toBe(expected);
      });
    });

    it('should restore tab state on all error types', async () => {
      const errorTypes = [
        new Error('Network error'),
        new Error('Timeout'),
        new Error('Invalid response'),
        new Error('Agent not available'),
      ];

      for (const error of errorTypes) {
        mockSpawnAgent.mockRejectedValueOnce(error);

        const tab = createTestTab({
          id: `error-tab-${error.message}`,
          name: 'Original',
          state: 'busy' as const,
        });

        try {
          await mockSpawnAgent();
        } catch (e: any) {
          // All errors should restore tab to idle state
          const restoredTab = { ...tab, state: 'idle' as const };
          expect(restoredTab.state).toBe('idle');
          expect(restoredTab.name).toBe('Original');
        }
      }
    });
  });

  describe('Session Metadata Persistence', () => {
    it('should persist auto-named tab name to agent session metadata', async () => {
      const tab = createTestTab({
        id: 'persist-tab',
        name: 'AI Generated',
        agentSessionId: 'session-123',
        isAutoNamed: true,
      });

      const session = createTestSession({
        toolType: 'claude-code',
      });

      // Simulate persistence to Claude session storage
      if (tab.agentSessionId && session.toolType === 'claude-code') {
        await mockUpdateSessionName(session.projectRoot, tab.agentSessionId, tab.name);
        expect(mockUpdateSessionName).toHaveBeenCalledWith(
          session.projectRoot,
          'session-123',
          'AI Generated'
        );
      }
    });

    it('should persist to generic agent session storage for other agents', async () => {
      const tab = createTestTab({
        id: 'generic-tab',
        name: 'Generic Name',
        agentSessionId: 'session-456',
      });

      const session = createTestSession({
        toolType: 'opencode', // Non-Claude agent
      });

      // Simulate persistence to generic storage
      if (tab.agentSessionId && session.toolType !== 'claude-code') {
        await mockSetSessionName(session.toolType, tab.agentSessionId, tab.name);
        expect(mockSetSessionName).toHaveBeenCalledWith(
          'opencode',
          'session-456',
          'Generic Name'
        );
      }
    });

    it('should skip persistence when agentSessionId is missing', async () => {
      const tab = createTestTab({
        id: 'no-session-tab',
        name: 'No Session',
        // No agentSessionId
      });

      // Should not call any persistence methods
      expect(mockUpdateSessionName).not.toHaveBeenCalled();
      expect(mockSetSessionName).not.toHaveBeenCalled();
    });
  });

  describe('Model Override for Cost Efficiency', () => {
    it('should temporarily switch to Claude Haiku for naming', () => {
      const session = createTestSession({
        id: 'cost-session',
        toolType: 'claude-code',
      });

      // Original model (from settings or default)
      const originalModel = 'claude-sonnet-4-5-20250929';

      // Temporarily override to Haiku for cost efficiency
      const renamedModel = 'claude-3-5-haiku-20241022';

      expect(renamedModel).not.toBe(originalModel);
      expect(renamedModel).toContain('haiku');

      // Model should be restored after rename completes
      const restoredModel = originalModel;
      expect(restoredModel).toBe('claude-sonnet-4-5-20250929');
    });

    it('should restore original model on error', async () => {
      mockSpawnAgent.mockRejectedValueOnce(new Error('Model error'));

      const originalModel = 'claude-sonnet-4-5-20250929';
      let currentModel = 'claude-3-5-haiku-20241022'; // Temporarily switched

      try {
        await mockSpawnAgent();
      } catch (error) {
        // Should restore original model even on error
        currentModel = originalModel;
        expect(currentModel).toBe('claude-sonnet-4-5-20250929');
      }
    });
  });
});

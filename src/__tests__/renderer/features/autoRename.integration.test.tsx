/**
 * Integration tests for Manual Auto Rename feature
 * Tests the complete user workflow for AI-powered tab naming
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { TabBar } from '../../../renderer/components/TabBar';
import type { AITab, Theme } from '../../../renderer/types';

// Mock theme
const mockTheme: Theme = {
  name: 'monokai',
  colors: {
    background: '#272822',
    textMain: '#f8f8f2',
    textSecondary: '#75715e',
    accent: '#f1fa8c',
    error: '#ff5555',
    warning: '#ffb86c',
    success: '#50fa7b',
    border: '#44475a',
    panelBackground: '#1e1f29',
    inputBackground: '#44475a',
    buttonBackground: '#6272a4',
    buttonHover: '#bd93f9',
    shellText: '#f8f8f2',
  },
};

// Helper to create test tab
const createTestTab = (overrides?: Partial<AITab>): AITab => ({
  id: `tab-${Date.now()}-${Math.random()}`,
  name: 'New Tab 1',
  logs: [],
  ...overrides,
});

describe('Auto Rename Integration Tests', () => {
  let mockOnAutoRename: ReturnType<typeof vi.fn>;
  let mockOnTabSelect: ReturnType<typeof vi.fn>;
  let mockOnTabClose: ReturnType<typeof vi.fn>;
  let mockOnNewTab: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnAutoRename = vi.fn();
    mockOnTabSelect = vi.fn();
    mockOnTabClose = vi.fn();
    mockOnNewTab = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Tab Hover Menu - Auto Rename Button', () => {
    it('should show Auto Rename button when onAutoRename handler provided', async () => {
      // Tab must have agentSessionId for overlay to appear
      const tab = createTestTab({
        id: 'test-tab-1',
        name: 'Conversation Tab',
        agentSessionId: 'session-123',
      });

      const { container } = render(
        <TabBar
          tabs={[tab]}
          activeTabId={tab.id}
          theme={mockTheme}
          onTabSelect={mockOnTabSelect}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
          onAutoRename={mockOnAutoRename}
        />
      );

      // Find the tab element
      const tabElement = screen.getByText('Conversation Tab').closest('[data-tab-id]');
      expect(tabElement).toBeInTheDocument();

      if (tabElement) {
        // Hover over the tab to show menu (delay is 400ms)
        await act(async () => {
          fireEvent.mouseEnter(tabElement);
          // Advance timers to trigger the overlay
          vi.advanceTimersByTime(500);
        });

        // Look for the Auto Rename button with Sparkles icon title
        const autoRenameButton = container.querySelector('[title="AI generates tab name from conversation"]');
        expect(autoRenameButton).toBeInTheDocument();
      }
    });

    it('should call onAutoRename when Auto Rename button clicked', async () => {
      const tab = createTestTab({
        id: 'test-tab-123',
        name: 'My Tab',
        agentSessionId: 'session-456',
      });

      const { container } = render(
        <TabBar
          tabs={[tab]}
          activeTabId={tab.id}
          theme={mockTheme}
          onTabSelect={mockOnTabSelect}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
          onAutoRename={mockOnAutoRename}
        />
      );

      const tabElement = screen.getByText('My Tab').closest('[data-tab-id]');
      expect(tabElement).toBeInTheDocument();

      if (tabElement) {
        // Hover to show menu
        await act(async () => {
          fireEvent.mouseEnter(tabElement);
          // Advance timers to trigger the overlay
          vi.advanceTimersByTime(500);
        });

        // Find and click Auto Rename button
        const autoRenameButton = container.querySelector('[title="AI generates tab name from conversation"]');
        expect(autoRenameButton).toBeInTheDocument();

        if (autoRenameButton) {
          await act(async () => {
            fireEvent.click(autoRenameButton);
          });
        }

        // Verify handler was called with correct tab ID
        expect(mockOnAutoRename).toHaveBeenCalledWith('test-tab-123');
      }
    });

    it('should not show Auto Rename button when handler not provided', async () => {
      const tab = createTestTab({ id: 'test-tab-2', name: 'Test Tab' });

      const { container } = render(
        <TabBar
          tabs={[tab]}
          activeTabId={tab.id}
          theme={mockTheme}
          onTabSelect={mockOnTabSelect}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
          // No onAutoRename prop
        />
      );

      const tabElement = screen.getByText('Test Tab').closest('[data-tab-id]');

      if (tabElement) {
        await act(async () => {
          fireEvent.mouseEnter(tabElement);
        });

        await waitFor(() => {
          // Auto Rename button should not exist
          const autoRenameButton = container.querySelector('[title="AI generates tab name from conversation"]');
          expect(autoRenameButton).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Loading State During Rename', () => {
    it('should show "Renaming..." when tab state is busy', () => {
      const busyTab = createTestTab({
        id: 'busy-tab',
        name: 'Original Name',
        state: 'busy' as const,
      });

      render(
        <TabBar
          tabs={[busyTab]}
          activeTabId={busyTab.id}
          theme={mockTheme}
          onTabSelect={mockOnTabSelect}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
          onAutoRename={mockOnAutoRename}
        />
      );

      // Should show "Renaming..." instead of original name
      expect(screen.getByText('Renaming...')).toBeInTheDocument();
      expect(screen.queryByText('Original Name')).not.toBeInTheDocument();
    });

    it('should show original name when tab is idle', () => {
      const idleTab = createTestTab({
        id: 'idle-tab',
        name: 'My Tab Name',
        state: 'idle' as const,
      });

      render(
        <TabBar
          tabs={[idleTab]}
          activeTabId={idleTab.id}
          theme={mockTheme}
          onTabSelect={mockOnTabSelect}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
          onAutoRename={mockOnAutoRename}
        />
      );

      expect(screen.getByText('My Tab Name')).toBeInTheDocument();
      expect(screen.queryByText('Renaming...')).not.toBeInTheDocument();
    });
  });

  describe('Visual Indicators', () => {
    it('should show sparkle icon for auto-named tabs', () => {
      const autoNamedTab = createTestTab({
        id: 'auto-named-tab',
        name: 'AI Generated Name',
        isAutoNamed: true,
        manuallyRenamed: false,
      });

      const { container } = render(
        <TabBar
          tabs={[autoNamedTab]}
          activeTabId={autoNamedTab.id}
          theme={mockTheme}
          onTabSelect={mockOnTabSelect}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
          onAutoRename={mockOnAutoRename}
        />
      );

      // Look for sparkle icon with tooltip
      const sparkleIcon = container.querySelector('[title="AI-generated name"]');
      expect(sparkleIcon).toBeInTheDocument();
    });

    it('should not show sparkle icon for manually renamed tabs', () => {
      const manualTab = createTestTab({
        id: 'manual-tab',
        name: 'User Custom Name',
        isAutoNamed: false,
        manuallyRenamed: true,
      });

      const { container } = render(
        <TabBar
          tabs={[manualTab]}
          activeTabId={manualTab.id}
          theme={mockTheme}
          onTabSelect={mockOnTabSelect}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
          onAutoRename={mockOnAutoRename}
        />
      );

      // Sparkle icon should not exist
      const sparkleIcon = container.querySelector('[title="AI-generated name"]');
      expect(sparkleIcon).not.toBeInTheDocument();
    });

    it('should not show sparkle icon when tab is busy', () => {
      const busyAutoNamedTab = createTestTab({
        id: 'busy-auto-tab',
        name: 'Tab Name',
        isAutoNamed: true,
        manuallyRenamed: false,
        state: 'busy' as const,
      });

      const { container } = render(
        <TabBar
          tabs={[busyAutoNamedTab]}
          activeTabId={busyAutoNamedTab.id}
          theme={mockTheme}
          onTabSelect={mockOnTabSelect}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
          onAutoRename={mockOnAutoRename}
        />
      );

      // Sparkle should be hidden during busy state
      const sparkleIcon = container.querySelector('[title="AI-generated name"]');
      expect(sparkleIcon).not.toBeInTheDocument();
    });
  });

  describe('Tab State Management', () => {
    it('should preserve isAutoNamed and manuallyRenamed flags', () => {
      const tabs = [
        createTestTab({ id: 'tab-1', name: 'Auto Named', isAutoNamed: true, manuallyRenamed: false }),
        createTestTab({ id: 'tab-2', name: 'Manual Named', isAutoNamed: false, manuallyRenamed: true }),
        createTestTab({ id: 'tab-3', name: 'Default Name', isAutoNamed: false, manuallyRenamed: false }),
      ];

      const { container } = render(
        <TabBar
          tabs={tabs}
          activeTabId="tab-1"
          theme={mockTheme}
          onTabSelect={mockOnTabSelect}
          onTabClose={mockOnTabClose}
          onNewTab={mockOnNewTab}
          onAutoRename={mockOnAutoRename}
        />
      );

      // Verify auto-named tab has sparkle
      const sparkleIcons = container.querySelectorAll('[title="AI-generated name"]');
      expect(sparkleIcons).toHaveLength(1); // Only tab-1 should have it

      // All tabs should be rendered
      expect(screen.getByText('Auto Named')).toBeInTheDocument();
      expect(screen.getByText('Manual Named')).toBeInTheDocument();
      expect(screen.getByText('Default Name')).toBeInTheDocument();
    });
  });
});

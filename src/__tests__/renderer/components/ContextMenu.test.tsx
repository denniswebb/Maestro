import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContextMenu } from '../../../renderer/components/ContextMenu';
import type { Theme } from '../../../renderer/types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span data-testid="x-icon" className={className} style={style}>X</span>
  ),
  Check: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <span data-testid="check-icon" className={className} style={style}>✓</span>
  ),
}));

// Test theme
const mockTheme: Theme = {
  id: 'test-theme',
  name: 'Test Theme',
  mode: 'dark',
  colors: {
    bgMain: '#1a1a1a',
    bgSidebar: '#2a2a2a',
    bgActivity: '#3a3a3a',
    textMain: '#ffffff',
    textDim: '#888888',
    accent: '#007acc',
    border: '#444444',
    error: '#ff4444',
    success: '#44ff44',
    warning: '#ffaa00',
    vibe: '#ff00ff',
    agentStatus: '#00ff00',
  },
};

describe('ContextMenu', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock focus and blur for keyboard navigation tests
    HTMLElement.prototype.focus = vi.fn();
    HTMLElement.prototype.blur = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders menu at specified position', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]');
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveStyle({ top: '200px', left: '100px' });
    });

    it('renders all menu items', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
        { label: 'Item 3', onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('renders menu item icons when provided', () => {
      const items = [
        { label: 'Close', icon: <span data-testid="x-icon">X</span>, onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('renders dividers between menu items when dividerAfter is true', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn(), dividerAfter: true },
        { label: 'Item 2', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const dividers = container.querySelectorAll('.border-t');
      expect(dividers.length).toBeGreaterThan(0);
    });
  });

  describe('disabled items', () => {
    it('applies disabled styling to disabled items', () => {
      const items = [
        { label: 'Enabled', onClick: vi.fn(), disabled: false },
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const disabledItem = screen.getByText('Disabled').closest('[role="menuitem"]');
      expect(disabledItem).toHaveClass('opacity-40');
      expect(disabledItem).toHaveClass('cursor-default');
    });

    it('sets aria-disabled attribute on disabled items', () => {
      const items = [
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const disabledItem = screen.getByText('Disabled').closest('[role="menuitem"]');
      expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not call onClick for disabled items', () => {
      const mockOnClick = vi.fn();
      const items = [
        { label: 'Disabled', onClick: mockOnClick, disabled: true },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const disabledItem = screen.getByText('Disabled');
      fireEvent.click(disabledItem);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('does not apply hover class to disabled items', () => {
      const items = [
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const disabledItem = screen.getByText('Disabled').closest('[role="menuitem"]');
      expect(disabledItem).not.toHaveClass('hover:bg-white/10');
    });
  });

  describe('enabled items', () => {
    it('calls onClick and closes menu when enabled item is clicked', () => {
      const mockOnClick = vi.fn();
      const items = [
        { label: 'Enabled', onClick: mockOnClick },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Enabled'));

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('applies hover class to enabled items', () => {
      const items = [
        { label: 'Enabled', onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const enabledItem = screen.getByText('Enabled').closest('[role="menuitem"]');
      expect(enabledItem).toHaveClass('hover:bg-white/10');
    });

    it('applies danger styling when danger prop is true', () => {
      const items = [
        { label: 'Delete', onClick: vi.fn(), danger: true },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const dangerItem = screen.getByText('Delete').closest('[role="menuitem"]');
      expect(dangerItem).toHaveStyle({ color: mockTheme.colors.error });
    });
  });

  describe('keyboard navigation', () => {
    it('focuses first enabled item on mount', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const firstItem = screen.getByText('Item 1').closest('[role="menuitem"]');
      expect(firstItem?.focus).toHaveBeenCalled();
    });

    it('skips disabled items when focusing first item', () => {
      const items = [
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
        { label: 'Enabled', onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const enabledItem = screen.getByText('Enabled').closest('[role="menuitem"]');
      expect(enabledItem?.focus).toHaveBeenCalled();
    });

    it('navigates down with ArrowDown key', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;
      fireEvent.keyDown(menu, { key: 'ArrowDown' });

      const item2 = screen.getByText('Item 2').closest('[role="menuitem"]');
      expect(item2?.focus).toHaveBeenCalled();
    });

    it('navigates up with ArrowUp key', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;

      // Move to Item 2
      fireEvent.keyDown(menu, { key: 'ArrowDown' });

      // Move back to Item 1
      fireEvent.keyDown(menu, { key: 'ArrowUp' });

      const item1 = screen.getByText('Item 1').closest('[role="menuitem"]');
      expect(item1?.focus).toHaveBeenCalled();
    });

    it('wraps around when navigating down from last item', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;

      // Navigate to Item 2
      fireEvent.keyDown(menu, { key: 'ArrowDown' });

      // Navigate down from last item should wrap to first
      fireEvent.keyDown(menu, { key: 'ArrowDown' });

      const item1 = screen.getByText('Item 1').closest('[role="menuitem"]');
      expect(item1?.focus).toHaveBeenCalled();
    });

    it('wraps around when navigating up from first item', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;

      // Navigate up from first item should wrap to last
      fireEvent.keyDown(menu, { key: 'ArrowUp' });

      const item2 = screen.getByText('Item 2').closest('[role="menuitem"]');
      expect(item2?.focus).toHaveBeenCalled();
    });

    it('skips disabled items during keyboard navigation', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
        { label: 'Item 3', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;

      // Navigate down from Item 1 should skip disabled and go to Item 3
      fireEvent.keyDown(menu, { key: 'ArrowDown' });

      const item3 = screen.getByText('Item 3').closest('[role="menuitem"]');
      expect(item3?.focus).toHaveBeenCalled();
    });

    it('activates focused item with Enter key', () => {
      const mockOnClick = vi.fn();
      const items = [
        { label: 'Item 1', onClick: mockOnClick },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;
      fireEvent.keyDown(menu, { key: 'Enter' });

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('activates focused item with Space key', () => {
      const mockOnClick = vi.fn();
      const items = [
        { label: 'Item 1', onClick: mockOnClick },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;
      fireEvent.keyDown(menu, { key: ' ' });

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not activate disabled items with Enter', () => {
      const mockOnClick = vi.fn();
      const items = [
        { label: 'Disabled', onClick: mockOnClick, disabled: true },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;
      fireEvent.keyDown(menu, { key: 'Enter' });

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('closes menu with Escape key', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;
      fireEvent.keyDown(menu, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('closes menu with Tab key', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;
      fireEvent.keyDown(menu, { key: 'Tab' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('mouse and keyboard hybrid interaction', () => {
    it('updates focused item on mouse hover', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const item2 = screen.getByText('Item 2').closest('[role="menuitem"]')!;
      fireEvent.mouseEnter(item2);

      expect(item2.focus).toHaveBeenCalled();
    });

    it('allows keyboard navigation after mouse hover', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
        { label: 'Item 3', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      // Hover on Item 2
      const item2 = screen.getByText('Item 2').closest('[role="menuitem"]')!;
      fireEvent.mouseEnter(item2);

      // Navigate down with keyboard
      const menu = container.querySelector('[role="menu"]')!;
      fireEvent.keyDown(menu, { key: 'ArrowDown' });

      const item3 = screen.getByText('Item 3').closest('[role="menuitem"]');
      expect(item3?.focus).toHaveBeenCalled();
    });
  });

  describe('viewport positioning', () => {
    beforeEach(() => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
    });

    it('adjusts position when menu would extend beyond right edge', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={1900} // Near right edge
          y={100}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]');
      const left = parseInt(menu?.getAttribute('style')?.match(/left:\s*(\d+)px/)?.[1] || '0');

      // Should be adjusted left from original position
      expect(left).toBeLessThan(1900);
    });

    it('adjusts position when menu would extend beyond bottom edge', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={1060} // Near bottom edge
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]');
      const top = parseInt(menu?.getAttribute('style')?.match(/top:\s*(\d+)px/)?.[1] || '0');

      // Should be adjusted up from original position
      expect(top).toBeLessThan(1060);
    });

    it('handles positioning at viewport corners gracefully', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      // Bottom-right corner
      const { container: container1 } = render(
        <ContextMenu
          x={1900}
          y={1060}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu1 = container1.querySelector('[role="menu"]');
      expect(menu1).toBeInTheDocument();

      // Top-left corner
      const { container: container2 } = render(
        <ContextMenu
          x={0}
          y={0}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu2 = container2.querySelector('[role="menu"]');
      expect(menu2).toBeInTheDocument();
    });
  });

  describe('click outside', () => {
    it('closes menu when clicking outside', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      // Click outside the menu
      fireEvent.mouseDown(document.body);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not close menu when clicking inside', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;
      fireEvent.mouseDown(menu);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('sets role="menu" on menu container', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      expect(container.querySelector('[role="menu"]')).toBeInTheDocument();
    });

    it('sets role="menuitem" on all menu items', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menuItems = container.querySelectorAll('[role="menuitem"]');
      expect(menuItems).toHaveLength(2);
    });

    it('sets aria-label on menu container', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]');
      expect(menu).toHaveAttribute('aria-label', 'Tab context menu');
    });

    it('sets tabIndex={-1} on menu for programmatic focus', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]');
      expect(menu).toHaveAttribute('tabIndex', '-1');
    });

    it('sets aria-disabled on disabled items', () => {
      const items = [
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const disabledItem = screen.getByText('Disabled').closest('[role="menuitem"]');
      expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('theme integration', () => {
    it('applies theme colors to menu background', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]');
      expect(menu).toHaveStyle({ backgroundColor: mockTheme.colors.bgSidebar });
    });

    it('applies theme border color', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]');
      expect(menu).toHaveStyle({ borderColor: mockTheme.colors.border });
    });

    it('applies theme text color to menu items', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const item = screen.getByText('Item 1').closest('[role="menuitem"]');
      expect(item).toHaveStyle({ color: mockTheme.colors.textMain });
    });

    it('applies theme textDim color to disabled items', () => {
      const items = [
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const item = screen.getByText('Disabled').closest('[role="menuitem"]');
      expect(item).toHaveStyle({ color: mockTheme.colors.textDim });
    });

    it('applies theme error color to danger items', () => {
      const items = [
        { label: 'Delete', onClick: vi.fn(), danger: true },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const item = screen.getByText('Delete').closest('[role="menuitem"]');
      expect(item).toHaveStyle({ color: mockTheme.colors.error });
    });
  });

  describe('edge cases', () => {
    it('handles empty items array', () => {
      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={[]}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]');
      expect(menu).toBeInTheDocument();
      expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
    });

    it('handles all items disabled', () => {
      const items = [
        { label: 'Disabled 1', onClick: vi.fn(), disabled: true },
        { label: 'Disabled 2', onClick: vi.fn(), disabled: true },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      // Should not crash, keyboard navigation should handle gracefully
      const menu = container.querySelector('[role="menu"]')!;
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      fireEvent.keyDown(menu, { key: 'Enter' });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('handles long item labels gracefully', () => {
      const items = [
        { label: 'This is a very long menu item label that should be handled gracefully', onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/This is a very long/)).toBeInTheDocument();
    });

    it('handles special characters in labels', () => {
      const items = [
        { label: '<script>alert("xss")</script>', onClick: vi.fn() },
        { label: 'Item & More', onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
      expect(screen.getByText('Item & More')).toBeInTheDocument();
    });

    it('handles unicode characters in labels', () => {
      const items = [
        { label: '🎵 Music', onClick: vi.fn() },
        { label: '日本語', onClick: vi.fn() },
      ];

      render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('🎵 Music')).toBeInTheDocument();
      expect(screen.getByText('日本語')).toBeInTheDocument();
    });

    it('handles rapid keyboard navigation', () => {
      const items = [
        { label: 'Item 1', onClick: vi.fn() },
        { label: 'Item 2', onClick: vi.fn() },
        { label: 'Item 3', onClick: vi.fn() },
      ];

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;

      // Rapid navigation
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      fireEvent.keyDown(menu, { key: 'ArrowUp' });
      fireEvent.keyDown(menu, { key: 'ArrowDown' });

      // Should not crash
      expect(menu).toBeInTheDocument();
    });

    it('prevents event bubbling on item clicks', () => {
      const mockOnClick = vi.fn();
      const mockParentClick = vi.fn();
      const items = [
        { label: 'Item 1', onClick: mockOnClick },
      ];

      const { container } = render(
        <div onClick={mockParentClick}>
          <ContextMenu
            x={100}
            y={200}
            theme={mockTheme}
            items={items}
            onClose={mockOnClose}
          />
        </div>
      );

      const item = screen.getByText('Item 1');
      fireEvent.click(item);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      // Parent click should not be triggered due to stopPropagation
      expect(mockParentClick).not.toHaveBeenCalled();
    });
  });

  describe('many tabs scenario', () => {
    it('handles context menu with many items efficiently', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        label: `Item ${i + 1}`,
        onClick: vi.fn(),
      }));

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(50);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 50')).toBeInTheDocument();
    });

    it('navigates efficiently through many items with keyboard', () => {
      const items = Array.from({ length: 20 }, (_, i) => ({
        label: `Item ${i + 1}`,
        onClick: vi.fn(),
      }));

      const { container } = render(
        <ContextMenu
          x={100}
          y={200}
          theme={mockTheme}
          items={items}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]')!;

      // Navigate through several items
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(menu, { key: 'ArrowDown' });
      }

      // Should still be functional
      expect(menu).toBeInTheDocument();
    });
  });
});

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { generateAutoRunTabName, truncateTabName } from '../../../renderer/utils/tabNaming';

describe('tabNaming', () => {
  describe('generateAutoRunTabName', () => {
    it('removes checkbox prefix from task description', () => {
      expect(generateAutoRunTabName('- [ ] Fix authentication bug')).toBe('Authentication Bug');
      expect(generateAutoRunTabName('* [ ] Add user profile page')).toBe('User Profile Page');
      expect(generateAutoRunTabName('  - [ ]  Update API endpoints')).toBe('Api Endpoints');
    });

    it('removes common task prefixes', () => {
      expect(generateAutoRunTabName('Implement user authentication')).toBe('User Authentication');
      expect(generateAutoRunTabName('Fix broken login flow')).toBe('Broken Login Flow');
      expect(generateAutoRunTabName('Add pagination to table')).toBe('Pagination To Table');
      expect(generateAutoRunTabName('Update error handling')).toBe('Error Handling');
      expect(generateAutoRunTabName('Refactor database queries')).toBe('Database Queries');
      expect(generateAutoRunTabName('Test API endpoints')).toBe('Api Endpoints');
      expect(generateAutoRunTabName('Create new component')).toBe('New Component');
      expect(generateAutoRunTabName('Build deployment pipeline')).toBe('Deployment Pipeline');
      expect(generateAutoRunTabName('Setup CI/CD workflow')).toBe('Ci/cd Workflow');
    });

    it('converts to title case', () => {
      expect(generateAutoRunTabName('user authentication system')).toBe('User Authentication System');
      expect(generateAutoRunTabName('USER PROFILE PAGE')).toBe('User Profile Page');
      expect(generateAutoRunTabName('MiXeD CaSe InPuT')).toBe('Mixed Case Input');
    });

    it('truncates to 40 characters with ellipsis', () => {
      const longTask = 'This is a very long task description that exceeds forty characters';
      const result = generateAutoRunTabName(longTask);
      expect(result.length).toBe(40);
      // The title-cased version is longer, so it gets truncated
      expect(result.endsWith('...')).toBe(true);
      expect(result).toMatch(/^This Is A Very Long Task/);
    });

    it('handles empty or whitespace-only input', () => {
      expect(generateAutoRunTabName('')).toBe('Auto Run Task');
      expect(generateAutoRunTabName('   ')).toBe('Auto Run Task');
      expect(generateAutoRunTabName('- [ ]')).toBe('Auto Run Task');
    });

    it('preserves necessary prefixes when they are part of the task name', () => {
      // "Add" as part of the task, not a prefix
      expect(generateAutoRunTabName('Database addition to schema')).toBe('Database Addition To Schema');
    });

    it('handles complex markdown checkbox formats', () => {
      expect(generateAutoRunTabName('  -   [  ]   Fix bug in login')).toBe('Bug In Login');
      expect(generateAutoRunTabName('-[ ] Update documentation')).toBe('Documentation');
    });

    it('combines multiple transformations correctly', () => {
      expect(generateAutoRunTabName('- [ ] Implement user authentication and authorization system')).toBe('User Authentication And Authorization...');
      expect(generateAutoRunTabName('* [ ] Fix critical security vulnerability in payment processing')).toBe('Critical Security Vulnerability In Pa...');
    });
  });

  describe('truncateTabName', () => {
    it('returns name unchanged if within max length', () => {
      expect(truncateTabName('Short Name')).toBe('Short Name');
      expect(truncateTabName('Exactly Forty Characters Name 1234567')).toBe('Exactly Forty Characters Name 1234567');
    });

    it('truncates and adds ellipsis if over max length', () => {
      const longName = 'This is a very long name that definitely exceeds the maximum allowed length';
      const result = truncateTabName(longName);
      expect(result.length).toBe(40);
      expect(result.endsWith('...')).toBe(true);
      expect(result).toMatch(/^This is a very long name/);
    });

    it('respects custom max length', () => {
      const name = 'A medium length name';
      const result10 = truncateTabName(name, 10);
      expect(result10.length).toBe(10);
      expect(result10.endsWith('...')).toBe(true);

      const result15 = truncateTabName(name, 15);
      expect(result15.length).toBe(15);
      expect(result15.endsWith('...')).toBe(true);
    });

    it('handles edge case where name is exactly max length + 1', () => {
      const name = 'This name has exactly 41 characters here!';  // 41 characters
      const result = truncateTabName(name, 40);
      expect(result.length).toBe(40);
      expect(result.endsWith('...')).toBe(true);
    });

    it('handles empty string', () => {
      expect(truncateTabName('')).toBe('');
    });
  });
});

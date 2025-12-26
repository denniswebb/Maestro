import { describe, it, expect } from 'vitest';
import { generateAutoRunTabName, truncateTabName, extractFirstUncheckedTask } from '../../../renderer/utils/tabNaming';

describe('tabNaming', () => {
  describe('generateAutoRunTabName', () => {
    it('should remove markdown checkbox prefix', () => {
      expect(generateAutoRunTabName('- [ ] Fix bug')).toBe('Bug');
      expect(generateAutoRunTabName('* [ ] Fix bug')).toBe('Bug');
      expect(generateAutoRunTabName('  - [ ] Fix bug')).toBe('Bug');
    });

    it('should remove common task prefixes', () => {
      expect(generateAutoRunTabName('Implement user profile')).toBe('User Profile');
      expect(generateAutoRunTabName('Fix authentication bug')).toBe('Authentication Bug');
      expect(generateAutoRunTabName('Add new feature')).toBe('New Feature');
      expect(generateAutoRunTabName('Update dependencies')).toBe('Dependencies');
      expect(generateAutoRunTabName('Refactor code structure')).toBe('Code Structure');
      expect(generateAutoRunTabName('Test login flow')).toBe('Login Flow');
      expect(generateAutoRunTabName('Create database schema')).toBe('Database Schema');
      expect(generateAutoRunTabName('Build production bundle')).toBe('Production Bundle');
      expect(generateAutoRunTabName('Setup CI/CD pipeline')).toBe('Ci/cd Pipeline');
    });

    it('should be case insensitive for prefix removal', () => {
      expect(generateAutoRunTabName('IMPLEMENT feature')).toBe('Feature');
      expect(generateAutoRunTabName('FiX bug')).toBe('Bug');
      expect(generateAutoRunTabName('add component')).toBe('Component');
    });

    it('should convert to Title Case', () => {
      expect(generateAutoRunTabName('user profile editing')).toBe('User Profile Editing');
      expect(generateAutoRunTabName('AUTHENTICATION SYSTEM')).toBe('Authentication System');
      expect(generateAutoRunTabName('Fix API endpoint')).toBe('Api Endpoint');
    });

    it('should truncate to 40 characters with ellipsis', () => {
      const longTask = 'Implement a very long task description that definitely exceeds forty characters';
      const result = generateAutoRunTabName(longTask);
      expect(result.length).toBe(40);
      expect(result).toBe('A Very Long Task Description That Def...');
    });

    it('should handle combined checkbox and prefix removal', () => {
      expect(generateAutoRunTabName('- [ ] Implement user authentication')).toBe('User Authentication');
      expect(generateAutoRunTabName('* [ ] Fix memory leak in worker')).toBe('Memory Leak In Worker');
    });

    it('should return fallback for empty input', () => {
      expect(generateAutoRunTabName('')).toBe('Auto Run Task');
      expect(generateAutoRunTabName('- [ ]')).toBe('Auto Run Task');
      expect(generateAutoRunTabName('   ')).toBe('Auto Run Task');
    });

    it('should handle tasks without prefixes', () => {
      expect(generateAutoRunTabName('User authentication flow')).toBe('User Authentication Flow');
      expect(generateAutoRunTabName('Database migration script')).toBe('Database Migration Script');
    });

    it('should preserve important words after prefix removal', () => {
      // "Implement" is removed, but remaining text is meaningful
      expect(generateAutoRunTabName('Implement OAuth integration with Google')).toBe('Oauth Integration With Google');
      // "Fix" is removed, leaving the actual issue
      expect(generateAutoRunTabName('Fix broken logout button functionality')).toBe('Broken Logout Button Functionality');
    });
  });

  describe('truncateTabName', () => {
    it('should not truncate names shorter than max length', () => {
      expect(truncateTabName('Short name')).toBe('Short name');
      expect(truncateTabName('Exactly forty characters in tab name!')).toBe('Exactly forty characters in tab name!');
    });

    it('should truncate long names with ellipsis', () => {
      const longName = 'This is a very long tab name that exceeds the maximum length';
      const result = truncateTabName(longName, 40);
      expect(result.length).toBe(40);
      expect(result).toBe('This is a very long tab name that exc...');
    });

    it('should use custom max length', () => {
      const name = 'A moderately long name';
      expect(truncateTabName(name, 10)).toBe('A moder...');
      expect(truncateTabName(name, 15)).toBe('A moderately...');
    });

    it('should handle empty strings', () => {
      expect(truncateTabName('')).toBe('');
      expect(truncateTabName('', 20)).toBe('');
    });
  });

  describe('extractFirstUncheckedTask', () => {
    it('should extract the first unchecked task', () => {
      const content = `
- [x] Completed task
- [ ] First unchecked task
- [ ] Second unchecked task
`;
      expect(extractFirstUncheckedTask(content)).toBe('First unchecked task');
    });

    it('should handle different checkbox formats', () => {
      const content1 = '* [ ] Task with asterisk';
      const content2 = '- [ ] Task with dash';
      expect(extractFirstUncheckedTask(content1)).toBe('Task with asterisk');
      expect(extractFirstUncheckedTask(content2)).toBe('Task with dash');
    });

    it('should handle indented tasks', () => {
      const content = `
  - [ ] Indented unchecked task
- [ ] Normal task
`;
      expect(extractFirstUncheckedTask(content)).toBe('Indented unchecked task');
    });

    it('should return null if no unchecked tasks', () => {
      const content = `
- [x] Only completed tasks
- [X] Another completed task
`;
      expect(extractFirstUncheckedTask(content)).toBe(null);
    });

    it('should return null for empty content', () => {
      expect(extractFirstUncheckedTask('')).toBe(null);
      expect(extractFirstUncheckedTask('   \n  \n  ')).toBe(null);
    });

    it('should skip checked tasks and return first unchecked', () => {
      const content = `
# Document Title

Some introduction text.

## Tasks

- [x] Already done
- [X] Also done
- [ ] First unchecked task description
- [ ] Second unchecked task
`;
      expect(extractFirstUncheckedTask(content)).toBe('First unchecked task description');
    });

    it('should handle complex task descriptions', () => {
      const content = '- [ ] Implement user authentication with OAuth2.0 and JWT tokens';
      expect(extractFirstUncheckedTask(content)).toBe('Implement user authentication with OAuth2.0 and JWT tokens');
    });
  });
});

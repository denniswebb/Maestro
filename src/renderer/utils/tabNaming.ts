/**
 * Utilities for generating and formatting tab names.
 */

/**
 * Extract the first unchecked task from markdown content.
 * Searches for the pattern: - [ ] task description
 *
 * @param markdownContent - The markdown document content
 * @returns The task description (without checkbox prefix) or empty string if none found
 */
export function extractFirstUncheckedTask(markdownContent: string): string {
  // Match first unchecked task: - [ ] or * [ ] at start of line
  const match = markdownContent.match(/^[\s]*[-*]\s*\[\s*\]\s*(.+)$/m);
  return match ? match[1].trim() : '';
}

/**
 * Generate a tab name from an Auto Run task description.
 * Applies rule-based naming strategy:
 * - Removes markdown checkbox prefix
 * - Removes common task prefixes (Implement, Fix, Add, etc.)
 * - Converts to title case
 * - Truncates to 40 characters max with ellipsis
 *
 * @param taskDescription - The raw task description from Auto Run document
 * @returns Formatted tab name (max 40 chars)
 */
export function generateAutoRunTabName(taskDescription: string): string {
  // Remove markdown checkbox prefix if present (- [ ] or * [ ])
  let name = taskDescription.replace(/^[\s]*[-*]\s*\[\s*\]\s*/, '').trim();

  // Remove common task prefixes (case insensitive)
  const prefixes = /^(implement|fix|add|update|refactor|test|create|build|setup)\s+/i;
  name = name.replace(prefixes, '').trim();

  // Title case
  name = name.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');

  // Truncate to 40 characters
  if (name.length > 40) {
    name = name.substring(0, 40 - 3) + '...';
  }

  return name || 'Auto Run Task';
}

/**
 * Truncate a tab name to a maximum length with ellipsis.
 *
 * @param name - The tab name to truncate
 * @param maxLength - Maximum length (default: 40)
 * @returns Truncated name with ellipsis if needed
 */
export function truncateTabName(name: string, maxLength = 40): string {
  if (name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength - 3) + '...';
}

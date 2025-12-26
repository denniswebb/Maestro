// Tab naming utilities for Auto Run and manual renaming

/**
 * Generate a tab name from an Auto Run task description using rule-based logic.
 *
 * Rules:
 * - Remove common task prefixes (Implement, Fix, Add, Update, Refactor, Test, Create, Build, Setup)
 * - Convert to Title Case
 * - Truncate to 40 characters max with ellipsis
 * - Fallback to "Auto Run Task" if empty
 *
 * @param taskDescription - The full task text (e.g., "Fix authentication bug in login flow")
 * @returns Cleaned, title-cased tab name (e.g., "Authentication Bug In Login Flow")
 *
 * @example
 * ```typescript
 * generateAutoRunTabName("- [ ] Implement user profile editing")
 * // Returns: "User Profile Editing"
 *
 * generateAutoRunTabName("Fix authentication bug in login flow")
 * // Returns: "Authentication Bug In Login Flow"
 *
 * generateAutoRunTabName("Add a very long task description that exceeds the forty character limit")
 * // Returns: "Very Long Task Description That Ex..."
 * ```
 */
export function generateAutoRunTabName(taskDescription: string): string {
  // Remove markdown checkbox prefix if present (- [ ] or * [ ])
  let name = taskDescription.replace(/^[\s]*[-*]\s*\[\s*\]\s*/, '').trim();

  // Remove common task prefixes (case insensitive)
  const prefixes = /^(implement|fix|add|update|refactor|test|create|build|setup)\s+/i;
  name = name.replace(prefixes, '').trim();

  // Convert to Title Case (capitalize first letter of each word)
  name = name.split(' ').map(word => {
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');

  // Truncate to 40 characters with ellipsis
  if (name.length > 40) {
    name = name.substring(0, 40 - 3) + '...';
  }

  // Fallback if empty after processing
  return name || 'Auto Run Task';
}

/**
 * Truncate a tab name to a maximum length with ellipsis.
 *
 * @param name - The tab name to truncate
 * @param maxLength - Maximum length (default: 40)
 * @returns Truncated name with ellipsis if needed
 */
export function truncateTabName(name: string, maxLength: number = 40): string {
  if (!name || name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength - 3) + '...';
}

/**
 * Extract the first unchecked task description from markdown content.
 * Matches lines like: - [ ] task description or * [ ] task description
 *
 * @param content - Markdown document content
 * @returns The first unchecked task text (without checkbox), or null if none found
 *
 * @example
 * ```typescript
 * const content = `
 * - [x] Completed task
 * - [ ] First unchecked task
 * - [ ] Second unchecked task
 * `;
 * extractFirstUncheckedTask(content);
 * // Returns: "First unchecked task"
 * ```
 */
export function extractFirstUncheckedTask(content: string): string | null {
  const uncheckedTaskRegex = /^[\s]*[-*]\s*\[\s*\]\s*(.+)$/m;
  const match = content.match(uncheckedTaskRegex);
  return match ? match[1].trim() : null;
}

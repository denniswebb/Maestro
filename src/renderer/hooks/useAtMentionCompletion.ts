import { useMemo, useCallback } from 'react';
import type { Session } from '../types';
import type { FileNode } from './useFileExplorer';
import { fuzzyMatchWithScore } from '../utils/search';

export interface AtMentionSuggestion {
  value: string;      // Full path to insert
  type: 'file' | 'folder';
  displayText: string; // Display name (filename)
  fullPath: string;    // Full relative path
  score: number;       // For sorting by relevance
}

export interface UseAtMentionCompletionReturn {
  getSuggestions: (filter: string) => AtMentionSuggestion[];
}

/**
 * Hook for providing @ mention file completion in AI mode.
 * Uses fuzzy matching to find files in the project tree.
 */
export function useAtMentionCompletion(session: Session | null): UseAtMentionCompletionReturn {
  // Build a flat list of all files/folders from the file tree
  const allFiles = useMemo(() => {
    if (!session?.fileTree) return [];

    const files: { name: string; type: 'file' | 'folder'; path: string }[] = [];

    const traverse = (nodes: FileNode[], currentPath = '') => {
      for (const node of nodes) {
        const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
        files.push({
          name: node.name,
          type: node.type,
          path: fullPath
        });
        if (node.type === 'folder' && node.children) {
          traverse(node.children, fullPath);
        }
      }
    };

    traverse(session.fileTree);
    return files;
  }, [session?.fileTree]);

  const getSuggestions = useCallback((filter: string): AtMentionSuggestion[] => {
    if (!session) return [];

    const suggestions: AtMentionSuggestion[] = [];

    for (const file of allFiles) {
      // Match against both file name and full path
      const nameMatch = fuzzyMatchWithScore(file.name, filter);
      const pathMatch = fuzzyMatchWithScore(file.path, filter);

      // Use the better of the two scores
      const bestMatch = nameMatch.score > pathMatch.score ? nameMatch : pathMatch;

      if (bestMatch.matches || !filter) {
        suggestions.push({
          value: file.path,
          type: file.type,
          displayText: file.name,
          fullPath: file.path,
          score: bestMatch.score
        });
      }
    }

    // Sort by score (highest first), then alphabetically
    suggestions.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Within same score, prefer files over folders, then alphabetical
      if (a.type !== b.type) {
        return a.type === 'file' ? -1 : 1;
      }
      return a.displayText.localeCompare(b.displayText);
    });

    // Limit to reasonable number
    return suggestions.slice(0, 15);
  }, [session, allFiles]);

  return { getSuggestions };
}

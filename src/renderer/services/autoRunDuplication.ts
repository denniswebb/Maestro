// Auto Run Agent Duplication Service
// Handles automatic duplication of sessions during Auto Run batch processing

import type { Session, Group, BatchRunState, UsageStats } from '../types';
import type {
  AutoRunDuplicationConfig,
  DuplicationTrigger,
  DuplicationInstance,
  DuplicationTriggerEvaluation
} from '../../shared/autoRunDuplication';
import { evaluateDuplicationTriggers } from '../../shared/autoRunDuplication';
import { generateId } from '../utils/ids';

/**
 * Parameters for duplicating a session
 */
export interface DuplicateSessionParams {
  sourceSession: Session;
  trigger: DuplicationTrigger;
  groupId?: string;
  customPrompt?: string;
}

/**
 * Result of session duplication
 */
export interface DuplicateSessionResult {
  success: boolean;
  duplicatedSessions: Session[];
  group?: Group;
  error?: string;
}

/**
 * Auto Run Duplication Service
 * Manages automatic agent duplication during batch processing
 */
export class AutoRunDuplicationService {
  private duplicationInstances: Map<string, DuplicationInstance> = new Map();
  private config: AutoRunDuplicationConfig;

  constructor(config: AutoRunDuplicationConfig) {
    this.config = config;
  }

  /**
   * Update duplication configuration
   */
  public updateConfig(config: AutoRunDuplicationConfig): void {
    this.config = config;
  }

  /**
   * Get current configuration
   */
  public getConfig(): AutoRunDuplicationConfig {
    return { ...this.config };
  }

  /**
   * Check if duplication should occur based on current batch state
   */
  public shouldDuplicate(
    sessionId: string,
    batchState: BatchRunState,
    session: Session
  ): DuplicationTriggerEvaluation {
    // Check if we've already duplicated for this session
    if (this.duplicationInstances.has(sessionId)) {
      return {
        shouldDuplicate: false,
        triggeredBy: null,
        reason: 'Session already duplicated'
      };
    }

    // Check if we've hit the max duplicate limit
    if (this.config.maxDuplicates && this.duplicationInstances.size >= this.config.maxDuplicates) {
      return {
        shouldDuplicate: false,
        triggeredBy: null,
        reason: `Maximum duplicates limit reached (${this.config.maxDuplicates})`
      };
    }

    // Gather current metrics
    const metrics = {
      taskCount: batchState.completedTasksAcrossAllDocs,
      elapsedTimeMs: batchState.accumulatedElapsedMs,
      contextPercentage: session.contextUsage || 0,
      currentCost: session.usageStats?.totalCostUsd || 0,
      documentCount: batchState.documents.length,
      loopIteration: batchState.loopIteration
    };

    return evaluateDuplicationTriggers(this.config, metrics);
  }

  /**
   * Create duplicated sessions based on trigger configuration
   */
  public async duplicateSession(
    params: DuplicateSessionParams,
    onCreateSession: (session: Partial<Session>) => Promise<Session>,
    onCreateGroup: (name: string, emoji: string) => Promise<Group>
  ): Promise<DuplicateSessionResult> {
    const { sourceSession, trigger, customPrompt } = params;

    try {
      const duplicatedSessions: Session[] = [];
      let group: Group | undefined;

      // Create group for duplicates if configured
      if (trigger.groupDuplicates && !params.groupId) {
        const groupName = trigger.customGroupName || `Auto Run - ${sourceSession.name}`;
        const groupEmoji = '🔄';
        group = await onCreateGroup(groupName, groupEmoji);
      }

      const targetGroupId = params.groupId || group?.id;

      // Create the configured number of duplicates
      for (let i = 0; i < trigger.duplicateCount; i++) {
        const duplicateNumber = i + 1;
        const duplicateName = `${sourceSession.name} (Duplicate ${duplicateNumber})`;

        // Build new session configuration
        const newSessionConfig: Partial<Session> = {
          name: duplicateName,
          toolType: sourceSession.toolType,
          cwd: sourceSession.cwd,
          projectRoot: sourceSession.projectRoot,
          groupId: targetGroupId,

          // Preserve Auto Run configuration if enabled
          autoRunFolderPath: trigger.preserveAutoRunDocs
            ? sourceSession.autoRunFolderPath
            : undefined,

          // Preserve bookmarked status
          bookmarked: sourceSession.bookmarked,

          // Initialize with empty or copied state based on config
          aiTabs: trigger.preserveContext && sourceSession.aiTabs.length > 0
            ? [{
                id: generateId(),
                name: null,
                agentSessionId: null, // Fresh agent session
                logs: [], // Don't copy conversation history (would be confusing)
                starred: false,
                inputValue: customPrompt || trigger.customPromptTemplate || '',
                stagedImages: [],
                createdAt: Date.now(),
                state: 'idle'
              }]
            : undefined
        };

        // Create the duplicate session
        const duplicateSession = await onCreateSession(newSessionConfig);
        duplicatedSessions.push(duplicateSession);
      }

      // Track this duplication instance
      const instance: DuplicationInstance = {
        id: generateId(),
        parentSessionId: sourceSession.id,
        duplicatedSessionIds: duplicatedSessions.map(s => s.id),
        triggeredBy: trigger.type,
        createdAt: Date.now(),
        groupId: targetGroupId
      };

      this.duplicationInstances.set(sourceSession.id, instance);

      return {
        success: true,
        duplicatedSessions,
        group
      };
    } catch (error) {
      return {
        success: false,
        duplicatedSessions: [],
        error: error instanceof Error ? error.message : 'Unknown error during duplication'
      };
    }
  }

  /**
   * Distribute remaining tasks across duplicated sessions
   */
  public distributeTasksAcrossDuplicates(
    remainingTasks: string[],
    duplicateCount: number
  ): string[][] {
    if (duplicateCount <= 0 || remainingTasks.length === 0) {
      return [];
    }

    const tasksPerDuplicate = Math.ceil(remainingTasks.length / duplicateCount);
    const distributedTasks: string[][] = [];

    for (let i = 0; i < duplicateCount; i++) {
      const startIndex = i * tasksPerDuplicate;
      const endIndex = Math.min(startIndex + tasksPerDuplicate, remainingTasks.length);
      const taskSlice = remainingTasks.slice(startIndex, endIndex);

      if (taskSlice.length > 0) {
        distributedTasks.push(taskSlice);
      }
    }

    return distributedTasks;
  }

  /**
   * Get duplication instance for a session
   */
  public getDuplicationInstance(sessionId: string): DuplicationInstance | undefined {
    return this.duplicationInstances.get(sessionId);
  }

  /**
   * Get all duplication instances
   */
  public getAllInstances(): DuplicationInstance[] {
    return Array.from(this.duplicationInstances.values());
  }

  /**
   * Clear duplication instance (useful for testing or manual resets)
   */
  public clearInstance(sessionId: string): void {
    this.duplicationInstances.delete(sessionId);
  }

  /**
   * Clear all duplication instances
   */
  public clearAllInstances(): void {
    this.duplicationInstances.clear();
  }

  /**
   * Check if session has been duplicated
   */
  public hasDuplicated(sessionId: string): boolean {
    return this.duplicationInstances.has(sessionId);
  }

  /**
   * Get metrics for monitoring duplication activity
   */
  public getMetrics(): {
    totalInstances: number;
    totalDuplicates: number;
    instancesByTrigger: Record<string, number>;
  } {
    const instances = Array.from(this.duplicationInstances.values());

    const instancesByTrigger: Record<string, number> = {};
    let totalDuplicates = 0;

    for (const instance of instances) {
      const triggerType = instance.triggeredBy;
      instancesByTrigger[triggerType] = (instancesByTrigger[triggerType] || 0) + 1;
      totalDuplicates += instance.duplicatedSessionIds.length;
    }

    return {
      totalInstances: instances.length,
      totalDuplicates,
      instancesByTrigger
    };
  }
}

/**
 * Create a singleton instance of the duplication service
 * (Can be initialized with config from settings)
 */
let duplicationServiceInstance: AutoRunDuplicationService | null = null;

export function getAutoRunDuplicationService(config?: AutoRunDuplicationConfig): AutoRunDuplicationService {
  if (!duplicationServiceInstance) {
    duplicationServiceInstance = new AutoRunDuplicationService(
      config || { enabled: false, triggers: [] }
    );
  } else if (config) {
    duplicationServiceInstance.updateConfig(config);
  }

  return duplicationServiceInstance;
}

/**
 * Reset the duplication service instance (useful for testing)
 */
export function resetAutoRunDuplicationService(): void {
  duplicationServiceInstance = null;
}

// Auto Run Agent Duplication Types and Configuration
// Enables automatic duplication of sessions based on configurable triggers

/**
 * Trigger types for Auto Run agent duplication
 */
export type DuplicationTriggerType =
  | 'task_count'           // Duplicate when task count threshold reached
  | 'time_elapsed'         // Duplicate after elapsed time threshold
  | 'context_threshold'    // Duplicate when context usage exceeds threshold
  | 'cost_threshold'       // Duplicate when cost exceeds threshold
  | 'document_count'       // Duplicate when document count threshold reached
  | 'loop_iteration'       // Duplicate at specific loop iteration
  | 'manual';              // Manual trigger by user

/**
 * Configuration for a single duplication trigger
 */
export interface DuplicationTrigger {
  id: string;
  type: DuplicationTriggerType;
  enabled: boolean;

  // Trigger-specific thresholds
  taskCountThreshold?: number;        // For task_count trigger
  timeElapsedMs?: number;             // For time_elapsed trigger
  contextPercentage?: number;         // For context_threshold trigger (0-100)
  costThreshold?: number;             // For cost_threshold trigger (USD)
  documentCountThreshold?: number;    // For document_count trigger
  loopIteration?: number;             // For loop_iteration trigger

  // Duplication behavior
  duplicateCount: number;             // How many agents to spawn (default: 1)
  preserveContext: boolean;           // Copy current conversation state
  preserveAutoRunDocs: boolean;       // Copy Auto Run documents to new session
  groupDuplicates: boolean;           // Create group for duplicated sessions
  customGroupName?: string;           // Optional custom group name

  // Advanced options
  distributeTasks?: boolean;          // Distribute remaining tasks across duplicates
  sequentialExecution?: boolean;      // Execute duplicates sequentially vs parallel
  customPromptTemplate?: string;      // Optional custom prompt for duplicated agents
}

/**
 * Configuration for Auto Run agent duplication
 */
export interface AutoRunDuplicationConfig {
  enabled: boolean;                   // Global duplication feature toggle
  triggers: DuplicationTrigger[];     // List of configured triggers
  maxDuplicates?: number;             // Maximum total duplicates allowed (safety limit)
  autoCreateGroup?: boolean;          // Auto-create group for duplicates
  notifyOnDuplication?: boolean;      // Show notification when duplication occurs
}

/**
 * Default configuration for Auto Run duplication
 */
export const DEFAULT_DUPLICATION_CONFIG: AutoRunDuplicationConfig = {
  enabled: false,
  triggers: [],
  maxDuplicates: 5,
  autoCreateGroup: true,
  notifyOnDuplication: true
};

/**
 * Result of evaluating duplication triggers
 */
export interface DuplicationTriggerEvaluation {
  shouldDuplicate: boolean;
  triggeredBy: DuplicationTrigger | null;
  reason: string;
  metrics?: {
    currentTaskCount?: number;
    elapsedTimeMs?: number;
    contextPercentage?: number;
    currentCost?: number;
    documentCount?: number;
    currentLoop?: number;
  };
}

/**
 * State for tracking duplication instances
 */
export interface DuplicationInstance {
  id: string;
  parentSessionId: string;
  duplicatedSessionIds: string[];
  triggeredBy: DuplicationTriggerType;
  createdAt: number;
  groupId?: string;
}

/**
 * Evaluate if any triggers should fire for agent duplication
 */
export function evaluateDuplicationTriggers(
  config: AutoRunDuplicationConfig,
  metrics: {
    taskCount?: number;
    elapsedTimeMs?: number;
    contextPercentage?: number;
    currentCost?: number;
    documentCount?: number;
    loopIteration?: number;
  }
): DuplicationTriggerEvaluation {
  // Feature disabled
  if (!config.enabled) {
    return {
      shouldDuplicate: false,
      triggeredBy: null,
      reason: 'Auto Run duplication is disabled'
    };
  }

  // No triggers configured
  if (config.triggers.length === 0) {
    return {
      shouldDuplicate: false,
      triggeredBy: null,
      reason: 'No duplication triggers configured'
    };
  }

  // Evaluate each enabled trigger
  for (const trigger of config.triggers) {
    if (!trigger.enabled) continue;

    let shouldTrigger = false;
    let reason = '';

    switch (trigger.type) {
      case 'task_count':
        if (trigger.taskCountThreshold !== undefined && metrics.taskCount !== undefined) {
          shouldTrigger = metrics.taskCount >= trigger.taskCountThreshold;
          reason = `Task count (${metrics.taskCount}) reached threshold (${trigger.taskCountThreshold})`;
        }
        break;

      case 'time_elapsed':
        if (trigger.timeElapsedMs !== undefined && metrics.elapsedTimeMs !== undefined) {
          shouldTrigger = metrics.elapsedTimeMs >= trigger.timeElapsedMs;
          reason = `Elapsed time (${Math.round(metrics.elapsedTimeMs / 1000)}s) reached threshold (${Math.round(trigger.timeElapsedMs / 1000)}s)`;
        }
        break;

      case 'context_threshold':
        if (trigger.contextPercentage !== undefined && metrics.contextPercentage !== undefined) {
          shouldTrigger = metrics.contextPercentage >= trigger.contextPercentage;
          reason = `Context usage (${metrics.contextPercentage}%) reached threshold (${trigger.contextPercentage}%)`;
        }
        break;

      case 'cost_threshold':
        if (trigger.costThreshold !== undefined && metrics.currentCost !== undefined) {
          shouldTrigger = metrics.currentCost >= trigger.costThreshold;
          reason = `Cost ($${metrics.currentCost.toFixed(4)}) reached threshold ($${trigger.costThreshold.toFixed(4)})`;
        }
        break;

      case 'document_count':
        if (trigger.documentCountThreshold !== undefined && metrics.documentCount !== undefined) {
          shouldTrigger = metrics.documentCount >= trigger.documentCountThreshold;
          reason = `Document count (${metrics.documentCount}) reached threshold (${trigger.documentCountThreshold})`;
        }
        break;

      case 'loop_iteration':
        if (trigger.loopIteration !== undefined && metrics.loopIteration !== undefined) {
          shouldTrigger = metrics.loopIteration >= trigger.loopIteration;
          reason = `Loop iteration (${metrics.loopIteration}) reached threshold (${trigger.loopIteration})`;
        }
        break;

      case 'manual':
        // Manual triggers are handled separately
        shouldTrigger = false;
        break;
    }

    if (shouldTrigger) {
      return {
        shouldDuplicate: true,
        triggeredBy: trigger,
        reason,
        metrics
      };
    }
  }

  return {
    shouldDuplicate: false,
    triggeredBy: null,
    reason: 'No triggers activated',
    metrics
  };
}

/**
 * Helper to create a default trigger configuration
 */
export function createDefaultTrigger(type: DuplicationTriggerType): DuplicationTrigger {
  const baseConfig: DuplicationTrigger = {
    id: `trigger-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    type,
    enabled: true,
    duplicateCount: 1,
    preserveContext: true,
    preserveAutoRunDocs: true,
    groupDuplicates: true,
    distributeTasks: false,
    sequentialExecution: false
  };

  // Set sensible defaults based on trigger type
  switch (type) {
    case 'task_count':
      return { ...baseConfig, taskCountThreshold: 10 };
    case 'time_elapsed':
      return { ...baseConfig, timeElapsedMs: 30 * 60 * 1000 }; // 30 minutes
    case 'context_threshold':
      return { ...baseConfig, contextPercentage: 80 };
    case 'cost_threshold':
      return { ...baseConfig, costThreshold: 5.0 };
    case 'document_count':
      return { ...baseConfig, documentCountThreshold: 5 };
    case 'loop_iteration':
      return { ...baseConfig, loopIteration: 3 };
    case 'manual':
      return baseConfig;
    default:
      return baseConfig;
  }
}

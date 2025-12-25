// Unit tests for Auto Run duplication service

import { AutoRunDuplicationService } from '../../../renderer/services/autoRunDuplication';
import type { AutoRunDuplicationConfig } from '../../../shared/autoRunDuplication';
import type { Session, BatchRunState } from '../../../renderer/types';

// Mock session and batch state helpers
function createMockSession(overrides?: Partial<Session>): Session {
  return {
    id: 'test-session',
    contextUsage: 50,
    usageStats: {
      totalCostUsd: 1.0,
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      contextWindow: 200000
    },
    ...overrides
  } as Session;
}

function createMockBatchState(overrides?: Partial<BatchRunState>): BatchRunState {
  return {
    isRunning: true,
    isStopping: false,
    completedTasksAcrossAllDocs: 5,
    accumulatedElapsedMs: 10000,
    documents: [{ id: '1', filename: 'test.md', resetOnCompletion: false, isDuplicate: false }],
    loopIteration: 0,
    ...overrides
  } as BatchRunState;
}

describe('AutoRunDuplicationService', () => {
  describe('maxDuplicates Enforcement (Fix #2)', () => {
    it('should count total duplicates spawned, not just parent sessions', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        maxDuplicates: 5,
        triggers: [{
          id: 'test',
          type: 'task_count',
          enabled: true,
          taskCountThreshold: 1,
          duplicateCount: 3, // Spawns 3 duplicates per trigger
          preserveContext: true,
          preserveAutoRunDocs: true,
          groupDuplicates: true
        }]
      };

      const service = new AutoRunDuplicationService(config);
      const session1 = createMockSession({ id: 'session-1' });
      const session2 = createMockSession({ id: 'session-2' });
      const batchState = createMockBatchState({ completedTasksAcrossAllDocs: 10 });

      // First session triggers and spawns 3 duplicates
      const result1 = service.shouldDuplicate('session-1', batchState, session1);
      expect(result1.shouldDuplicate).toBe(true);

      // Manually register the instance (simulating successful duplication)
      (service as any).duplicationInstances.set('session-1', {
        id: 'instance-1',
        parentSessionId: 'session-1',
        duplicatedSessionIds: ['dup-1', 'dup-2', 'dup-3'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      // Second session should be blocked (3 already spawned, max is 5, would create 6 total)
      const result2 = service.shouldDuplicate('session-2', batchState, session2);
      expect(result2.shouldDuplicate).toBe(false);
      expect(result2.reason).toContain('Maximum duplicates limit reached (3/5)');
    });

    it('should allow duplication when under the limit', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        maxDuplicates: 10,
        triggers: [{
          id: 'test',
          type: 'task_count',
          enabled: true,
          taskCountThreshold: 1,
          duplicateCount: 2,
          preserveContext: true,
          preserveAutoRunDocs: true,
          groupDuplicates: true
        }]
      };

      const service = new AutoRunDuplicationService(config);
      const session = createMockSession();
      const batchState = createMockBatchState({ completedTasksAcrossAllDocs: 10 });

      // Register existing instance with 3 duplicates
      (service as any).duplicationInstances.set('other-session', {
        id: 'instance-1',
        parentSessionId: 'other-session',
        duplicatedSessionIds: ['dup-1', 'dup-2', 'dup-3'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      // Should allow duplication (3 existing + 2 new = 5, under limit of 10)
      const result = service.shouldDuplicate('test-session', batchState, session);
      expect(result.shouldDuplicate).toBe(true);
    });

    it('should prevent duplication when exactly at limit', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        maxDuplicates: 5,
        triggers: [{
          id: 'test',
          type: 'task_count',
          enabled: true,
          taskCountThreshold: 1,
          duplicateCount: 1,
          preserveContext: true,
          preserveAutoRunDocs: true,
          groupDuplicates: true
        }]
      };

      const service = new AutoRunDuplicationService(config);
      const session = createMockSession();
      const batchState = createMockBatchState({ completedTasksAcrossAllDocs: 10 });

      // Register instances totaling exactly the limit
      (service as any).duplicationInstances.set('session-1', {
        id: 'instance-1',
        parentSessionId: 'session-1',
        duplicatedSessionIds: ['dup-1', 'dup-2', 'dup-3'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      (service as any).duplicationInstances.set('session-2', {
        id: 'instance-2',
        parentSessionId: 'session-2',
        duplicatedSessionIds: ['dup-4', 'dup-5'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      // Should block (5 existing, limit is 5)
      const result = service.shouldDuplicate('test-session', batchState, session);
      expect(result.shouldDuplicate).toBe(false);
      expect(result.reason).toContain('Maximum duplicates limit reached (5/5)');
    });
  });

  describe('Lifecycle Management (Fix #4)', () => {
    it('should allow repeated duplication after resetting eligibility', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        triggers: [{
          id: 'test',
          type: 'task_count',
          enabled: true,
          taskCountThreshold: 5,
          duplicateCount: 1,
          preserveContext: true,
          preserveAutoRunDocs: true,
          groupDuplicates: true
        }]
      };

      const service = new AutoRunDuplicationService(config);
      const session = createMockSession();
      const batchState = createMockBatchState({ completedTasksAcrossAllDocs: 10 });

      // First duplication should succeed
      const result1 = service.shouldDuplicate('test-session', batchState, session);
      expect(result1.shouldDuplicate).toBe(true);

      // Mark as duplicated
      (service as any).duplicationInstances.set('test-session', {
        id: 'instance-1',
        parentSessionId: 'test-session',
        duplicatedSessionIds: ['dup-1'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      // Second attempt should be blocked
      const result2 = service.shouldDuplicate('test-session', batchState, session);
      expect(result2.shouldDuplicate).toBe(false);
      expect(result2.reason).toBe('Session already duplicated');

      // Reset eligibility (e.g., after batch completes)
      service.resetDuplicationEligibility('test-session');

      // Should be able to duplicate again
      const result3 = service.shouldDuplicate('test-session', batchState, session);
      expect(result3.shouldDuplicate).toBe(true);
    });

    it('should reset eligibility for multiple sessions in bulk', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        triggers: [{
          id: 'test',
          type: 'task_count',
          enabled: true,
          taskCountThreshold: 1,
          duplicateCount: 1,
          preserveContext: true,
          preserveAutoRunDocs: true,
          groupDuplicates: true
        }]
      };

      const service = new AutoRunDuplicationService(config);

      // Mark multiple sessions as duplicated
      (service as any).duplicationInstances.set('session-1', {
        id: 'instance-1',
        parentSessionId: 'session-1',
        duplicatedSessionIds: ['dup-1'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      (service as any).duplicationInstances.set('session-2', {
        id: 'instance-2',
        parentSessionId: 'session-2',
        duplicatedSessionIds: ['dup-2'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      expect(service.hasDuplicated('session-1')).toBe(true);
      expect(service.hasDuplicated('session-2')).toBe(true);

      // Reset both in bulk
      service.resetDuplicationEligibilityBulk(['session-1', 'session-2']);

      expect(service.hasDuplicated('session-1')).toBe(false);
      expect(service.hasDuplicated('session-2')).toBe(false);
    });

    it('should preserve instances not in reset list', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        triggers: []
      };

      const service = new AutoRunDuplicationService(config);

      // Mark three sessions as duplicated
      (service as any).duplicationInstances.set('session-1', {
        id: 'instance-1',
        parentSessionId: 'session-1',
        duplicatedSessionIds: ['dup-1'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      (service as any).duplicationInstances.set('session-2', {
        id: 'instance-2',
        parentSessionId: 'session-2',
        duplicatedSessionIds: ['dup-2'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      (service as any).duplicationInstances.set('session-3', {
        id: 'instance-3',
        parentSessionId: 'session-3',
        duplicatedSessionIds: ['dup-3'],
        triggeredBy: 'task_count',
        createdAt: Date.now()
      });

      // Reset only session-1 and session-2
      service.resetDuplicationEligibilityBulk(['session-1', 'session-2']);

      expect(service.hasDuplicated('session-1')).toBe(false);
      expect(service.hasDuplicated('session-2')).toBe(false);
      expect(service.hasDuplicated('session-3')).toBe(true); // Should be preserved
    });
  });

  describe('Metrics Integration', () => {
    it('should pass correct metrics to trigger evaluation', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        triggers: [{
          id: 'test',
          type: 'task_count',
          enabled: true,
          taskCountThreshold: 10,
          duplicateCount: 1,
          preserveContext: true,
          preserveAutoRunDocs: true,
          groupDuplicates: true
        }]
      };

      const service = new AutoRunDuplicationService(config);
      const session = createMockSession({
        contextUsage: 75,
        usageStats: {
          totalCostUsd: 3.5,
          inputTokens: 10000,
          outputTokens: 5000,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          contextWindow: 200000
        }
      });

      const batchState = createMockBatchState({
        completedTasksAcrossAllDocs: 15,
        accumulatedElapsedMs: 45 * 60 * 1000, // 45 minutes
        documents: [
          { id: '1', filename: 'doc1.md', resetOnCompletion: false, isDuplicate: false },
          { id: '2', filename: 'doc2.md', resetOnCompletion: false, isDuplicate: false },
          { id: '3', filename: 'doc3.md', resetOnCompletion: false, isDuplicate: false }
        ],
        loopIteration: 2
      });

      const result = service.shouldDuplicate('test-session', batchState, session);

      expect(result.metrics).toEqual({
        taskCount: 15,
        elapsedTimeMs: 45 * 60 * 1000,
        contextPercentage: 75,
        currentCost: 3.5,
        documentCount: 3,
        loopIteration: 2
      });
    });
  });
});

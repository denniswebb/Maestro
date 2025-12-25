// Unit tests for Auto Run duplication trigger evaluation and config isolation

import {
  evaluateDuplicationTriggers,
  createDefaultTrigger,
  DEFAULT_DUPLICATION_CONFIG,
  type AutoRunDuplicationConfig,
  type DuplicationTrigger
} from '../../shared/autoRunDuplication';

describe('Auto Run Duplication - Shared Logic', () => {
  describe('evaluateDuplicationTriggers', () => {
    it('should activate on task_count threshold', () => {
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

      const result = evaluateDuplicationTriggers(config, { taskCount: 10 });

      expect(result.shouldDuplicate).toBe(true);
      expect(result.triggeredBy?.type).toBe('task_count');
      expect(result.reason).toContain('Task count (10) reached threshold (10)');
    });

    it('should activate on time_elapsed threshold', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        triggers: [{
          id: 'test',
          type: 'time_elapsed',
          enabled: true,
          timeElapsedMs: 30 * 60 * 1000, // 30 minutes
          duplicateCount: 1,
          preserveContext: true,
          preserveAutoRunDocs: true,
          groupDuplicates: true
        }]
      };

      const result = evaluateDuplicationTriggers(config, { elapsedTimeMs: 31 * 60 * 1000 });

      expect(result.shouldDuplicate).toBe(true);
      expect(result.triggeredBy?.type).toBe('time_elapsed');
    });

    it('should activate on context_threshold', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        triggers: [{
          id: 'test',
          type: 'context_threshold',
          enabled: true,
          contextPercentage: 80,
          duplicateCount: 1,
          preserveContext: true,
          preserveAutoRunDocs: true,
          groupDuplicates: true
        }]
      };

      const result = evaluateDuplicationTriggers(config, { contextPercentage: 85 });

      expect(result.shouldDuplicate).toBe(true);
      expect(result.triggeredBy?.type).toBe('context_threshold');
    });

    it('should return correct metrics shape in evaluation result', () => {
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

      const result = evaluateDuplicationTriggers(config, {
        taskCount: 10,
        elapsedTimeMs: 5000,
        contextPercentage: 50,
        currentCost: 2.5,
        documentCount: 3,
        loopIteration: 1
      });

      // Verify metrics shape matches interface
      expect(result.metrics).toEqual({
        taskCount: 10,
        elapsedTimeMs: 5000,
        contextPercentage: 50,
        currentCost: 2.5,
        documentCount: 3,
        loopIteration: 1
      });

      // Verify deprecated field names are NOT present
      expect((result.metrics as any).currentTaskCount).toBeUndefined();
      expect((result.metrics as any).currentLoop).toBeUndefined();
    });

    it('should not activate when disabled', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: false,
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

      const result = evaluateDuplicationTriggers(config, { taskCount: 100 });

      expect(result.shouldDuplicate).toBe(false);
      expect(result.reason).toBe('Auto Run duplication is disabled');
    });

    it('should not activate when no triggers configured', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        triggers: []
      };

      const result = evaluateDuplicationTriggers(config, { taskCount: 100 });

      expect(result.shouldDuplicate).toBe(false);
      expect(result.reason).toBe('No duplication triggers configured');
    });

    it('should not activate when trigger is disabled', () => {
      const config: AutoRunDuplicationConfig = {
        enabled: true,
        triggers: [{
          id: 'test',
          type: 'task_count',
          enabled: false, // Disabled
          taskCountThreshold: 10,
          duplicateCount: 1,
          preserveContext: true,
          preserveAutoRunDocs: true,
          groupDuplicates: true
        }]
      };

      const result = evaluateDuplicationTriggers(config, { taskCount: 100 });

      expect(result.shouldDuplicate).toBe(false);
    });
  });

  describe('createDefaultTrigger', () => {
    it('should create task_count trigger with sensible defaults', () => {
      const trigger = createDefaultTrigger('task_count');

      expect(trigger.type).toBe('task_count');
      expect(trigger.taskCountThreshold).toBe(10);
      expect(trigger.duplicateCount).toBe(1);
      expect(trigger.preserveContext).toBe(true);
      expect(trigger.preserveAutoRunDocs).toBe(true);
      expect(trigger.groupDuplicates).toBe(true);
    });

    it('should create unique IDs for each trigger', () => {
      const trigger1 = createDefaultTrigger('task_count');
      const trigger2 = createDefaultTrigger('task_count');

      expect(trigger1.id).not.toBe(trigger2.id);
    });
  });

  describe('Config Isolation (Fix #1)', () => {
    it('should not share nested objects across default configs', () => {
      // Simulate what the IPC handler does - get default config twice
      const config1 = structuredClone(DEFAULT_DUPLICATION_CONFIG);
      const config2 = structuredClone(DEFAULT_DUPLICATION_CONFIG);

      // Modify one config's triggers array
      config1.triggers.push(createDefaultTrigger('task_count'));

      // Verify the other config is unaffected
      expect(config1.triggers.length).toBe(1);
      expect(config2.triggers.length).toBe(0);

      // Verify they don't share the same array reference
      expect(config1.triggers).not.toBe(config2.triggers);
    });

    it('should isolate config modifications across sessions', () => {
      // Simulate multiple sessions getting default configs
      const sessionAConfig = structuredClone(DEFAULT_DUPLICATION_CONFIG);
      const sessionBConfig = structuredClone(DEFAULT_DUPLICATION_CONFIG);

      // Session A enables duplication
      sessionAConfig.enabled = true;
      sessionAConfig.maxDuplicates = 10;

      // Session B should still have default values
      expect(sessionBConfig.enabled).toBe(false);
      expect(sessionBConfig.maxDuplicates).toBe(5);
    });
  });
});

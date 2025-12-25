// IPC handlers for Auto Run agent duplication
import { ipcMain } from 'electron';
import Store from 'electron-store';
import type { AutoRunDuplicationConfig, DuplicationTrigger } from '../../../shared/autoRunDuplication';
import { DEFAULT_DUPLICATION_CONFIG, createDefaultTrigger } from '../../../shared/autoRunDuplication';

/**
 * Storage schema for duplication configurations
 * Stored per-session for independent duplication settings
 */
interface DuplicationStorage {
  configs: Record<string, AutoRunDuplicationConfig>; // Keyed by sessionId
}

const store = new Store<DuplicationStorage>({
  name: 'autorun-duplication',
  defaults: {
    configs: {}
  }
});

/**
 * Register Auto Run duplication IPC handlers
 */
export function registerDuplicationHandlers(): void {
  /**
   * Get duplication configuration for a session
   */
  ipcMain.handle(
    'duplication:getConfig',
    async (_event, sessionId: string): Promise<{ success: boolean; config?: AutoRunDuplicationConfig; error?: string }> => {
      try {
        const configs = store.get('configs', {});
        const config = configs[sessionId] || structuredClone(DEFAULT_DUPLICATION_CONFIG);

        return { success: true, config };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Update duplication configuration for a session
   */
  ipcMain.handle(
    'duplication:setConfig',
    async (_event, sessionId: string, config: AutoRunDuplicationConfig): Promise<{ success: boolean; error?: string }> => {
      try {
        const configs = store.get('configs', {});
        configs[sessionId] = config;
        store.set('configs', configs);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Add a trigger to session's duplication config
   */
  ipcMain.handle(
    'duplication:addTrigger',
    async (_event, sessionId: string, trigger: DuplicationTrigger): Promise<{ success: boolean; error?: string }> => {
      try {
        const configs = store.get('configs', {});
        const config = configs[sessionId] || structuredClone(DEFAULT_DUPLICATION_CONFIG);

        config.triggers.push(trigger);
        configs[sessionId] = config;
        store.set('configs', configs);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Update a specific trigger in session's duplication config
   */
  ipcMain.handle(
    'duplication:updateTrigger',
    async (_event, sessionId: string, triggerId: string, updates: Partial<DuplicationTrigger>): Promise<{ success: boolean; error?: string }> => {
      try {
        const configs = store.get('configs', {});
        const config = configs[sessionId];

        if (!config) {
          return { success: false, error: 'No configuration found for session' };
        }

        const triggerIndex = config.triggers.findIndex(t => t.id === triggerId);
        if (triggerIndex === -1) {
          return { success: false, error: 'Trigger not found' };
        }

        config.triggers[triggerIndex] = {
          ...config.triggers[triggerIndex],
          ...updates
        };

        configs[sessionId] = config;
        store.set('configs', configs);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Remove a trigger from session's duplication config
   */
  ipcMain.handle(
    'duplication:removeTrigger',
    async (_event, sessionId: string, triggerId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const configs = store.get('configs', {});
        const config = configs[sessionId];

        if (!config) {
          return { success: false, error: 'No configuration found for session' };
        }

        config.triggers = config.triggers.filter(t => t.id !== triggerId);
        configs[sessionId] = config;
        store.set('configs', configs);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Delete all duplication config for a session
   */
  ipcMain.handle(
    'duplication:deleteConfig',
    async (_event, sessionId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const configs = store.get('configs', {});
        delete configs[sessionId];
        store.set('configs', configs);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Create a default trigger configuration
   */
  ipcMain.handle(
    'duplication:createDefaultTrigger',
    async (_event, triggerType: string) => {
      try {
        const trigger = createDefaultTrigger(triggerType as any);
        return { success: true, trigger };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Get all session configurations (for debugging/management)
   */
  ipcMain.handle(
    'duplication:getAllConfigs',
    async (): Promise<{ success: boolean; configs?: Record<string, AutoRunDuplicationConfig>; error?: string }> => {
      try {
        const configs = store.get('configs', {});
        return { success: true, configs };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * Clear all duplication configurations (for testing/reset)
   */
  ipcMain.handle(
    'duplication:clearAll',
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        store.set('configs', {});
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
}

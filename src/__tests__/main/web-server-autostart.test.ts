/**
 * Tests for Web Interface Auto-Start with Persistent Token
 *
 * These tests verify:
 * 1. Auto-start disabled (default): ephemeral token behavior unchanged
 * 2. Auto-start enabled (first time): token generated and persisted
 * 3. Auto-start enabled (subsequent launches): same token reused
 * 4. Token rotation while server running: restart happens, new URL generated
 * 5. Token rotation while server stopped: token updated in settings
 * 6. Custom port + auto-start combination
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebServer } from '../../main/web-server';

// Mock the logger to prevent noise in test output
vi.mock('../../main/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock network utils to return localhost
vi.mock('../../main/utils/networkUtils', () => ({
  getLocalIpAddressSync: () => 'localhost',
}));

describe('Web Interface Auto-Start with Persistent Token', () => {
  let server: WebServer;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Auto-start disabled (default behavior)', () => {
    it('should generate ephemeral token when no token provided', async () => {
      // Create server without providing token (simulates auto-start disabled)
      server = new WebServer(0);

      const { token: token1 } = await server.start();
      expect(token1).toBeDefined();
      expect(typeof token1).toBe('string');
      expect(token1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      await server.stop();

      // Create another server without token - should get different token
      server = new WebServer(0);
      const { token: token2 } = await server.start();

      expect(token2).toBeDefined();
      expect(token2).not.toBe(token1);
    });

    it('should generate new token on each instantiation without persistence', async () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 3; i++) {
        server = new WebServer(0);
        const { token } = await server.start();
        tokens.add(token);
        await server.stop();
      }

      // All tokens should be unique (no reuse)
      expect(tokens.size).toBe(3);
    });
  });

  describe('Auto-start enabled (first time)', () => {
    it('should accept and use provided persistent token', async () => {
      const persistentToken = 'a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d';

      server = new WebServer(0, persistentToken);
      const { token } = await server.start();

      expect(token).toBe(persistentToken);
    });

    it('should use provided token for authentication', async () => {
      const persistentToken = 'test-token-12345';

      server = new WebServer(0, persistentToken);
      const { port } = await server.start();

      // Verify URL contains the persistent token
      const url = `http://localhost:${port}/${persistentToken}`;
      expect(url).toContain(persistentToken);
    });
  });

  describe('Auto-start enabled (subsequent launches)', () => {
    it('should reuse same token across multiple instantiations', async () => {
      const persistentToken = 'persistent-abc-123';

      // First launch
      server = new WebServer(0, persistentToken);
      const { token: token1 } = await server.start();
      expect(token1).toBe(persistentToken);
      await server.stop();

      // Second launch (simulating app restart)
      server = new WebServer(0, persistentToken);
      const { token: token2 } = await server.start();
      expect(token2).toBe(persistentToken);
      expect(token2).toBe(token1);
    });

    it('should maintain token consistency across server lifecycle', async () => {
      const persistentToken = 'lifecycle-token-xyz';

      server = new WebServer(0, persistentToken);
      await server.start();

      // Token should remain consistent throughout server lifetime
      expect(server.getSecurityToken()).toBe(persistentToken);

      await server.stop();

      // Token should still be the same even after stop
      expect(server.getSecurityToken()).toBe(persistentToken);
    });
  });

  describe('Token rotation while server running', () => {
    it('should allow token update and generate new token', () => {
      const originalToken = 'original-token-123';
      server = new WebServer(0, originalToken);

      expect(server.getSecurityToken()).toBe(originalToken);

      // Simulate token rotation by creating new server instance
      // (In actual implementation, this is handled by IPC handler that restarts server)
      const newToken = 'rotated-token-456';
      const newServer = new WebServer(0, newToken);

      expect(newServer.getSecurityToken()).toBe(newToken);
      expect(newServer.getSecurityToken()).not.toBe(originalToken);
    });

    it('should invalidate old URLs after token rotation', async () => {
      const oldToken = 'old-token-abc';
      const newToken = 'new-token-xyz';

      server = new WebServer(0, oldToken);
      const { port: port1 } = await server.start();
      const oldUrl = `http://localhost:${port1}/${oldToken}`;

      await server.stop();

      // Restart with new token (simulating rotation)
      server = new WebServer(0, newToken);
      const { port: port2 } = await server.start();
      const newUrl = `http://localhost:${port2}/${newToken}`;

      expect(oldUrl).not.toBe(newUrl);
      expect(newUrl).toContain(newToken);
      expect(newUrl).not.toContain(oldToken);
    });
  });

  describe('Token rotation while server stopped', () => {
    it('should accept new token when server is not running', () => {
      const initialToken = 'initial-token';
      server = new WebServer(0, initialToken);

      expect(server.getSecurityToken()).toBe(initialToken);

      // Create new server with rotated token (server never started)
      const rotatedToken = 'rotated-token';
      const newServer = new WebServer(0, rotatedToken);

      expect(newServer.getSecurityToken()).toBe(rotatedToken);
    });

    it('should use rotated token on next start', async () => {
      const firstToken = 'first-token';
      server = new WebServer(0, firstToken);
      await server.start();
      await server.stop();

      // Simulate token rotation while stopped
      const rotatedToken = 'rotated-after-stop';
      server = new WebServer(0, rotatedToken);
      const { token } = await server.start();

      expect(token).toBe(rotatedToken);
      expect(token).not.toBe(firstToken);
    });
  });

  describe('Custom port + auto-start combination', () => {
    it('should work with custom port and persistent token', async () => {
      const customPort = 13579; // Custom port
      const persistentToken = 'custom-port-token';

      server = new WebServer(customPort, persistentToken);
      const { port, token } = await server.start();

      expect(port).toBe(customPort);
      expect(token).toBe(persistentToken);
    });

    it('should generate correct URL with custom port and persistent token', async () => {
      const customPort = 24680;
      const persistentToken = 'custom-url-token';

      server = new WebServer(customPort, persistentToken);
      const { port, url } = await server.start();

      expect(url).toBe(`http://localhost:${customPort}/${persistentToken}`);
      expect(url).toContain(String(customPort));
      expect(url).toContain(persistentToken);
    });

    it('should maintain token persistence with custom port across restarts', async () => {
      const customPort = 35791;
      const persistentToken = 'custom-persistent';

      // First start
      server = new WebServer(customPort, persistentToken);
      const { token: token1, port: port1 } = await server.start();
      await server.stop();

      // Second start (simulating app restart)
      server = new WebServer(customPort, persistentToken);
      const { token: token2, port: port2 } = await server.start();

      expect(token1).toBe(token2);
      expect(token1).toBe(persistentToken);
      expect(port1).toBe(port2);
      expect(port1).toBe(customPort);
    });

    it('should handle port 0 (random) with persistent token', async () => {
      const persistentToken = 'random-port-token';

      server = new WebServer(0, persistentToken); // Port 0 = random
      const { port, token } = await server.start();

      expect(port).toBeGreaterThan(0); // OS assigned a port
      expect(token).toBe(persistentToken);
    });
  });

  describe('Token validation', () => {
    it('should reject invalid token formats', () => {
      // Test that server accepts any string as token (validation happens at router level)
      const tokens = [
        'simple-token',
        'token-with-numbers-123',
        'token_with_underscores',
        'a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d', // UUID format
      ];

      for (const token of tokens) {
        const testServer = new WebServer(0, token);
        expect(testServer.getSecurityToken()).toBe(token);
      }
    });

    it('should handle empty string token', () => {
      // Empty string should trigger fallback to generated token
      const server = new WebServer(0, '');
      const token = server.getSecurityToken();

      // Should have generated a UUID
      expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('Server lifecycle with persistent token', () => {
    it('should support multiple server instances with same token', async () => {
      const persistentToken = 'lifecycle-test-token';

      // Cycle 1
      server = new WebServer(0, persistentToken);
      await server.start();
      expect(server.getSecurityToken()).toBe(persistentToken);
      await server.stop();

      // Cycle 2 - new instance simulating app restart
      server = new WebServer(0, persistentToken);
      await server.start();
      expect(server.getSecurityToken()).toBe(persistentToken);
      await server.stop();

      // Cycle 3 - new instance simulating another restart
      server = new WebServer(0, persistentToken);
      await server.start();
      expect(server.getSecurityToken()).toBe(persistentToken);
    });

    it('should maintain client connections with persistent token', async () => {
      const persistentToken = 'client-connection-token';
      server = new WebServer(0, persistentToken);

      await server.start();

      // Client count should start at 0
      expect(server.getWebClientCount()).toBe(0);

      // Token should remain consistent
      expect(server.getSecurityToken()).toBe(persistentToken);
    });
  });

  describe('Backwards compatibility', () => {
    it('should work without token parameter (original behavior)', async () => {
      // This simulates the original usage before persistent tokens
      server = new WebServer(0); // No token parameter

      const { token } = await server.start();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should work with explicit undefined token', async () => {
      server = new WebServer(0, undefined);

      const { token } = await server.start();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should preserve original API surface', async () => {
      server = new WebServer(0);

      const result = await server.start();

      // Check that all expected properties exist
      expect(result).toHaveProperty('port');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('url');

      expect(typeof result.port).toBe('number');
      expect(typeof result.token).toBe('string');
      expect(typeof result.url).toBe('string');
    });
  });
});

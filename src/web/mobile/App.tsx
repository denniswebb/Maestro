/**
 * Maestro Mobile Web App
 *
 * Lightweight remote control interface for mobile devices.
 * Focused on quick command input and session monitoring.
 *
 * Phase 1 implementation will expand this component.
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useThemeColors } from '../components/ThemeProvider';
import { useWebSocket, type WebSocketState } from '../hooks/useWebSocket';
import { Badge, type BadgeVariant } from '../components/Badge';
import { PullToRefreshIndicator } from '../components/PullToRefresh';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useOfflineStatus } from '../main';
import { triggerHaptic, HAPTIC_PATTERNS } from './index';

/**
 * Map WebSocket state to display properties
 */
interface ConnectionStatusConfig {
  label: string;
  variant: BadgeVariant;
  pulse: boolean;
}

const CONNECTION_STATUS_CONFIG: Record<WebSocketState | 'offline', ConnectionStatusConfig> = {
  offline: {
    label: 'Offline',
    variant: 'error',
    pulse: false,
  },
  disconnected: {
    label: 'Disconnected',
    variant: 'error',
    pulse: false,
  },
  connecting: {
    label: 'Connecting...',
    variant: 'connecting',
    pulse: true,
  },
  authenticating: {
    label: 'Authenticating...',
    variant: 'connecting',
    pulse: true,
  },
  connected: {
    label: 'Connected',
    variant: 'success',
    pulse: false,
  },
  authenticated: {
    label: 'Connected',
    variant: 'success',
    pulse: false,
  },
};

/**
 * Header component for the mobile app
 * Displays app title and connection status indicator
 */
interface MobileHeaderProps {
  connectionState: WebSocketState;
  isOffline: boolean;
  onRetry?: () => void;
}

function MobileHeader({ connectionState, isOffline, onRetry }: MobileHeaderProps) {
  const colors = useThemeColors();
  // Show offline status if device is offline, otherwise show connection state
  const effectiveState = isOffline ? 'offline' : connectionState;
  const statusConfig = CONNECTION_STATUS_CONFIG[effectiveState];

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgSidebar,
        minHeight: '56px',
      }}
    >
      <h1
        style={{
          fontSize: '18px',
          fontWeight: 600,
          margin: 0,
          color: colors.textMain,
        }}
      >
        Maestro
      </h1>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Badge
          variant={statusConfig.variant}
          badgeStyle="subtle"
          size="sm"
          pulse={statusConfig.pulse}
          onClick={!isOffline && connectionState === 'disconnected' ? onRetry : undefined}
          style={{
            cursor: !isOffline && connectionState === 'disconnected' ? 'pointer' : 'default',
          }}
        >
          {statusConfig.label}
        </Badge>
      </div>
    </header>
  );
}

/**
 * Main mobile app component with WebSocket connection management
 */
export default function MobileApp() {
  const colors = useThemeColors();
  const isOffline = useOfflineStatus();
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const { state: connectionState, connect, send, error, reconnectAttempts } = useWebSocket({
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 2000,
    handlers: {
      onConnectionChange: (newState) => {
        console.log('[Mobile] Connection state:', newState);
      },
      onError: (err) => {
        console.error('[Mobile] WebSocket error:', err);
      },
    },
  });

  // Connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Handle refresh - request updated session list
  const handleRefresh = useCallback(async () => {
    console.log('[Mobile] Pull-to-refresh triggered');

    // Provide haptic feedback
    triggerHaptic(HAPTIC_PATTERNS.tap);

    // Send request to get updated sessions
    const isConnected = connectionState === 'connected' || connectionState === 'authenticated';
    if (isConnected) {
      send({ type: 'get_sessions' });
    }

    // Simulate a minimum refresh time for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    setLastRefreshTime(new Date());

    // Provide success haptic feedback
    triggerHaptic(HAPTIC_PATTERNS.success);
  }, [connectionState, send]);

  // Pull-to-refresh hook
  const {
    pullDistance,
    progress,
    isRefreshing,
    isThresholdReached,
    containerProps,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: !isOffline && (connectionState === 'connected' || connectionState === 'authenticated'),
  });

  // Retry connection handler
  const handleRetry = useCallback(() => {
    connect();
  }, [connect]);

  // Determine content based on connection state
  const renderContent = () => {
    // Show offline state when device has no network connectivity
    if (isOffline) {
      return (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: colors.bgSidebar,
            border: `1px solid ${colors.border}`,
            maxWidth: '300px',
          }}
        >
          <h2 style={{ fontSize: '16px', marginBottom: '8px', color: colors.textMain }}>
            You're Offline
          </h2>
          <p style={{ fontSize: '14px', color: colors.textDim, marginBottom: '12px' }}>
            No internet connection. Maestro requires a network connection to communicate with your desktop app.
          </p>
          <p style={{ fontSize: '12px', color: colors.textDim }}>
            The app will automatically reconnect when you're back online.
          </p>
        </div>
      );
    }

    if (connectionState === 'disconnected') {
      return (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: colors.bgSidebar,
            border: `1px solid ${colors.border}`,
            maxWidth: '300px',
          }}
        >
          <h2 style={{ fontSize: '16px', marginBottom: '8px', color: colors.textMain }}>
            Connection Lost
          </h2>
          <p style={{ fontSize: '14px', color: colors.textDim, marginBottom: '12px' }}>
            {error || 'Unable to connect to Maestro desktop app.'}
          </p>
          {reconnectAttempts > 0 && (
            <p style={{ fontSize: '12px', color: colors.textDim, marginBottom: '12px' }}>
              Reconnection attempts: {reconnectAttempts}
            </p>
          )}
          <button
            onClick={handleRetry}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: colors.accent,
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry Connection
          </button>
        </div>
      );
    }

    if (connectionState === 'connecting' || connectionState === 'authenticating') {
      return (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: colors.bgSidebar,
            border: `1px solid ${colors.border}`,
            maxWidth: '300px',
          }}
        >
          <h2 style={{ fontSize: '16px', marginBottom: '8px', color: colors.textMain }}>
            Connecting to Maestro...
          </h2>
          <p style={{ fontSize: '14px', color: colors.textDim }}>
            Please wait while we establish a connection to your desktop app.
          </p>
        </div>
      );
    }

    // Connected or authenticated state
    return (
      <div
        style={{
          marginBottom: '24px',
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: colors.bgSidebar,
          border: `1px solid ${colors.border}`,
          maxWidth: '300px',
        }}
      >
        <h2 style={{ fontSize: '16px', marginBottom: '8px', color: colors.textMain }}>
          Mobile Remote Control
        </h2>
        <p style={{ fontSize: '14px', color: colors.textDim }}>
          Send commands to your AI assistants from anywhere. Session selector
          and command input will be added next.
        </p>
      </div>
    );
  };

  // CSS variable for dynamic viewport height with fallback
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100dvh',
    backgroundColor: colors.bgMain,
    color: colors.textMain,
  };

  return (
    <div style={containerStyle}>
      {/* Header with connection status */}
      <MobileHeader
        connectionState={connectionState}
        isOffline={isOffline}
        onRetry={handleRetry}
      />

      {/* Main content area with pull-to-refresh */}
      <main
        {...containerProps}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '20px',
          paddingTop: `${20 + pullDistance}px`,
          textAlign: 'center',
          overflow: 'auto',
          overscrollBehavior: 'contain',
          position: 'relative',
          touchAction: pullDistance > 0 ? 'none' : 'pan-y',
          transition: isRefreshing ? 'padding-top 0.3s ease' : 'none',
        }}
      >
        {/* Pull-to-refresh indicator */}
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          progress={progress}
          isRefreshing={isRefreshing}
          isThresholdReached={isThresholdReached}
          style={{
            position: 'fixed',
            top: 'max(56px, calc(56px + env(safe-area-inset-top)))',
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        />

        {/* Content wrapper to center items when not scrolling */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          {renderContent()}
          <p style={{ fontSize: '12px', color: colors.textDim }}>
            Make sure Maestro desktop app is running
          </p>
          {lastRefreshTime && (connectionState === 'connected' || connectionState === 'authenticated') && (
            <p style={{ fontSize: '11px', color: colors.textDim, marginTop: '8px' }}>
              Last updated: {lastRefreshTime.toLocaleTimeString()}
            </p>
          )}
        </div>
      </main>

      {/* Bottom input bar placeholder */}
      <footer
        style={{
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgSidebar,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <input
            type="text"
            placeholder={isOffline ? 'Offline...' : 'Enter command...'}
            disabled={isOffline || (connectionState !== 'authenticated' && connectionState !== 'connected')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: colors.bgMain,
              border: `1px solid ${colors.border}`,
              color: !isOffline && (connectionState === 'authenticated' || connectionState === 'connected')
                ? colors.textMain
                : colors.textDim,
              fontSize: '14px',
              opacity: !isOffline && (connectionState === 'authenticated' || connectionState === 'connected') ? 1 : 0.5,
            }}
          />
          <button
            disabled={isOffline || (connectionState !== 'authenticated' && connectionState !== 'connected')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: colors.accent,
              color: '#fff',
              opacity: !isOffline && (connectionState === 'authenticated' || connectionState === 'connected') ? 1 : 0.5,
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: !isOffline && (connectionState === 'authenticated' || connectionState === 'connected')
                ? 'pointer'
                : 'default',
            }}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ExternalLink, Trophy, Clock, Star, Share2, Copy, Download, Check } from 'lucide-react';
import type { Theme, ThemeMode } from '../types';
import type { ConductorBadge } from '../constants/conductorBadges';
import { useLayerStack } from '../contexts/LayerStackContext';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';
import { AnimatedMaestro } from './MaestroSilhouette';
import { formatCumulativeTime, formatTimeRemaining, getNextBadge } from '../constants/conductorBadges';

// Confetti particle type
interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  delay: number;
  shape: 'rect' | 'square' | 'circle' | 'star';
  duration: number;
}

interface StandingOvationOverlayProps {
  theme: Theme;
  themeMode: ThemeMode;
  badge: ConductorBadge;
  isNewRecord?: boolean;
  recordTimeMs?: number;
  cumulativeTimeMs: number;
  onClose: () => void;
}

/**
 * Full-screen celebration overlay for badge unlocks and new records
 * Features animated maestro, confetti-like effects, and badge information
 */
export function StandingOvationOverlay({
  theme,
  themeMode,
  badge,
  isNewRecord = false,
  recordTimeMs,
  cumulativeTimeMs,
  onClose,
}: StandingOvationOverlayProps) {
  const { registerLayer, unregisterLayer, updateLayerHandler } = useLayerStack();
  const layerIdRef = useRef<string>();
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Register with layer stack
  useEffect(() => {
    const id = registerLayer({
      type: 'modal',
      priority: MODAL_PRIORITIES.STANDING_OVATION,
      blocksLowerLayers: true,
      capturesFocus: true,
      focusTrap: 'strict',
      ariaLabel: 'Standing Ovation Achievement',
      onEscape: () => onCloseRef.current(),
    });
    layerIdRef.current = id;

    containerRef.current?.focus();

    return () => {
      if (layerIdRef.current) {
        unregisterLayer(layerIdRef.current);
      }
    };
  }, [registerLayer, unregisterLayer]);

  useEffect(() => {
    if (layerIdRef.current) {
      updateLayerHandler(layerIdRef.current, onClose);
    }
  }, [onClose, updateLayerHandler]);

  const nextBadge = getNextBadge(badge);
  const isDark = themeMode === 'dark';
  const maestroVariant = isDark ? 'light' : 'dark';
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Accent colors
  const goldColor = '#FFD700';
  const purpleAccent = theme.colors.accent;

  // Generate confetti particles - Ray Cast style explosion with multiple waves
  const confettiParticles = useMemo<ConfettiParticle[]>(() => {
    const particles: ConfettiParticle[] = [];
    const colors = [
      goldColor, purpleAccent,
      '#FF6B6B', '#FF8E53', '#FFA726', // Warm colors
      '#4ECDC4', '#45B7D1', '#64B5F6', // Cool colors
      '#96CEB4', '#81C784', // Greens
      '#FFEAA7', '#FFD54F', // Yellows
      '#DDA0DD', '#BA68C8', '#9575CD', // Purples
      '#F48FB1', '#FF80AB', // Pinks
      '#FFFFFF', '#E0E0E0', // Whites/silvers
    ];

    // Multiple burst waves for that explosive Ray Cast feel
    const waves = [
      { count: 400, speedMin: 600, speedMax: 1200, delayBase: 0, delaySpread: 0.1 },    // Initial explosion
      { count: 300, speedMin: 400, speedMax: 900, delayBase: 0.05, delaySpread: 0.15 }, // Second wave
      { count: 200, speedMin: 300, speedMax: 700, delayBase: 0.1, delaySpread: 0.2 },   // Third wave
      { count: 150, speedMin: 200, speedMax: 500, delayBase: 0.2, delaySpread: 0.3 },   // Slower trailing pieces
      { count: 100, speedMin: 100, speedMax: 300, delayBase: 0.3, delaySpread: 0.5 },   // Floaty pieces
    ];

    let id = 0;

    const shapes: Array<'rect' | 'square' | 'circle' | 'star'> = ['rect', 'rect', 'rect', 'square', 'square', 'circle', 'star'];

    for (const wave of waves) {
      for (let i = 0; i < wave.count; i++) {
        // Random angle for burst direction (full 360 degrees)
        const angle = Math.random() * Math.PI * 2;
        // Random speed within wave's range
        const speed = wave.speedMin + Math.random() * (wave.speedMax - wave.speedMin);
        // Add some vertical bias for gravity feel
        const gravityBias = Math.random() * 150;

        particles.push({
          id: id++,
          x: 50 + (Math.random() - 0.5) * 5, // Slight spread from center
          y: 50 + (Math.random() - 0.5) * 5,
          rotation: Math.random() * 360,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.random() * 12, // Varied sizes
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed + gravityBias,
          rotationSpeed: (Math.random() - 0.5) * 1080, // More spin
          delay: wave.delayBase + Math.random() * wave.delaySpread,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          duration: 2.5 + Math.random() * 2.5, // 2.5-5 seconds
        });
      }
    }

    return particles;
  }, [purpleAccent]);

  // Generate shareable achievement card as canvas
  const generateShareImage = useCallback(async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Card dimensions
    const width = 600;
    const height = 400;
    canvas.width = width;
    canvas.height = height;

    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGradient;
    ctx.roundRect(0, 0, width, height, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = goldColor;
    ctx.lineWidth = 3;
    ctx.roundRect(0, 0, width, height, 16);
    ctx.stroke();

    // Header accent
    const headerGradient = ctx.createLinearGradient(0, 0, width, 100);
    headerGradient.addColorStop(0, `${purpleAccent}40`);
    headerGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 100);

    // Trophy icon (simplified circle)
    ctx.beginPath();
    ctx.arc(width / 2, 60, 30, 0, Math.PI * 2);
    const trophyGradient = ctx.createRadialGradient(width / 2, 60, 0, width / 2, 60, 30);
    trophyGradient.addColorStop(0, '#FFA500');
    trophyGradient.addColorStop(1, goldColor);
    ctx.fillStyle = trophyGradient;
    ctx.fill();

    // Trophy text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', width / 2, 70);

    // "Standing Ovation" title
    ctx.font = 'bold 24px system-ui';
    ctx.fillStyle = goldColor;
    ctx.textAlign = 'center';
    ctx.fillText('STANDING OVATION', width / 2, 120);

    // Achievement type
    ctx.font = '16px system-ui';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(isNewRecord ? 'New Personal Record!' : 'Achievement Unlocked!', width / 2, 145);

    // Level badge
    ctx.font = 'bold 18px system-ui';
    ctx.fillStyle = goldColor;
    ctx.fillText(`⭐ Level ${badge.level} ⭐`, width / 2, 180);

    // Badge name
    ctx.font = 'bold 28px system-ui';
    ctx.fillStyle = purpleAccent;
    ctx.fillText(badge.name, width / 2, 215);

    // Flavor text
    ctx.font = 'italic 14px system-ui';
    ctx.fillStyle = '#CCCCCC';
    const flavorLines = wrapText(ctx, `"${badge.flavorText}"`, width - 80);
    let yOffset = 250;
    flavorLines.forEach(line => {
      ctx.fillText(line, width / 2, yOffset);
      yOffset += 18;
    });

    // Stats box
    const statsY = 300;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.roundRect(50, statsY - 10, width - 100, 50, 8);
    ctx.fill();

    ctx.font = '14px system-ui';
    ctx.fillStyle = '#AAAAAA';
    ctx.textAlign = 'left';
    ctx.fillText('Total AutoRun:', 70, statsY + 15);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText(formatCumulativeTime(cumulativeTimeMs), 180, statsY + 15);

    if (recordTimeMs) {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('Longest Run:', 350, statsY + 15);
      ctx.fillStyle = isNewRecord ? goldColor : '#FFFFFF';
      ctx.font = 'bold 14px system-ui';
      ctx.fillText(formatCumulativeTime(recordTimeMs), 450, statsY + 15);
    }

    // Footer branding
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.fillText('MAESTRO • Agent Orchestration Command Center', width / 2, height - 20);

    return canvas;
  }, [badge, cumulativeTimeMs, recordTimeMs, isNewRecord, purpleAccent]);

  // Helper to wrap text
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      const canvas = await generateShareImage();
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [generateShareImage]);

  // Download as image
  const downloadImage = useCallback(async () => {
    try {
      const canvas = await generateShareImage();
      const link = document.createElement('a');
      link.download = `maestro-achievement-level-${badge.level}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [generateShareImage, badge.level]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center z-[99999] animate-in fade-in duration-500"
      role="dialog"
      aria-modal="true"
      aria-label="Standing Ovation Achievement"
      tabIndex={-1}
      onClick={onClose}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
      }}
    >
      {/* Confetti burst effect - behind the modal (z-index: 0) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {confettiParticles.map((particle) => {
          // Determine shape styling
          let width: string;
          let height: string;
          let borderRadius: string;
          let boxShadow: string;

          switch (particle.shape) {
            case 'circle':
              width = `${particle.size}px`;
              height = `${particle.size}px`;
              borderRadius = '50%';
              boxShadow = `0 0 ${particle.size / 2}px ${particle.color}40`;
              break;
            case 'square':
              width = `${particle.size}px`;
              height = `${particle.size}px`;
              borderRadius = '2px';
              boxShadow = `0 0 ${particle.size / 3}px ${particle.color}30`;
              break;
            case 'star':
              width = `${particle.size}px`;
              height = `${particle.size}px`;
              borderRadius = '0';
              boxShadow = `0 0 ${particle.size}px ${particle.color}60`;
              break;
            case 'rect':
            default:
              width = `${particle.size}px`;
              height = `${particle.size * 0.4}px`;
              borderRadius = '1px';
              boxShadow = 'none';
              break;
          }

          return (
            <div
              key={particle.id}
              className="absolute"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width,
                height,
                backgroundColor: particle.color,
                borderRadius,
                boxShadow,
                transform: `rotate(${particle.rotation}deg)`,
                opacity: 0,
                animation: `confetti-burst ${particle.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${particle.delay}s forwards`,
                // CSS custom properties for the animation
                '--vx': `${particle.velocityX}px`,
                '--vy': `${particle.velocityY}px`,
                '--rot': `${particle.rotationSpeed}deg`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>

      {/* Keyframe animation style - enhanced physics */}
      <style>{`
        @keyframes confetti-burst {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          10% {
            opacity: 1;
          }
          50% {
            opacity: 0.9;
          }
          80% {
            opacity: 0.5;
          }
          100% {
            opacity: 0;
            transform: translate(var(--vx), calc(var(--vy) + 600px)) rotate(var(--rot)) scale(0.5);
          }
        }
      `}</style>

      {/* Main content card - z-index: 1 to be above confetti */}
      <div
        className="relative max-w-lg w-full mx-4 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.colors.bgSidebar,
          border: `2px solid ${goldColor}`,
          boxShadow: `0 0 40px rgba(0, 0, 0, 0.5)`,
          zIndex: 1,
        }}
      >
        {/* Header with glow */}
        <div
          className="relative px-8 pt-8 pb-4 text-center"
          style={{
            background: `linear-gradient(180deg, ${purpleAccent}20 0%, transparent 100%)`,
          }}
        >
          {/* Trophy icon */}
          <div className="flex justify-center mb-4">
            <div
              className="relative p-4 rounded-full animate-bounce"
              style={{
                background: `linear-gradient(135deg, ${goldColor} 0%, #FFA500 100%)`,
                boxShadow: `0 0 30px ${goldColor}60`,
              }}
            >
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-3xl font-bold tracking-wider mb-2"
            style={{
              color: goldColor,
              textShadow: `0 0 20px ${goldColor}60`,
            }}
          >
            STANDING OVATION
          </h1>

          <p className="text-lg" style={{ color: theme.colors.textMain }}>
            {isNewRecord ? 'New Personal Record!' : 'Achievement Unlocked!'}
          </p>
        </div>

        {/* Maestro silhouette */}
        <div className="flex justify-center py-4">
          <div
            className="relative"
            style={{
              filter: `drop-shadow(0 0 20px ${purpleAccent}60)`,
            }}
          >
            <AnimatedMaestro
              variant={maestroVariant}
              size={160}
            />
          </div>
        </div>

        {/* Badge info */}
        <div className="px-8 pb-6 text-center">
          {/* Badge name */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-5 h-5" style={{ color: goldColor }} />
            <span
              className="text-xl font-bold"
              style={{ color: theme.colors.textMain }}
            >
              Level {badge.level}
            </span>
            <Star className="w-5 h-5" style={{ color: goldColor }} />
          </div>

          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: purpleAccent }}
          >
            {badge.name}
          </h2>

          <p
            className="text-sm mb-4 leading-relaxed"
            style={{ color: theme.colors.textDim }}
          >
            {badge.description}
          </p>

          {/* Flavor text */}
          <p
            className="text-sm italic mb-4"
            style={{ color: theme.colors.textMain, opacity: 0.8 }}
          >
            "{badge.flavorText}"
          </p>

          {/* Example conductor */}
          <div
            className="p-3 rounded-lg mb-4"
            style={{
              backgroundColor: theme.colors.bgActivity,
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            <p className="text-xs mb-1" style={{ color: theme.colors.textDim }}>
              Example Maestro
            </p>
            <p className="font-medium" style={{ color: theme.colors.textMain }}>
              {badge.exampleConductor.name}
            </p>
            <p className="text-xs" style={{ color: theme.colors.textDim }}>
              {badge.exampleConductor.era}
            </p>
            <p className="text-xs mt-1" style={{ color: theme.colors.textDim }}>
              {badge.exampleConductor.achievement}
            </p>
            <button
              onClick={() => window.maestro.shell.openExternal(badge.exampleConductor.wikipediaUrl)}
              className="inline-flex items-center gap-1 text-xs mt-2 hover:underline"
              style={{ color: purpleAccent }}
            >
              <ExternalLink className="w-3 h-3" />
              Learn more on Wikipedia
            </button>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-2 gap-4 p-3 rounded-lg mb-4"
            style={{
              backgroundColor: theme.colors.bgActivity,
              border: `1px solid ${theme.colors.border}`,
            }}
          >
            <div>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3 h-3" style={{ color: theme.colors.textDim }} />
                <span className="text-xs" style={{ color: theme.colors.textDim }}>
                  Total AutoRun
                </span>
              </div>
              <span className="font-mono font-bold" style={{ color: theme.colors.textMain }}>
                {formatCumulativeTime(cumulativeTimeMs)}
              </span>
            </div>
            {recordTimeMs && (
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="w-3 h-3" style={{ color: goldColor }} />
                  <span className="text-xs" style={{ color: theme.colors.textDim }}>
                    {isNewRecord ? 'New Record' : 'Longest Run'}
                  </span>
                </div>
                <span
                  className="font-mono font-bold"
                  style={{ color: isNewRecord ? goldColor : theme.colors.textMain }}
                >
                  {formatCumulativeTime(recordTimeMs)}
                </span>
              </div>
            )}
          </div>

          {/* Next level info */}
          {nextBadge && (
            <div className="text-xs" style={{ color: theme.colors.textDim }}>
              <span>Next: </span>
              <span style={{ color: purpleAccent }}>{nextBadge.name}</span>
              <span> • {formatTimeRemaining(cumulativeTimeMs, nextBadge)}</span>
            </div>
          )}

          {!nextBadge && (
            <div className="text-xs" style={{ color: goldColor }}>
              You have achieved the highest rank! A true Titan of the Baton.
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="px-8 pb-8 space-y-3">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg font-medium transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${purpleAccent} 0%, ${goldColor} 100%)`,
              color: '#FFFFFF',
              boxShadow: `0 4px 20px ${purpleAccent}40`,
            }}
          >
            Take a Bow
          </button>

          {/* Share options */}
          <div className="relative">
            <button
              onClick={() => setShareMenuOpen(!shareMenuOpen)}
              className="w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 hover:opacity-90"
              style={{
                backgroundColor: theme.colors.bgActivity,
                color: theme.colors.textMain,
                border: `1px solid ${theme.colors.border}`,
              }}
            >
              <Share2 className="w-4 h-4" />
              Share Achievement
            </button>

            {shareMenuOpen && (
              <div
                className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-lg shadow-xl"
                style={{
                  backgroundColor: theme.colors.bgSidebar,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <button
                  onClick={() => {
                    copyToClipboard();
                    setShareMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 transition-colors"
                >
                  {copySuccess ? (
                    <Check className="w-4 h-4" style={{ color: theme.colors.success }} />
                  ) : (
                    <Copy className="w-4 h-4" style={{ color: theme.colors.textDim }} />
                  )}
                  <span style={{ color: theme.colors.textMain }}>
                    {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    downloadImage();
                    setShareMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-white/10 transition-colors"
                >
                  <Download className="w-4 h-4" style={{ color: theme.colors.textDim }} />
                  <span style={{ color: theme.colors.textMain }}>Save as Image</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StandingOvationOverlay;

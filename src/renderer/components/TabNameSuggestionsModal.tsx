import React, { useState, useEffect } from 'react';
import type { Theme } from '../types';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';
import { Modal } from './ui/Modal';
import { Sparkles, Check } from 'lucide-react';

interface TabNameSuggestionsModalProps {
  theme: Theme;
  suggestions: string[];
  currentName: string;
  onClose: () => void;
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
}

/**
 * Modal that presents 3 AI-generated tab name suggestions for the user to choose from.
 * Shows current tab name, presents suggestions as clickable cards, and includes keyboard navigation.
 */
export function TabNameSuggestionsModal(props: TabNameSuggestionsModalProps) {
  const { theme, suggestions, currentName, onClose, onSelect, isLoading = false } = props;
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading || suggestions.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex]);
        }
      } else if (e.key >= '1' && e.key <= '3') {
        // Number keys 1-3 for quick selection
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (suggestions[index]) {
          onSelect(suggestions[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, suggestions, selectedIndex, onSelect]);

  return (
    <Modal
      theme={theme}
      title="Choose Tab Name"
      priority={MODAL_PRIORITIES.TAB_NAME_SUGGESTIONS}
      onClose={onClose}
      width={500}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Current name display */}
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: theme.colors.bgActivity,
          borderLeft: `3px solid ${theme.colors.textDim}`,
        }}>
          <div style={{
            fontSize: '11px',
            color: theme.colors.textDim,
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Current Name
          </div>
          <div style={{
            fontSize: '14px',
            color: theme.colors.textMain,
            fontWeight: 500,
          }}>
            {currentName || 'Untitled'}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '32px',
            color: theme.colors.textDim,
          }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: `3px solid ${theme.colors.bgActivity}`,
                borderTopColor: theme.colors.accent,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ fontSize: '14px', fontStyle: 'italic' }}>
              Generating name suggestions...
            </div>
          </div>
        )}

        {/* Suggestions */}
        {!isLoading && suggestions.length > 0 && (
          <>
            <div style={{
              fontSize: '11px',
              color: theme.colors.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              AI Suggestions (Click or Press 1-3)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggestions.map((suggestion, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={index}
                    onClick={() => onSelect(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '6px',
                      backgroundColor: isSelected
                        ? theme.colors.bgActivity
                        : theme.colors.bgMain,
                      border: `2px solid ${isSelected ? theme.colors.accent : 'transparent'}`,
                      color: theme.colors.textMain,
                      fontSize: '14px',
                      fontWeight: isSelected ? 500 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                      width: '100%',
                      outline: 'none',
                    }}
                    onFocus={() => setSelectedIndex(index)}
                    tabIndex={0}
                  >
                    {/* Number indicator */}
                    <div style={{
                      minWidth: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? theme.colors.accent : theme.colors.bgActivity,
                      color: isSelected ? theme.colors.accentForeground : theme.colors.textDim,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {index + 1}
                    </div>

                    {/* Suggestion text */}
                    <div style={{ flex: 1 }}>
                      {suggestion}
                    </div>

                    {/* Checkmark for selected */}
                    {isSelected && (
                      <Check size={18} style={{ color: theme.colors.accent }} />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Error state */}
        {!isLoading && suggestions.length === 0 && (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: theme.colors.textDim,
            fontSize: '14px',
          }}>
            No suggestions available. Please try again.
          </div>
        )}

        {/* Keyboard hint */}
        {!isLoading && suggestions.length > 0 && (
          <div style={{
            fontSize: '11px',
            color: theme.colors.textDim,
            textAlign: 'center',
            padding: '8px',
            borderTop: `1px solid ${theme.colors.border}`,
            marginTop: '8px',
          }}>
            Press <kbd style={{
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: theme.colors.bgActivity,
              fontFamily: 'monospace',
            }}>1-3</kbd> to select, or <kbd style={{
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: theme.colors.bgActivity,
              fontFamily: 'monospace',
            }}>Esc</kbd> to cancel
          </div>
        )}
      </div>

      {/* Add CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}

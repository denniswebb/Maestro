import { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import type { Theme } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

/**
 * Question structure from AskUserQuestion tool input
 */
interface Question {
  question: string;
  header: string;
  options: Array<{ label: string; description: string }>;
  multiSelect: boolean;
}

/**
 * Props for AskUserQuestionCard component
 */
interface AskUserQuestionCardProps {
  theme: Theme;
  toolUseId: string;
  sessionId: string;
  questions: Question[];
  onSubmit: (toolUseId: string, answers: Record<string, string | string[]>) => void;
  onCancel?: () => void;
  onCopy: (text: string) => void;
}

/**
 * Submission states for visual feedback
 */
type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

/**
 * AskUserQuestionCard - Interactive UI for Claude Code's AskUserQuestion tool
 *
 * Features:
 * - Single-select (radio) and multi-select (checkbox) questions
 * - "Other" option with conditional text input
 * - Multi-question navigation with tabs
 * - Answer validation before submission
 * - Markdown rendering for all text content
 */
export const AskUserQuestionCard = memo(function AskUserQuestionCard({
  theme,
  toolUseId,
  sessionId,
  questions,
  onSubmit,
  onCancel,
  onCopy,
}: AskUserQuestionCardProps) {
  // State for tracking answers (question header → answer)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  // State for "Other" text inputs (question header → text)
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  // Active question index for multi-question navigation
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  // Submission state for loading/success feedback
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');

  const activeQuestion = questions[activeQuestionIndex];
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if a question has been answered
  const isQuestionAnswered = useCallback((question: Question): boolean => {
    const answer = answers[question.header];
    if (!answer) return false;
    if (Array.isArray(answer)) {
      return answer.length > 0;
    }
    return answer.length > 0;
  }, [answers]);

  // Check if all questions have been answered
  const allQuestionsAnswered = useMemo(() => {
    return questions.every(q => isQuestionAnswered(q));
  }, [questions, isQuestionAnswered]);

  // Handle radio button selection (single-select)
  const handleRadioChange = useCallback((header: string, value: string) => {
    setAnswers(prev => ({ ...prev, [header]: value }));
  }, []);

  // Handle checkbox selection (multi-select)
  const handleCheckboxChange = useCallback((header: string, value: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[header] || []) as string[];
      if (checked) {
        return { ...prev, [header]: [...current, value] };
      } else {
        return { ...prev, [header]: current.filter(v => v !== value) };
      }
    });
  }, []);

  // Handle "Other" text input change
  const handleOtherTextChange = useCallback((header: string, text: string) => {
    setOtherText(prev => ({ ...prev, [header]: text }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!allQuestionsAnswered || submissionState === 'submitting') return;

    // Replace "Other" in answers with actual text from otherText
    const finalAnswers: Record<string, string | string[]> = {};
    Object.entries(answers).forEach(([header, answer]) => {
      if (Array.isArray(answer)) {
        finalAnswers[header] = answer.map(a =>
          a === 'Other' ? (otherText[header] || 'Other') : a
        );
      } else {
        finalAnswers[header] = answer === 'Other' ? (otherText[header] || 'Other') : answer;
      }
    });

    try {
      setSubmissionState('submitting');
      await onSubmit(toolUseId, finalAnswers);
      setSubmissionState('success');
      // Auto-hide success state after 2 seconds
      setTimeout(() => setSubmissionState('idle'), 2000);
    } catch (error) {
      console.error('Failed to submit answers:', error);
      setSubmissionState('error');
      // Auto-hide error state after 3 seconds
      setTimeout(() => setSubmissionState('idle'), 3000);
    }
  }, [allQuestionsAnswered, submissionState, answers, otherText, onSubmit, toolUseId]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex(prev => prev + 1);
    }
  }, [activeQuestionIndex, questions.length]);

  const handlePrevious = useCallback(() => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(prev => prev - 1);
    }
  }, [activeQuestionIndex]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if the question card is focused or contains the active element
      if (!containerRef.current?.contains(document.activeElement)) {
        return;
      }

      // Enter key: submit if all questions answered (and not in text input)
      if (e.key === 'Enter' && allQuestionsAnswered) {
        const target = e.target as HTMLElement;
        // Don't submit if user is typing in the "Other" text input
        if (target.tagName !== 'INPUT' || target.getAttribute('type') !== 'text') {
          e.preventDefault();
          handleSubmit();
        }
      }

      // Tab key: navigate to next question (Shift+Tab for previous)
      if (e.key === 'Tab' && questions.length > 1) {
        const target = e.target as HTMLElement;
        // Only intercept Tab if not in a text input (let normal tab behavior work there)
        if (target.tagName !== 'INPUT' || target.getAttribute('type') !== 'text') {
          e.preventDefault();
          if (e.shiftKey) {
            handlePrevious();
          } else {
            handleNext();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allQuestionsAnswered, handleSubmit, handleNext, handlePrevious, questions.length]);

  // Check if "Other" is selected for this question
  const isOtherSelected = useMemo(() => {
    const answer = answers[activeQuestion.header];
    if (Array.isArray(answer)) {
      return answer.includes('Other');
    }
    return answer === 'Other';
  }, [answers, activeQuestion.header]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="rounded-lg p-4 mb-3 outline-none"
      role="form"
      aria-label="Answer Claude's questions"
      style={{
        backgroundColor: theme.colors.bgActivity,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" role="img" aria-label="thinking">🤔</span>
        <span className="font-medium" style={{ color: theme.colors.textMain }}>
          Claude has {questions.length > 1 ? `${questions.length} questions` : 'a question'}
        </span>
      </div>

      {/* Submission state feedback */}
      {submissionState !== 'idle' && (
        <div
          className="mb-3 px-3 py-2 rounded text-sm flex items-center gap-2"
          role="status"
          aria-live="polite"
          style={{
            backgroundColor:
              submissionState === 'success'
                ? 'rgba(34, 197, 94, 0.1)'
                : submissionState === 'error'
                ? 'rgba(239, 68, 68, 0.1)'
                : theme.colors.bgSidebar,
            color:
              submissionState === 'success'
                ? '#22c55e'
                : submissionState === 'error'
                ? '#ef4444'
                : theme.colors.textMain,
            border: `1px solid ${
              submissionState === 'success'
                ? '#22c55e'
                : submissionState === 'error'
                ? '#ef4444'
                : theme.colors.border
            }`,
          }}
        >
          {submissionState === 'submitting' && (
            <>
              <span className="animate-spin">⏳</span>
              <span>Submitting answers...</span>
            </>
          )}
          {submissionState === 'success' && (
            <>
              <span>✓</span>
              <span>Answers submitted successfully!</span>
            </>
          )}
          {submissionState === 'error' && (
            <>
              <span>✗</span>
              <span>Failed to submit answers. Please try again.</span>
            </>
          )}
        </div>
      )}

      {/* Question tabs (if multiple questions) */}
      {questions.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto" role="tablist" aria-label="Questions">
          {questions.map((q, index) => {
            const answered = isQuestionAnswered(q);
            const isActive = index === activeQuestionIndex;
            return (
              <button
                key={index}
                role="tab"
                aria-selected={isActive}
                aria-controls={`question-panel-${index}`}
                aria-label={`Question ${index + 1}${answered ? ' (answered)' : ''}`}
                onClick={() => setActiveQuestionIndex(index)}
                className="px-3 py-1.5 rounded text-sm whitespace-nowrap flex items-center gap-1.5"
                style={{
                  backgroundColor: isActive ? theme.colors.accent : theme.colors.bgSidebar,
                  color: isActive ? theme.colors.bgActivity : theme.colors.textMain,
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {answered && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                Question {index + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Question header */}
      <div
        className="mb-2"
        role="tabpanel"
        id={`question-panel-${activeQuestionIndex}`}
        aria-labelledby={`question-tab-${activeQuestionIndex}`}
      >
        <div
          className="text-xs font-medium uppercase tracking-wide mb-1"
          style={{ color: theme.colors.textDim }}
        >
          {activeQuestion.header}
        </div>
        <div className="text-sm" style={{ color: theme.colors.textMain }}>
          <MarkdownRenderer
            content={activeQuestion.question}
            theme={theme}
            onCopy={onCopy}
          />
        </div>
      </div>

      {/* Options */}
      <div
        className="space-y-2 mt-3"
        role="group"
        aria-label={activeQuestion.multiSelect ? 'Select one or more options' : 'Select one option'}
      >
        {activeQuestion.options.map((option, index) => {
          const isOtherOption = option.label === 'Other' || option.label.startsWith('Tell Claude');
          const answer = answers[activeQuestion.header];
          const isSelected = activeQuestion.multiSelect
            ? Array.isArray(answer) && answer.includes(option.label)
            : answer === option.label;

          return (
            <div key={index}>
              <label
                className="flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-opacity-50"
                style={{
                  backgroundColor: isSelected ? theme.colors.bgSidebar : 'transparent',
                }}
              >
                {/* Radio or Checkbox */}
                <input
                  type={activeQuestion.multiSelect ? 'checkbox' : 'radio'}
                  name={`question-${activeQuestionIndex}`}
                  checked={isSelected}
                  onChange={(e) => {
                    if (activeQuestion.multiSelect) {
                      handleCheckboxChange(activeQuestion.header, option.label, e.target.checked);
                    } else {
                      handleRadioChange(activeQuestion.header, option.label);
                    }
                  }}
                  aria-label={option.label}
                  aria-describedby={option.description ? `option-desc-${index}` : undefined}
                  className="mt-0.5 flex-shrink-0"
                  style={{ accentColor: theme.colors.accent }}
                />
                {/* Label and Description */}
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: theme.colors.textMain }}>
                    <MarkdownRenderer
                      content={option.label}
                      theme={theme}
                      onCopy={onCopy}
                    />
                  </div>
                  {option.description && (
                    <div
                      id={`option-desc-${index}`}
                      className="text-xs mt-0.5"
                      style={{ color: theme.colors.textDim }}
                    >
                      <MarkdownRenderer
                        content={option.description}
                        theme={theme}
                        onCopy={onCopy}
                      />
                    </div>
                  )}
                </div>
              </label>

              {/* "Other" text input (enabled when "Other" is selected) */}
              {isOtherOption && isSelected && (
                <div className="ml-6 mt-2">
                  <input
                    type="text"
                    value={otherText[activeQuestion.header] || ''}
                    onChange={(e) => handleOtherTextChange(activeQuestion.header, e.target.value)}
                    placeholder="Enter your response..."
                    aria-label="Custom response for Other option"
                    className="w-full px-3 py-2 rounded text-sm outline-none"
                    style={{
                      backgroundColor: theme.colors.bgSidebar,
                      color: theme.colors.textMain,
                      border: `1px solid ${theme.colors.border}`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-3 pt-3 text-xs" style={{
        color: theme.colors.textDim,
        borderTop: `1px solid ${theme.colors.border}`
      }}>
        💡 <span className="font-medium">Keyboard shortcuts:</span>{' '}
        {questions.length > 1 && (
          <>
            <kbd className="px-1.5 py-0.5 rounded" style={{
              backgroundColor: theme.colors.bgSidebar,
              border: `1px solid ${theme.colors.border}`
            }}>Tab</kbd> / <kbd className="px-1.5 py-0.5 rounded" style={{
              backgroundColor: theme.colors.bgSidebar,
              border: `1px solid ${theme.colors.border}`
            }}>Shift+Tab</kbd> to navigate questions,{' '}
          </>
        )}
        <kbd className="px-1.5 py-0.5 rounded" style={{
          backgroundColor: theme.colors.bgSidebar,
          border: `1px solid ${theme.colors.border}`
        }}>Enter</kbd> to submit
      </div>

      {/* Navigation and Actions */}
      <div className="flex items-center justify-between mt-4 gap-2">
        {/* Previous/Next buttons (if multiple questions) */}
        <div className="flex gap-2">
          {questions.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                disabled={activeQuestionIndex === 0}
                className="px-3 py-1.5 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: theme.colors.bgSidebar,
                  color: theme.colors.textMain,
                }}
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={activeQuestionIndex === questions.length - 1}
                className="px-3 py-1.5 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: theme.colors.bgSidebar,
                  color: theme.colors.textMain,
                }}
              >
                Next
              </button>
            </>
          )}
        </div>

        {/* Cancel and Submit */}
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-1.5 rounded text-sm"
              style={{
                backgroundColor: theme.colors.bgSidebar,
                color: theme.colors.textMain,
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered || submissionState === 'submitting'}
            aria-busy={submissionState === 'submitting'}
            aria-disabled={!allQuestionsAnswered || submissionState === 'submitting'}
            className="px-4 py-1.5 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: theme.colors.accent,
              color: theme.colors.bgActivity,
            }}
          >
            {submissionState === 'submitting' ? 'Submitting...' : 'Submit Answers'}
          </button>
        </div>
      </div>
    </div>
  );
});

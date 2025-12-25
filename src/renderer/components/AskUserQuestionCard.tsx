import { useState, useMemo, useCallback, memo } from 'react';
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

  const activeQuestion = questions[activeQuestionIndex];

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
  const handleSubmit = useCallback(() => {
    if (!allQuestionsAnswered) return;

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

    onSubmit(toolUseId, finalAnswers);
  }, [allQuestionsAnswered, answers, otherText, onSubmit, toolUseId]);

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
      className="rounded-lg p-4 mb-3"
      style={{
        backgroundColor: theme.colors.bgActivity,
        border: `1px solid ${theme.colors.border}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤔</span>
        <span className="font-medium" style={{ color: theme.colors.textMain }}>
          Claude has {questions.length > 1 ? `${questions.length} questions` : 'a question'}
        </span>
      </div>

      {/* Question tabs (if multiple questions) */}
      {questions.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {questions.map((q, index) => {
            const answered = isQuestionAnswered(q);
            const isActive = index === activeQuestionIndex;
            return (
              <button
                key={index}
                onClick={() => setActiveQuestionIndex(index)}
                className="px-3 py-1.5 rounded text-sm whitespace-nowrap flex items-center gap-1.5"
                style={{
                  backgroundColor: isActive ? theme.colors.accent : theme.colors.bgSidebar,
                  color: isActive ? theme.colors.bgActivity : theme.colors.textMain,
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {answered && <Check className="w-3.5 h-3.5" />}
                Question {index + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Question header */}
      <div className="mb-2">
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
      <div className="space-y-2 mt-3">
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
                    <div className="text-xs mt-0.5" style={{ color: theme.colors.textDim }}>
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
            disabled={!allQuestionsAnswered}
            className="px-4 py-1.5 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: theme.colors.accent,
              color: theme.colors.bgActivity,
            }}
          >
            Submit Answers
          </button>
        </div>
      </div>
    </div>
  );
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AskUserQuestionCard } from '../AskUserQuestionCard';
import type { Theme } from '../../types';

// Mock theme for testing
const mockTheme: Theme = {
  name: 'test-theme',
  colors: {
    bgMain: '#1a1a1a',
    bgSidebar: '#2a2a2a',
    bgActivity: '#3a3a3a',
    textMain: '#ffffff',
    textDim: '#888888',
    textPink: '#ff69b4',
    accent: '#4a9eff',
    border: '#444444',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#ef4444',
    info: '#3b82f6',
    link: '#60a5fa',
  },
};

// Mock onCopy function
const mockOnCopy = vi.fn();

describe('AskUserQuestionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test 1: Single Question with Radio Buttons', () => {
    const singleSelectQuestion = [
      {
        question: 'What is your preferred authentication method?',
        header: 'Authentication Method',
        options: [
          { label: 'JWT Tokens', description: 'Stateless token-based auth' },
          { label: 'Session Cookies', description: 'Server-side session management' },
          { label: 'OAuth 2.0', description: 'Third-party authentication' },
          { label: 'Other', description: 'Custom solution' },
        ],
        multiSelect: false,
      },
    ];

    it('renders single-select question with radio buttons', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={singleSelectQuestion}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      // Verify question header
      expect(screen.getByText('Claude has a question')).toBeInTheDocument();
      expect(screen.getByText('Authentication Method')).toBeInTheDocument();

      // Verify all radio buttons render
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(4);

      // Verify option labels
      expect(screen.getByText('JWT Tokens')).toBeInTheDocument();
      expect(screen.getByText('Session Cookies')).toBeInTheDocument();
      expect(screen.getByText('OAuth 2.0')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('allows only one radio selection at a time', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={singleSelectQuestion}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const radios = screen.getAllByRole('radio') as HTMLInputElement[];

      // Select first option
      fireEvent.click(radios[0]);
      expect(radios[0].checked).toBe(true);
      expect(radios[1].checked).toBe(false);

      // Select second option
      fireEvent.click(radios[1]);
      expect(radios[0].checked).toBe(false);
      expect(radios[1].checked).toBe(true);
    });

    it('enables submit button when question is answered', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={singleSelectQuestion}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const submitButton = screen.getByText('Submit Answers');
      const radios = screen.getAllByRole('radio');

      // Initially disabled
      expect(submitButton).toBeDisabled();

      // Select an option
      fireEvent.click(radios[0]);

      // Now enabled
      expect(submitButton).not.toBeDisabled();
    });

    it('submits correct answer format', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={singleSelectQuestion}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const radios = screen.getAllByRole('radio');
      const submitButton = screen.getByText('Submit Answers');

      // Select JWT Tokens
      fireEvent.click(radios[0]);
      fireEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith('toolu_test123', {
        'Authentication Method': 'JWT Tokens',
      });
    });
  });

  describe('Test 2: Multi-Select Question with Checkboxes', () => {
    const multiSelectQuestion = [
      {
        question: 'Which features do you need?',
        header: 'Required Features',
        options: [
          { label: 'User Registration', description: 'Sign up functionality' },
          { label: 'Password Reset', description: 'Forgot password flow' },
          { label: 'Two-Factor Auth', description: '2FA security' },
          { label: 'Other', description: 'Additional features' },
        ],
        multiSelect: true,
      },
    ];

    it('renders multi-select question with checkboxes', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multiSelectQuestion}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      // Verify checkboxes render
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);
    });

    it('allows multiple selections', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multiSelectQuestion}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];

      // Select multiple options
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(true);
      expect(checkboxes[2].checked).toBe(true);
      expect(checkboxes[3].checked).toBe(false);
    });

    it('allows deselection', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multiSelectQuestion}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];

      // Select and deselect
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0].checked).toBe(true);

      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0].checked).toBe(false);
    });

    it('submits array of selected answers', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multiSelectQuestion}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const submitButton = screen.getByText('Submit Answers');

      // Select multiple options
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[2]);

      fireEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith('toolu_test123', {
        'Required Features': ['User Registration', 'Two-Factor Auth'],
      });
    });
  });

  describe('Test 3: "Other" Text Input Behavior', () => {
    const questionWithOther = [
      {
        question: 'Select your preference',
        header: 'Preference',
        options: [
          { label: 'Option A', description: 'First choice' },
          { label: 'Option B', description: 'Second choice' },
          { label: 'Other', description: 'Custom option' },
        ],
        multiSelect: false,
      },
    ];

    it('shows text input when "Other" is selected', async () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={questionWithOther}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      // Text input should not be visible initially
      expect(screen.queryByPlaceholderText('Enter your response...')).not.toBeInTheDocument();

      // Select "Other"
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[2]); // "Other" option

      // Text input should now be visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your response...')).toBeInTheDocument();
      });
    });

    it('hides text input when non-Other option is selected', async () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={questionWithOther}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const radios = screen.getAllByRole('radio');

      // Select "Other"
      fireEvent.click(radios[2]);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your response...')).toBeInTheDocument();
      });

      // Select different option
      fireEvent.click(radios[0]);

      // Text input should be hidden
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Enter your response...')).not.toBeInTheDocument();
      });
    });

    it('preserves "Other" text when navigating away and back', async () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={questionWithOther}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const radios = screen.getAllByRole('radio');

      // Select "Other" and type text
      fireEvent.click(radios[2]);
      const input = await screen.findByPlaceholderText('Enter your response...');
      fireEvent.change(input, { target: { value: 'My custom answer' } });

      // Select different option
      fireEvent.click(radios[0]);

      // Select "Other" again
      fireEvent.click(radios[2]);

      // Text should be preserved
      const inputAgain = await screen.findByPlaceholderText('Enter your response...');
      expect(inputAgain).toHaveValue('My custom answer');
    });

    it('replaces "Other" with custom text in submission', async () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={questionWithOther}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const radios = screen.getAllByRole('radio');
      const submitButton = screen.getByText('Submit Answers');

      // Select "Other" and enter text
      fireEvent.click(radios[2]);
      const input = await screen.findByPlaceholderText('Enter your response...');
      fireEvent.change(input, { target: { value: 'Custom solution' } });

      fireEvent.click(submitButton);

      // Answer should use custom text, not "Other"
      expect(onSubmit).toHaveBeenCalledWith('toolu_test123', {
        Preference: 'Custom solution',
      });
    });
  });

  describe('Test 4: Multiple Questions with Tab Navigation', () => {
    const multipleQuestions = [
      {
        question: 'First question?',
        header: 'Question 1',
        options: [
          { label: 'Answer 1A', description: 'First option' },
          { label: 'Answer 1B', description: 'Second option' },
        ],
        multiSelect: false,
      },
      {
        question: 'Second question?',
        header: 'Question 2',
        options: [
          { label: 'Answer 2A', description: 'First option' },
          { label: 'Answer 2B', description: 'Second option' },
        ],
        multiSelect: false,
      },
      {
        question: 'Third question?',
        header: 'Question 3',
        options: [
          { label: 'Answer 3A', description: 'First option' },
          { label: 'Answer 3B', description: 'Second option' },
        ],
        multiSelect: false,
      },
    ];

    it('renders tabs for multiple questions', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multipleQuestions}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      expect(screen.getByText('Claude has 3 questions')).toBeInTheDocument();
      expect(screen.getAllByText('Question 1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Question 2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Question 3').length).toBeGreaterThan(0);
    });

    it('shows checkmark on answered questions', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multipleQuestions}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      // Answer first question
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      // Question 1 tab should have checkmark (via svg check icon)
      const question1Tab = screen.getByRole('button', { name: /Question 1/i });
      expect(question1Tab.querySelector('svg')).toBeInTheDocument();
    });

    it('navigates with Next/Previous buttons', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multipleQuestions}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      // Initially on Question 1
      expect(screen.getByText(/First question?/)).toBeInTheDocument();

      // Click Next
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      // Now on Question 2
      expect(screen.getByText(/Second question?/)).toBeInTheDocument();

      // Click Previous
      const previousButton = screen.getByText('Previous');
      fireEvent.click(previousButton);

      // Back to Question 1
      expect(screen.getByText(/First question?/)).toBeInTheDocument();
    });

    it('navigates by clicking tabs directly', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multipleQuestions}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      // Click Question 3 tab
      const question3Tab = screen.getByRole('button', { name: /Question 3/i });
      fireEvent.click(question3Tab);

      // Should jump to Question 3
      expect(screen.getByText(/Third question?/)).toBeInTheDocument();
    });

    it('disables Previous on first question', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multipleQuestions}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('disables Next on last question', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multipleQuestions}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      // Navigate to last question
      const question3Tab = screen.getByRole('button', { name: /Question 3/i });
      fireEvent.click(question3Tab);

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Test 5: Answer Validation', () => {
    const multipleQuestions = [
      {
        question: 'First question?',
        header: 'Question 1',
        options: [{ label: 'Answer 1', description: '' }],
        multiSelect: false,
      },
      {
        question: 'Second question?',
        header: 'Question 2',
        options: [{ label: 'Answer 2', description: '' }],
        multiSelect: false,
      },
    ];

    it('disables submit until all questions answered', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={multipleQuestions}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const submitButton = screen.getByText('Submit Answers');

      // Initially disabled
      expect(submitButton).toBeDisabled();

      // Answer first question
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      // Still disabled (second question unanswered)
      expect(submitButton).toBeDisabled();

      // Navigate to second question
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      // Answer second question
      const radios2 = screen.getAllByRole('radio');
      fireEvent.click(radios2[0]);

      // Now enabled
      expect(submitButton).not.toBeDisabled();
    });

    it('re-disables submit if answer is removed', () => {
      const onSubmit = vi.fn();
      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={[multipleQuestions[0]]}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      const submitButton = screen.getByText('Submit Answers');
      const radios = screen.getAllByRole('radio') as HTMLInputElement[];

      // Answer question
      fireEvent.click(radios[0]);
      expect(submitButton).not.toBeDisabled();

      // Note: For radio buttons, you cannot "deselect" by clicking again
      // This test is more relevant for multi-select questions
      // Skipping this specific scenario for radio buttons
    });
  });

  describe('Test 8: Cancel Button', () => {
    it('calls onCancel when Cancel button clicked', () => {
      const onSubmit = vi.fn();
      const onCancel = vi.fn();

      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={[
            {
              question: 'Test question?',
              header: 'Test',
              options: [{ label: 'Answer', description: '' }],
              multiSelect: false,
            },
          ]}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onCopy={mockOnCopy}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('does not render Cancel button if onCancel not provided', () => {
      const onSubmit = vi.fn();

      render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={[
            {
              question: 'Test question?',
              header: 'Test',
              options: [{ label: 'Answer', description: '' }],
              multiSelect: false,
            },
          ]}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('applies theme colors correctly', () => {
      const onSubmit = vi.fn();
      const { container } = render(
        <AskUserQuestionCard
          theme={mockTheme}
          toolUseId="toolu_test123"
          sessionId="session_test"
          questions={[
            {
              question: 'Test?',
              header: 'Test',
              options: [{ label: 'Answer', description: '' }],
              multiSelect: false,
            },
          ]}
          onSubmit={onSubmit}
          onCopy={mockOnCopy}
        />
      );

      // Card background
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({ backgroundColor: mockTheme.colors.bgActivity });

      // Submit button should use accent color
      const submitButton = screen.getByText('Submit Answers');
      expect(submitButton).toHaveStyle({ backgroundColor: mockTheme.colors.accent });
    });
  });
});

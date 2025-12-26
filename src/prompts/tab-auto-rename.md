# Tab Auto Rename Prompt

Analyze the conversation history below and generate a concise tab name (max 5 words, 40 characters).

## Rules
- Focus on the main topic or goal of the conversation
- Use title case (e.g., "Fix Authentication Bug")
- Omit common prefixes like "Implement", "Fix", "Add" unless critical for clarity
- If multiple topics are discussed, choose the most recent or important one
- Return ONLY the tab name, no explanation or additional text

## Conversation History
{{conversation_history}}

## Task
Generate a tab name that accurately summarizes this conversation.

Tab name:

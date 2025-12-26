Analyze the conversation history below and generate exactly {{count}} concise tab name suggestion(s).

Rules:
- Each suggestion should be max 5 words and 40 characters
- Focus on the main topic or goal of the conversation
- Use title case (e.g., "Fix Authentication Bug")
- Omit common prefixes like "Implement", "Fix", "Add" unless critical for clarity
- If multiple topics, provide variety: most recent, most important, and most descriptive
- Return ONLY the {{count}} tab name(s), one per line, nothing else
- If the conversation is too short or unclear, provide generic but helpful suggestions like "Recent Conversation", "Development Session", "Code Review"

Conversation:
{{conversation_history}}

Tab name suggestion(s) ({{count}} option(s), one per line):

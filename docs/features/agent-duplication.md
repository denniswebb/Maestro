# Interactive Agent Duplication

## Overview

Interactive Agent Duplication allows users to duplicate existing agents with pre-filled configuration, enabling quick creation of variations for different use cases while maintaining the same project context.

## Purpose

Create new agents based on existing configurations without manually re-entering all settings. This is particularly useful when you need:
- Multiple agents of different types (Claude Code, OpenCode, Codex) working on the same project
- Agents with variations in configuration (different spawn arguments, environment variables, or models)
- Quick iteration on agent setups while preserving proven configurations

## User Workflows

### Scenario 1: Same Project, Different Agent Type

**Use Case**: You have a Claude Code agent working well on a project, but you want to try OpenCode or Codex on the same codebase.

**Steps**:
1. Right-click the existing Claude Code agent in the session list
2. Select "Duplicate" from the context menu
3. The "New Agent" dialog opens with all configuration pre-filled
4. Change the agent type from "claude-code" to "codex" (or "opencode")
5. Click "Create"
6. New Codex agent spawns with identical directory, MCP servers, and settings

**Result**: Two agents running in parallel on the same project, allowing direct comparison of different AI models.

### Scenario 2: Same Project, Different Configuration

**Use Case**: You have an agent with specific MCP servers and custom settings, but you want to try a variation (different spawn arguments, environment variables, or model selection).

**Steps**:
1. Right-click the existing agent in the session list
2. Select "Duplicate" from the context menu
3. The "New Agent" dialog opens with all configuration pre-filled
4. Modify spawn arguments, environment variables, or model settings as desired
5. Click "Create"
6. New agent with customized configuration spawns

**Result**: Multiple agents with slightly different configurations for testing optimization approaches.

## Access Methods

### Right-Click Context Menu
1. Right-click any agent session in the session list
2. Select "Duplicate" (appears as a peer to "Rename", "Edit", etc.)

### Cmd+K Quick Actions
1. With an agent session active, press `Cmd+K` (or `Ctrl+K`)
2. Type "duplicate" or select "Duplicate Agent: [Agent Name]"
3. Press Enter

**Note**: Like "Rename", there is no dedicated keyboard shortcut - duplication is accessed via context menu or quick actions.

## Technical Implementation

### Session Configuration Persistence

The following fields are added to the Session interface to enable full configuration duplication:

```typescript
interface Session {
  // ... existing fields ...

  // System prompt / nudge message
  nudgeMessage?: string;

  // Custom agent executable path
  customPath?: string;

  // Custom spawn arguments
  customArgs?: string;

  // Custom environment variables
  customEnvVars?: Record<string, string>;

  // Model selection (provider-level config)
  customModel?: string;

  // Context window override (for supported agents)
  customContextWindow?: number;
}
```

These fields are:
- Stored in the session database (electron-store)
- Loaded when sessions are restored
- Persisted across app restarts
- Available for duplication operations

### NewInstanceModal Enhancement

The `NewInstanceModal` component is enhanced to support pre-filling from a source session:

```typescript
interface NewInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (...) => void;
  theme: any;
  existingSessions: Session[];
  sourceSession?: Session; // NEW: Optional source session for duplication
}
```

**Pre-fill Behavior**:
When `sourceSession` is provided, the modal pre-fills all form fields:

| Field | Value |
|-------|-------|
| Agent Type | `sourceSession.toolType` |
| Working Directory | `sourceSession.cwd` |
| Instance Name | `${sourceSession.name} (Copy)` |
| Nudge Message | `sourceSession.nudgeMessage` |
| Custom Path | `sourceSession.customPath` |
| Custom Args | `sourceSession.customArgs` |
| Environment Variables | `sourceSession.customEnvVars` |
| Model Selection | `sourceSession.customModel` |
| Context Window | `sourceSession.customContextWindow` |

**User Control**:
- All fields remain editable
- User can modify any configuration before creation
- Validation ensures name uniqueness and directory exists
- Standard session creation flow applies

### UI Integration Points

#### SessionList Context Menu
Location: `src/renderer/components/SessionList.tsx`

Add "Duplicate" menu item to `SessionContextMenu`:

```typescript
// Add to SessionContextMenuProps
interface SessionContextMenuProps {
  // ... existing props ...
  onDuplicate: () => void; // NEW
}

// Add to menu items (after "Edit", before "Toggle Bookmark")
<button onClick={() => {
  onDuplicate();
  onDismiss();
}}>
  <Copy className="w-4 h-4" />
  <span>Duplicate</span>
</button>
```

**Handler in SessionList**:
```typescript
const [duplicatingSessionId, setDuplicatingSessionId] = useState<string | null>(null);

<SessionContextMenu
  // ... existing props ...
  onDuplicate={() => {
    setDuplicatingSessionId(contextMenuSession.id);
    setNewInstanceModalOpen(true);
    setContextMenu(null);
  }}
/>
```

#### Quick Actions Modal
Location: `src/renderer/components/QuickActionsModal.tsx`

Add "Duplicate Agent" action (peer to "Rename Agent"):

```typescript
...(activeSession ? [
  {
    id: 'duplicate',
    label: `Duplicate Agent: ${activeSession.name}`,
    action: () => {
      setDuplicatingSessionId(activeSession.id);
      setNewInstanceModalOpen(true);
      close();
    }
  }
] : [])
```

#### App.tsx Integration
Location: `src/renderer/App.tsx`

Pass `sourceSession` to `NewInstanceModal`:

```typescript
const sourceSession = duplicatingSessionId
  ? sessions.find(s => s.id === duplicatingSessionId)
  : undefined;

<NewInstanceModal
  isOpen={newInstanceModalOpen}
  onClose={() => {
    setNewInstanceModalOpen(false);
    setDuplicatingSessionId(null); // Clear on close
  }}
  onCreate={handleCreateSession}
  theme={theme}
  existingSessions={sessions}
  sourceSession={sourceSession} // NEW
/>
```

### Creation Flow

1. **User Triggers Duplication**:
   - Right-click session → "Duplicate", OR
   - Cmd+K → "Duplicate Agent: [Name]"

2. **State Update**:
   - `setDuplicatingSessionId(sourceSessionId)`
   - `setNewInstanceModalOpen(true)`

3. **Modal Opens**:
   - `NewInstanceModal` receives `sourceSession` prop
   - All fields pre-populate from source session
   - User sees familiar "New Agent" dialog with everything filled

4. **User Edits Configuration** (optional):
   - Change agent type (e.g., claude-code → codex)
   - Modify working directory (if needed)
   - Adjust spawn arguments or environment variables
   - Change model selection
   - Edit name to distinguish from original

5. **Validation**:
   - Name uniqueness check (against `existingSessions`)
   - Directory existence verification
   - Agent availability check

6. **Creation**:
   - Click "Create" button
   - `onCreate()` handler called with all configuration
   - New session spawned with specified settings
   - Fresh conversation state (no history from original)
   - Clean slate for tasks and work logs

## What Gets Copied

When you duplicate an agent, the following configuration is copied:

✅ **Agent Configuration**:
- Agent type (claude-code, opencode, codex, etc.)
- Working directory path
- Project root directory
- Nudge message (system prompt)
- Custom agent executable path
- Custom spawn arguments
- Custom environment variables
- Model selection
- Context window override

✅ **Project Settings**:
- Git repository configuration (inherited from directory)
- MCP server configuration (if session-specific)
- Bookmark status

## What Doesn't Get Copied

When you duplicate an agent, the following state is **NOT** copied (fresh start):

❌ **Working State**:
- Chat history / conversation messages
- Agent session ID (new session, new conversation)
- Task state and TodoWrite items
- Work log history
- Usage statistics and token costs
- Command history (AI and shell)
- Execution queue
- File explorer state (expanded folders, scroll position)

❌ **Runtime State**:
- Active time tracking
- Current context usage
- Changed files tracking
- Pending AI commands

**Rationale**: The duplicated agent should behave exactly as if you clicked "New Agent" and manually entered the same configuration. The original agent's working state (conversations, tasks in progress) stays with the original only.

## Non-Requirements

This feature explicitly does **NOT** include:

❌ **Automatic Background Duplication**:
- No trigger-based spawning (task count, time elapsed, etc.)
- No automatic duplication during batch processing
- No Auto Run integration for spawning helper agents

❌ **Advanced Orchestration**:
- No duplication groups management
- No duplicate tracking or relationships
- No automatic cleanup of duplicates

**Design Philosophy**: This is a **user-initiated, interactive cloning tool** for manual configuration reuse, not an automated spawning system. Users maintain full control and visibility over when and how duplicates are created.

## Future Enhancements (Out of Scope)

Potential future features that are NOT part of this initial implementation:

- **Templates**: Save agent configurations as reusable templates
- **Bulk Duplication**: Create multiple duplicates at once
- **Smart Defaults**: Suggest agent type based on project characteristics
- **Configuration Diff**: Compare configurations between agents
- **Import/Export**: Share agent configurations across machines

## Testing Recommendations

### Manual Testing Scenarios

1. **Basic Duplication**:
   - Create agent with custom settings
   - Duplicate it
   - Verify all fields pre-filled correctly
   - Create duplicate without modifications
   - Confirm new agent spawns with identical config

2. **Cross-Agent Duplication**:
   - Duplicate Claude Code agent
   - Change to OpenCode/Codex
   - Verify agent-specific settings respected
   - Confirm new agent type spawns correctly

3. **Configuration Modifications**:
   - Duplicate agent
   - Modify spawn arguments
   - Modify environment variables
   - Change model selection
   - Verify new agent uses modified config

4. **Validation**:
   - Attempt duplicate with duplicate name → Should fail validation
   - Attempt duplicate with non-existent directory → Should fail validation
   - Attempt duplicate with unavailable agent → Should show disabled/error

5. **State Isolation**:
   - Have conversation with original agent
   - Duplicate the agent
   - Verify new agent has empty conversation
   - Verify original agent conversation unchanged

### Automated Testing

Unit tests should cover:
- Session configuration persistence (save/load)
- NewInstanceModal pre-fill logic
- Validation with source session
- State isolation (no history leakage)

Integration tests should cover:
- End-to-end duplication flow (right-click → create)
- Cmd+K duplication flow
- Cross-agent type duplication
- Configuration modification before creation

## Implementation Checklist

### Backend
- [ ] Add `nudgeMessage`, `customPath`, `customArgs`, `customEnvVars`, `customModel`, `customContextWindow` to Session interface
- [ ] Add IPC handlers for session configuration persistence
- [ ] Update session storage to persist new fields
- [ ] Update session loading to restore new fields

### Frontend - Session List
- [ ] Add "Duplicate" to `SessionContextMenu` component
- [ ] Add `onDuplicate` prop and handler
- [ ] Add `duplicatingSessionId` state to SessionList
- [ ] Wire up context menu → modal opening

### Frontend - Quick Actions
- [ ] Add "Duplicate Agent" action to QuickActionsModal
- [ ] Wire up quick action → modal opening

### Frontend - New Agent Modal
- [ ] Add `sourceSession?: Session` prop to NewInstanceModal
- [ ] Implement pre-fill logic for all fields
- [ ] Update form initialization to use source session
- [ ] Ensure validation works with pre-filled values

### Frontend - App.tsx
- [ ] Add `duplicatingSessionId` state
- [ ] Pass `sourceSession` to NewInstanceModal
- [ ] Clear `duplicatingSessionId` on modal close

### Testing
- [ ] Unit tests for configuration persistence
- [ ] Unit tests for pre-fill logic
- [ ] Integration test: context menu duplication
- [ ] Integration test: Cmd+K duplication
- [ ] Integration test: state isolation verification

### Documentation
- [x] Feature documentation (this file)
- [ ] Update CLAUDE.md with duplication references
- [ ] Update user-facing help/tooltips

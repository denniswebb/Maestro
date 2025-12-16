import React, { useRef, useState } from 'react';
import type { Theme } from '../types';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';
import { Modal, ModalFooter } from './ui/Modal';

interface RenameTabModalProps {
  theme: Theme;
  initialName: string;
  claudeSessionId?: string | null;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export function RenameTabModal(props: RenameTabModalProps) {
  const { theme, initialName, claudeSessionId, onClose, onRename } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialName);

  // Generate placeholder with UUID octet if available
  const placeholder = claudeSessionId
    ? `Rename ${claudeSessionId.split('-')[0].toUpperCase()}...`
    : 'Enter tab name...';

  const handleRename = () => {
    onRename(value.trim());
    onClose();
  };

  return (
    <Modal
      theme={theme}
      title="Rename Tab"
      priority={MODAL_PRIORITIES.RENAME_TAB}
      onClose={onClose}
      width={400}
      initialFocusRef={inputRef as React.RefObject<HTMLElement>}
      footer={
        <ModalFooter
          theme={theme}
          onCancel={onClose}
          onConfirm={handleRename}
          confirmLabel="Rename"
        />
      }
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleRename();
          }
        }}
        placeholder={placeholder}
        className="w-full p-3 rounded border bg-transparent outline-none"
        style={{ borderColor: theme.colors.border, color: theme.colors.textMain }}
      />
    </Modal>
  );
}

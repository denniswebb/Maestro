import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, RefreshCw, FolderOpen } from 'lucide-react';
import type { Theme } from '../types';

interface AutoRunDocumentSelectorProps {
  theme: Theme;
  documents: string[];  // List of document filenames (without .md extension)
  selectedDocument: string | null;
  onSelectDocument: (filename: string) => void;
  onRefresh: () => void;
  onChangeFolder: () => void;
  isLoading?: boolean;
}

export function AutoRunDocumentSelector({
  theme,
  documents,
  selectedDocument,
  onSelectDocument,
  onRefresh,
  onChangeFolder,
  isLoading = false,
}: AutoRunDocumentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleSelectDocument = (doc: string) => {
    onSelectDocument(doc);
    setIsOpen(false);
  };

  // Sort documents alphabetically
  const sortedDocuments = [...documents].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex items-center gap-2 mb-3">
      {/* Document Dropdown */}
      <div ref={dropdownRef} className="relative flex-1">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors hover:opacity-90"
          style={{
            backgroundColor: theme.colors.bgActivity,
            color: theme.colors.textMain,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <span className="truncate">
            {selectedDocument || 'Select a document...'}
          </span>
          <ChevronDown
            className={`w-4 h-4 ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: theme.colors.textDim }}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg overflow-hidden z-50"
            style={{
              backgroundColor: theme.colors.bgSidebar,
              border: `1px solid ${theme.colors.border}`,
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {sortedDocuments.length === 0 ? (
              <div
                className="px-3 py-2 text-sm"
                style={{ color: theme.colors.textDim }}
              >
                No markdown files found
              </div>
            ) : (
              sortedDocuments.map((doc) => (
                <button
                  key={doc}
                  onClick={() => handleSelectDocument(doc)}
                  className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/5"
                  style={{
                    color: doc === selectedDocument ? theme.colors.accent : theme.colors.textMain,
                    backgroundColor: doc === selectedDocument ? theme.colors.bgActivity : 'transparent',
                  }}
                >
                  {doc}
                </button>
              ))
            )}

            {/* Divider */}
            <div
              className="border-t my-1"
              style={{ borderColor: theme.colors.border }}
            />

            {/* Change Folder Option */}
            <button
              onClick={() => {
                setIsOpen(false);
                onChangeFolder();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/5"
              style={{ color: theme.colors.textDim }}
            >
              <FolderOpen className="w-4 h-4" />
              Change Folder...
            </button>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className={`p-2 rounded transition-colors hover:bg-white/10 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          color: theme.colors.textDim,
          border: `1px solid ${theme.colors.border}`,
        }}
        title="Refresh document list"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

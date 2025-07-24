import React, { useEffect, useState, useCallback } from 'react';
import {
  Editor,
  EditorState,
  RichUtils,
  convertToRaw,
  convertFromRaw,
  ContentState,
} from 'draft-js';
import { draftToMarkdown, markdownToDraft } from 'markdown-draft-js';
import 'draft-js/dist/Draft.css';

type Props = {
  onChange: (markdown: string) => void;
  initialValue?: string;
  maxLength?: number;
};

const defaultMaxLength = 2000;

const TextAreaMarkdown: React.FC<Props> = ({
  onChange,
  initialValue = '',
  maxLength = defaultMaxLength,
}) => {
  const [editorState, setEditorState] = useState<EditorState>(() => {
    try {
      const contentState = convertFromRaw(markdownToDraft(initialValue));
      return EditorState.createWithContent(contentState);
    } catch {
      return EditorState.createEmpty();
    }
  });

  const [charCount, setCharCount] = useState(0);

  const handleEditorChange = (state: EditorState) => {
    const content = state.getCurrentContent();
    const plainText = content.getPlainText();
    if (plainText.length <= maxLength) {
      setEditorState(state);
      setCharCount(plainText.length);
      const markdown = draftToMarkdown(convertToRaw(content));
      onChange(markdown);
    }
  };

  const handleKeyCommand = useCallback(
    (command: string, state: EditorState): 'handled' | 'not-handled' => {
      const newState = RichUtils.handleKeyCommand(state, command);
      if (newState) {
        handleEditorChange(newState);
        return 'handled';
      }
      return 'not-handled';
    },
    []
  );

  const toggleInlineStyle = (style: string) => {
    handleEditorChange(RichUtils.toggleInlineStyle(editorState, style));
  };

  const toggleBlockType = (blockType: string) => {
    handleEditorChange(RichUtils.toggleBlockType(editorState, blockType));
  };

  const clearFormatting = () => {
    const content = editorState.getCurrentContent();
    const plainText = content.getPlainText();
    const newState = EditorState.createWithContent(
      ContentState.createFromText(plainText)
    );
    handleEditorChange(newState);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
      <div style={{ marginBottom: '0.5rem' }}>
        <button onClick={() => toggleInlineStyle('BOLD')}>Bold</button>
        <button onClick={() => toggleInlineStyle('ITALIC')}>Italic</button>
        <button onClick={() => toggleInlineStyle('UNDERLINE')}>Underline</button>
        <button onClick={() => toggleBlockType('unordered-list-item')}>• List</button>
        <button onClick={() => toggleBlockType('ordered-list-item')}>1. List</button>
        <button onClick={clearFormatting}>Clear</button>
      </div>

      <div style={{ minHeight: '150px', cursor: 'text' }}>
        <Editor
          editorState={editorState}
          onChange={handleEditorChange}
          handleKeyCommand={handleKeyCommand}
          placeholder="Введите текст с форматированием..."
        />
      </div>

      <div style={{ textAlign: 'right', marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
        {charCount} / {maxLength}
      </div>
    </div>
  );
};

export default TextAreaMarkdown;

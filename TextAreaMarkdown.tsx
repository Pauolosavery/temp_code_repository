import React, { useState, useCallback } from 'react';
import {
  Editor,
  EditorState,
  RichUtils,
  convertToRaw,
  convertFromRaw,
  ContentState,
  Modifier,
  CompositeDecorator,
} from 'draft-js';
import { draftToMarkdown, markdownToDraft } from 'markdown-draft-js';
import 'draft-js/dist/Draft.css';

type Props = {
  onChange: (markdown: string) => void;
  initialValue?: string;
  maxLength?: number;
};

const defaultMaxLength = 2000;

// ===== Ссылки =====
const findLinkEntities = (
  contentBlock: any,
  callback: any,
  contentState: any
) => {
  contentBlock.findEntityRanges((character: any) => {
    const entityKey = character.getEntity();
    return (
      entityKey !== null && contentState.getEntity(entityKey).getType() === 'LINK'
    );
  }, callback);
};

const Link = (props: any) => {
  const { url } = props.contentState.getEntity(props.entityKey).getData();
  return (
    <a href={url} style={{ color: 'blue', textDecoration: 'underline' }}>
      {props.children}
    </a>
  );
};

const decorator = new CompositeDecorator([
  {
    strategy: findLinkEntities,
    component: Link,
  },
]);

const TextAreaMarkdown: React.FC<Props> = ({
  onChange,
  initialValue = '',
  maxLength = defaultMaxLength,
}) => {
  const [editorState, setEditorState] = useState<EditorState>(() => {
    try {
      const contentState = convertFromRaw(markdownToDraft(initialValue));
      return EditorState.createWithContent(contentState, decorator);
    } catch {
      return EditorState.createEmpty(decorator);
    }
  });

  const [charCount, setCharCount] = useState(
    editorState.getCurrentContent().getPlainText().length
  );

  const handleEditorChange = (state: EditorState) => {
    const content = state.getCurrentContent();
    const plainText = content.getPlainText();
    if (plainText.length <= maxLength) {
      setEditorState(state);
      setCharCount(plainText.length);
      const markdown = draftToMarkdown(convertToRaw(content), {
        styleToMarkdown: {
          ITALIC: (text) => `*${text}*`,
          BOLD: (text) => `**${text}**`,
          UNDERLINE: (text) => `<u>${text}</u>`,
        },
        entityToMarkdown: (entity, originalText) => {
          if (entity.type === 'LINK') {
            return `[${originalText}](${entity.data.url})`;
          }
          return originalText;
        },
      });
      onChange(markdown);
    }
  };

  const handleKeyCommand = useCallback(
    (command: string, state: EditorState): 'handled' | 'not-handled' => {
      if (command === 'undo') {
        undo();
        return 'handled';
      }
      if (command === 'redo') {
        redo();
        return 'handled';
      }

      const newState = RichUtils.handleKeyCommand(state, command);
      if (newState) {
        handleEditorChange(newState);
        return 'handled';
      }
      return 'not-handled';
    },
    [editorState]
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
      ContentState.createFromText(plainText),
      decorator
    );
    handleEditorChange(newState);
  };

  const undo = () => {
    const newState = EditorState.undo(editorState);
    handleEditorChange(newState);
  };

  const redo = () => {
    const newState = EditorState.redo(editorState);
    handleEditorChange(newState);
  };

  const insertLink = () => {
    const selection = editorState.getSelection();
    if (!selection.isCollapsed()) {
      const url = window.prompt('Введите URL ссылки:');
      if (!url) return;

      const contentState = editorState.getCurrentContent();
      const contentWithEntity = contentState.createEntity('LINK', 'MUTABLE', { url });
      const entityKey = contentWithEntity.getLastCreatedEntityKey();

      const contentWithLink = Modifier.applyEntity(
        contentWithEntity,
        selection,
        entityKey
      );

      const newState = EditorState.push(
        editorState,
        contentWithLink,
        'apply-entity'
      );

      setEditorState(EditorState.forceSelection(newState, selection));
      handleEditorChange(newState);
    } else {
      alert('Сначала выделите текст, к которому хотите применить ссылку.');
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
      <div
        style={{
          marginBottom: '0.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <button onClick={() => toggleInlineStyle('BOLD')}>Bold</button>
        <button onClick={() => toggleInlineStyle('ITALIC')}>Italic</button>
        <button onClick={() => toggleInlineStyle('UNDERLINE')}>Underline</button>
        <button onClick={() => toggleBlockType('unordered-list-item')}>• List</button>
        <button onClick={() => toggleBlockType('ordered-list-item')}>1. List</button>
        <button onClick={clearFormatting}>Clear</button>
        <button onClick={insertLink} title="Insert Link">🔗</button>
        <button
          onClick={undo}
          title="Undo"
          disabled={editorState.getUndoStack().size === 0}
        >
          ↶
        </button>
        <button
          onClick={redo}
          title="Redo"
          disabled={editorState.getRedoStack().size === 0}
        >
          ↷
        </button>
      </div>

      <div style={{ minHeight: '150px', cursor: 'text' }}>
        <Editor
          editorState={editorState}
          onChange={handleEditorChange}
          handleKeyCommand={handleKeyCommand}
          placeholder="Введите текст с форматированием..."
        />
      </div>

      <div
        style={{
          textAlign: 'right',
          marginTop: '0.5rem',
          fontSize: '0.9rem',
          color: '#666',
        }}
      >
        {charCount} / {maxLength}
      </div>
    </div>
  );
};

export default TextAreaMarkdown;

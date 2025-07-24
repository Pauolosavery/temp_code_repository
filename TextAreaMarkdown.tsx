import { Button, Icon, IconCatalog, Space, Tooltip, Typography } from '@sber-genf-lib/astra-ui-kit';
import {
    CompositeDecorator,
    Editor,
    EditorState,
    ContentState,
    Modifier,
    RichUtils,
    convertFromRaw,
    convertToRaw,
} from 'draft-js';
import { draftToMarkdown, markdownToDraft } from 'markdown-draft-js';
import React, { useCallback, useRef, useState } from 'react';
import 'draft-js/dist/Draft.css';

type Props = {
  onChange: (markdown: string) => void;
  initialValue?: string;
  maxLength?: number;
};

const defaultMaxLength = 2000;

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
    const editorRef = useRef<Editor>(null);
    const focusEditorToEnd = () => {
        const content = editorState.getCurrentContent();
        const blockMap = content.getBlockMap();
        const lastBlock = blockMap.last();
        const key = lastBlock.getKey();
        const length = lastBlock.getLength();
      
        const selection = editorState.getSelection();
        const newSelection = selection.merge({
            anchorKey: key,
            anchorOffset: length,
            focusKey: key,
            focusOffset: length,
            isBackward: false,
        });
      
        const newEditorState = EditorState.forceSelection(editorState, newSelection);
        setEditorState(newEditorState);
        editorRef.current?.focus();
    };

    const [isOpenTooltipLink, setIsOpenTooltipLink] = useState(false);
    const [charCount, setCharCount] = useState(
        editorState.getCurrentContent().getPlainText().length
    );
const handlePastedText = (text: string, html: string | undefined, state: EditorState): boolean => {
    const currentContent = state.getCurrentContent();
    const selection = state.getSelection();

    const contentWithPastedText = Modifier.replaceText(currentContent, selection, text);
    const newPlainText = contentWithPastedText.getPlainText();

    if (newPlainText.length > maxLength) {
        const availableChars = maxLength - currentContent.getPlainText().length;
        if (availableChars <= 0) return true;

        const trimmedText = text.slice(0, availableChars);
        const limitedContent = Modifier.replaceText(currentContent, selection, trimmedText);
        const newState = EditorState.push(state, limitedContent, 'insert-characters');
        handleEditorChange(newState);
        return true;
    }

    const newState = EditorState.push(state, contentWithPastedText, 'insert-characters');
    handleEditorChange(newState);
    return true;
};

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
        const selection = editorState.getSelection();
        if (selection.isCollapsed()) {return;}

        let contentState = editorState.getCurrentContent();

        // Удаляем все inline-стили в выделении
        const currentStyles = ['BOLD', 'ITALIC', 'UNDERLINE'];
        currentStyles.forEach(style => {
            contentState = Modifier.removeInlineStyle(contentState, selection, style);
        });

        // Удаляем все entity (например, ссылки)
        contentState = Modifier.applyEntity(contentState, selection, null);

        const newEditorState = EditorState.push(editorState, contentState, 'change-inline-style');
        const forcedSelectionState = EditorState.forceSelection(newEditorState, selection);
        handleEditorChange(forcedSelectionState);
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
            if (!url) {return;}

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
            setIsOpenTooltipLink(true);
        }
    };

    useEffect(() => {
    return () => {
        const emptyState = EditorState.createWithContent(
            ContentState.createFromText(''),
            decorator
        );
        setEditorState(emptyState);
        onChange('');
    };
}, []);
    
    return (
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
            <Space size='large' style={{marginBottom: 12}}>
                <Space size='small'>
                    <Button type='secondary'
                        onClick={() => toggleInlineStyle('BOLD')}
                        icon={<Icon icon={IconCatalog.EditorOutlined.BoldOutlined}/>}
                    />
                    <Button type='secondary'
                        onClick={() => toggleInlineStyle('ITALIC')}
                        icon={<Icon icon={IconCatalog.EditorOutlined.ItalicOutlined}/>}
                    />
                    <Button type='secondary'
                        onClick={() => toggleInlineStyle('UNDERLINE')}
                        icon={<Icon icon={IconCatalog.EditorOutlined.UnderlineOutlined}/>}
                    />
                </Space>
                
                <Space size='small'>
                    <Button type='secondary'
                        icon={<Icon icon={IconCatalog.ApplicationOutlined.BarsOutlined}/>}
                        onClick={() => toggleBlockType('unordered-list-item')}/>
                    <Button type='secondary'
                        icon={<Icon icon={IconCatalog.EditorOutlined.OrderedListOutlined}/>}
                        onClick={() => toggleBlockType('ordered-list-item')}/>
                </Space>

                <Space size='small'>
                    <Button  type='secondary'
                        icon={<Icon icon={IconCatalog.EditorOutlined.DeleteOutlined}/>}
                        onClick={clearFormatting}
                    />
                </Space>

                <Space size='small'>
                    <Tooltip title='Сначала выделите текст, к которому хотите применить ссылку' open={isOpenTooltipLink}>
                        <Button  type='secondary'
                            icon={<Icon icon={IconCatalog.ApplicationOutlined.LinkOutlined}/>}
                            onClick={insertLink}
                            onMouseLeave={() => setIsOpenTooltipLink(false)}
                        />
                    </Tooltip>
                </Space>

                <Space size='small'>
                    <Button type='secondary'
                        color=''
                        icon={<Icon icon={IconCatalog.EditorOutlined.UndoOutlined}/>}
                        onClick={undo}
                        disabled={editorState.getUndoStack().size === 0}
                    />
                    <Button type='secondary'
                        icon={<Icon icon={IconCatalog.EditorOutlined.RedoOutlined}/>}
                        onClick={redo}
                        disabled={editorState.getRedoStack().size === 0}
                    />
                </Space>
            </Space>

            <div style={{ minHeight: '150px', cursor: 'text' }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        focusEditorToEnd();
                    }
                }}
            >
                <Editor
                    ref={editorRef}
                    editorState={editorState}
                    onChange={handleEditorChange}
                    handleKeyCommand={handleKeyCommand}
                    handlePastedText={handlePastedText}
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
                <Typography.Text color=''>
                    {charCount} / {maxLength}
                </Typography.Text>
            </div>
        </div>
    );
};

export default TextAreaMarkdown;

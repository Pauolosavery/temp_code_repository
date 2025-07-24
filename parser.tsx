import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

<ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                    >
                        {description}
                    </ReactMarkdown>

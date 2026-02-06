import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Paperclip,
  MoreVertical,
  User,
  Bot,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Code,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useNexusStore } from '../store/useNexusStore';
import type { ChatMessage } from '../types';

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'typescript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono text-zinc-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const MessageContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeLanguage = '';

  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <CodeBlock
            key={`code-${index}`}
            code={codeContent.trim()}
            language={codeLanguage}
          />
        );
        inCodeBlock = false;
        codeContent = '';
        codeLanguage = '';
      } else {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim() || 'typescript';
      }
      return;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      return;
    }

    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={index} className="font-semibold text-zinc-200 my-2">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={index} className="ml-4 text-zinc-300 my-1 flex items-start gap-2">
          <span className="text-zinc-500 mt-1">•</span>
          <span>{line.slice(2)}</span>
        </li>
      );
    } else if (line.match(/^\d+\./)) {
      elements.push(
        <li key={index} className="ml-4 text-zinc-300 my-1 flex items-start gap-2">
          <span className="text-zinc-500 font-medium min-w-[1.5rem]">{line.match(/^\d+/)?.[0]}.</span>
          <span>{line.replace(/^\d+\.\s*/, '')}</span>
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={index} className="h-2" />);
    } else {
      elements.push(
        <p key={index} className="text-zinc-300 leading-relaxed my-1">
          {line}
        </p>
      );
    }
  });

  return <div className="space-y-1">{elements}</div>;
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser
            ? 'bg-blue-500/20'
            : isSystem
            ? 'bg-zinc-800'
            : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-blue-400" />
        ) : isSystem ? (
          <Sparkles className="w-4 h-4 text-yellow-400" />
        ) : (
          <Bot className="w-4 h-4 text-purple-400" />
        )}
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-blue-500/10 border border-blue-500/20'
              : 'bg-zinc-900/50 border border-zinc-800'
          }`}
        >
          <MessageContent content={message.content} />

          {message.isStreaming && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span className="text-xs text-zinc-500">Thinking...</span>
            </div>
          )}
        </div>

        <div
          className={`flex items-center gap-2 mt-1 text-xs text-zinc-600 ${
            isUser ? 'justify-end' : ''
          }`}
        >
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {!isUser && !isSystem && (
            <button className="hover:text-zinc-400 transition-colors flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SuggestedPrompt: React.FC<{ text: string; onClick: () => void }> = ({ text, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all text-left"
  >
    {text}
  </button>
);

export const ChatPanel: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages, addMessage, updateChatStream, completeChatStream, nexusStatus, isConnected } = useNexusStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;
    if (isSending) return;

    setIsSending(true);
    const content = inputValue;

    // Clear input immediately for better UX
    setInputValue('');
    setAttachments([]);

    // Add user message locally for instant feedback
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);

    // Create placeholder assistant message with streaming indicator
    const assistantId = crypto.randomUUID();
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };
    addMessage(assistantPlaceholder);

    try {
      // Call backend
      const response: string = await invoke('send_chat_message', { message: content });

      // Update assistant message with real content
      updateChatStream(assistantId, response);
      completeChatStream(assistantId);
    } catch (error) {
      const errMsg = String(error);
      console.error('Failed to send message:', error);
      updateChatStream(assistantId, `Error: ${errMsg}`);
      completeChatStream(assistantId);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const newAttachments: Attachment[] = Array.from(files).map((file) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
        }));
        setAttachments([...attachments, ...newAttachments]);
      }
    };
    input.click();
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const suggestedPrompts = [
    'Refactor the API layer to use TypeScript strict mode',
    'Add comprehensive error handling to the database module',
    'Generate unit tests for the authentication service',
    'Optimize the React component re-renders',
  ];

  const isDisabled = isSending || !isConnected;

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/30">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Nexus Assistant</h2>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-zinc-500">
                    {nexusStatus?.provider || 'Nexus'} • {nexusStatus?.model || 'AI Model'}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  <span className="text-xs text-yellow-500">Offline Mode</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
          <MoreVertical className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/30">
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">Welcome to Nexus</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-6">
              I can help you with coding tasks, refactoring, debugging, and more. What would you
              like to work on today?
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {suggestedPrompts.map((prompt, index) => (
                <SuggestedPrompt
                  key={index}
                  text={prompt}
                  onClick={() => !isDisabled && setInputValue(prompt)}
                />
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 p-4">
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs"
              >
                <Paperclip className="w-3 h-3 text-zinc-500" />
                <span className="text-zinc-400 max-w-[150px] truncate">{attachment.name}</span>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="p-0.5 hover:bg-zinc-800 rounded"
                >
                  <Check className="w-3 h-3 text-zinc-500 rotate-45" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2 focus-within:border-zinc-700 focus-within:bg-zinc-800/50 transition-all">
          <button
            onClick={handleAttachment}
            disabled={isDisabled}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            title="Attach files"
          >
            <Paperclip className="w-4 h-4 text-zinc-500" />
          </button>

          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Type your message..." : "Connect to Nexus CLI to chat..."}
            disabled={isDisabled}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-zinc-200 placeholder:text-zinc-600 py-2 max-h-32 min-h-[40px] disabled:opacity-50"
            rows={1}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />

          <button
            onClick={handleSend}
            disabled={isDisabled || (!inputValue.trim() && attachments.length === 0)}
            className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-all flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-zinc-600">
          <div className="flex items-center gap-3">
            <button className="hover:text-zinc-400 transition-colors flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              <span>Image</span>
            </button>
            <button className="hover:text-zinc-400 transition-colors flex items-center gap-1">
              <Code className="w-3 h-3" />
              <span>Code</span>
            </button>
          </div>
          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;

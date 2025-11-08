import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Message, Source } from './types';
import { Role } from './types';

// --- Internationalization ---
type Language = 'en' | 'pt' | 'es';

const translations: Record<Language, {
  title: string;
  subtitle: string;
  initialMessage: string;
  inputPlaceholder: string;
  sourcesTitle: string;
  suggestedPrompts: string[];
}> = {
  en: {
    title: 'Gemini Chemistry Chat',
    subtitle: 'Your AI expert on the history and science of chemistry',
    initialMessage: 'Hello! I am a chemistry expert. How can I help you today with the history of chemistry, molecules, or substances?',
    inputPlaceholder: 'Ask about chemistry...',
    sourcesTitle: 'Sources',
    suggestedPrompts: [
      "Who was Fritz Haber and what is the Haber-Bosch process?",
      "Explain the discovery of penicillin.",
      "What is the chemical structure of caffeine?",
      "Tell me about the history of chemistry in Brazil.",
    ],
  },
  pt: {
    title: 'QuímIA Chat de Química',
    subtitle: 'Seu especialista em IA sobre a história e a ciência da química',
    initialMessage: 'Olá! Eu sou um especialista em química. Como posso ajudá-lo hoje com a história da química, moléculas ou substâncias?',
    inputPlaceholder: 'Pergunte sobre química...',
    sourcesTitle: 'Fontes',
    suggestedPrompts: [
      'Quem foi Fritz Haber e o que é o processo Haber-Bosch?',
      'Explique a descoberta da penicilina.',
      'Qual é a estrutura química da cafeína?',
      'Fale-me sobre a história da química no Brasil.',
    ],
  },
  es: {
    title: 'QuímIA Chat de Química',
    subtitle: 'Tu experto en IA sobre la historia y la ciencia de la química',
    initialMessage: '¡Hola! Soy un experto en química. ¿Cómo puedo ayudarte hoy con la historia de la química, moléculas o sustancias?',
    inputPlaceholder: 'Pregunta sobre química...',
    sourcesTitle: 'Fuentes',
    suggestedPrompts: [
      '¿Quién fue Fritz Haber y qué es el proceso Haber-Bosch?',
      'Explica el descubrimiento de la penicilina.',
      '¿Cuál es la estructura química de la cafeína?',
      'Háblame de la historia de la química en Brasil.',
    ],
  },
};


// --- Helper & Icon Components ---

const BotIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-8 h-8 text-indigo-400"
  >
    <path
      fillRule="evenodd"
      d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-4.518a.75.75 0 000 1.5h6.038a.75.75 0 00.75-.75V4.518a.75.75 0 00-1.5 0v4.518l-1.903-1.903A9 9 0 003.059 10.059v0c0 1.54.433 2.984 1.195 4.244a.75.75 0 001.134-.9A7.48 7.48 0 014.755 10.059zM19.245 13.941A7.5 7.5 0 0111.452 21a.75.75 0 000-1.5 6 6 0 005.996-6.059 6.002 6.002 0 00-11.053 2.485.75.75 0 10-1.135.9 7.5 7.5 0 0111.95-4.244v0z"
      clipRule="evenodd"
    />
    <path d="M11.625 10.125a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75z" />
    <path d="M12.375 7.125a.75.75 0 01.75.75v.001a.75.75 0 01-1.5 0v-.001a.75.75 0 01.75-.75z" />
  </svg>
);

const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-8 h-8 text-sky-400"
  >
    <path
      fillRule="evenodd"
      d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
      clipRule="evenodd"
    />
  </svg>
);

const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-6 h-6"
  >
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
);

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
  </svg>
);

const ThumbsUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.422 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H6.5" />
  </svg>
);

const ThumbsDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.367 13.5c-.806 0-1.533.422-2.031 1.08a9.041 9.041 0 0 1-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 0 0-.322 1.672v1.672a.75.75 0 0 1-.75.75A2.25 2.25 0 0 1 7.5 19.5c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282H4.374c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 0 1 2.75 6.5c.388-.962 1.284-1.69 2.28-1.816.502-.062 1.004-.093 1.506-.093h2.123c.806 0 1.533-.422 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75c.873 0 1.638.422 2.054 1.08.416.658.599 1.48.513 2.311-.086.83-.498 1.597-1.08 2.186-.582.59-1.35.92-2.186 1.08-.83.086-1.652-.097-2.311-.513A4.502 4.502 0 0 0 17.367 13.5Z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const ExportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const SYSTEM_INSTRUCTION_BASE = `You are a world-class expert chatbot specializing in the History of Chemistry, with a deep focus on its development in Brazil. Your knowledge is vast, drawing from scientific literature, and you are familiar with chemical databases and ontologies like ChEBI and EMMO. When asked about molecules or substances, you provide accurate, detailed information. For any historical claim or scientific fact, you MUST cite your sources. You will be provided with search results to ground your answers. Always use these results to formulate your response and list the source URLs at the end of your answer under a 'Sources:' heading.`;

const getSystemInstruction = (lang: Language): string => {
  const langMap: Record<Language, string> = {
    en: 'English',
    pt: 'Portuguese',
    es: 'Spanish',
  };
  return `${SYSTEM_INSTRUCTION_BASE}\n\nYou MUST respond in ${langMap[lang]}.`;
};

// --- Main Chat Components ---

interface ChatMessageProps {
  message: Message;
  sourcesTitle: string;
  onFeedback: (feedback: 'up' | 'down') => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, sourcesTitle, onFeedback }) => {
  const isModel = message.role === Role.MODEL;
  const [isCopied, setIsCopied] = useState(false);
  const [isSourcesCopied, setIsSourcesCopied] = useState(false);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  const hasSources = message.sources && message.sources.length > 0;

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleCopySources = () => {
    if (!hasSources) return;
    const sourcesText = message.sources.map(s => `${s.title}: ${s.uri}`).join('\n');
    navigator.clipboard.writeText(sourcesText).then(() => {
        setIsSourcesCopied(true);
        setTimeout(() => setIsSourcesCopied(false), 2000);
    }).catch(err => {
        console.error('Failed to copy sources: ', err);
    });
  };

  return (
    <div
      className={`flex items-start gap-4 my-4 ${
        isModel ? 'justify-start' : 'justify-end'
      }`}
    >
      {isModel && <BotIcon />}
      <div
        className={`group relative max-w-xl p-4 rounded-xl shadow-md ${
          isModel
            ? 'bg-slate-800 text-gray-200 rounded-tl-none'
            : 'bg-indigo-600 text-white rounded-br-none'
        }`}
      >
        {isModel && message.content && (
           <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
             {hasSources && (
                <button
                    onClick={handleCopySources}
                    className="p-1 rounded-md bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white transition-all"
                    aria-label="Copy sources to clipboard"
                    title="Copy Sources"
                >
                    {isSourcesCopied ? <CheckIcon /> : <LinkIcon />}
                </button>
            )}
            <button
              onClick={handleCopy}
              className="p-1 rounded-md bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white transition-all"
              aria-label="Copy message to clipboard"
              title="Copy Message"
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
            <button
                onClick={() => onFeedback('up')}
                className={`p-1 rounded-md bg-slate-700/50 hover:bg-slate-600 transition-colors ${
                    message.feedback === 'up' ? 'text-green-400' : 'text-slate-400'
                }`}
                aria-label="Thumbs up"
                title="Thumbs up"
            >
                <ThumbsUpIcon />
            </button>
            <button
                onClick={() => onFeedback('down')}
                className={`p-1 rounded-md bg-slate-700/50 hover:bg-slate-600 transition-colors ${
                    message.feedback === 'down' ? 'text-red-400' : 'text-slate-400'
                }`}
                aria-label="Thumbs down"
                title="Thumbs down"
            >
                <ThumbsDownIcon />
            </button>
          </div>
        )}
        <p className="whitespace-pre-wrap pr-16">{message.content}</p>
        {hasSources && (
          <div className="mt-4 pt-3 border-t border-slate-600">
            <button
              onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
              className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-400 mb-2 hover:text-white transition-colors"
              aria-expanded={isSourcesExpanded}
              aria-controls={`sources-${message.content.slice(0, 10)}`}
            >
              <span>{sourcesTitle} ({message.sources.length})</span>
              {isSourcesExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>
            {isSourcesExpanded && (
              <ul id={`sources-${message.content.slice(0, 10)}`} className="list-decimal list-inside text-sm space-y-2 mt-2">
                {message.sources.map((source, index) => (
                  <li key={index}>
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline"
                    >
                      {source.title}
                    </a>
                    {source.snippet && (
                      <blockquote className="mt-1 pl-2 border-l-2 border-slate-500 text-slate-400 text-xs italic">
                        "{source.snippet}"
                      </blockquote>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {!isModel && <UserIcon />}
    </div>
  );
};

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    placeholder: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, placeholder }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 bg-slate-800 border-t border-slate-700">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-grow p-3 bg-slate-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={isLoading}
                className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
                {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <SendIcon />
                )}
            </button>
        </form>
    );
}

interface SuggestedPromptsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  isLoading: boolean;
}

const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ prompts, onSelectPrompt, isLoading }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(prompt)}
            disabled={isLoading}
            className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-left text-gray-300 hover:bg-slate-800 hover:border-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
};


// --- App Component ---

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: Role.MODEL,
      content: translations['en'].initialMessage,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (process.env.API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }, []);

  useEffect(() => {
    setMessages(prev => {
        if (prev.length === 1) { // Only update if it's just the initial message
            return [{ ...prev[0], content: translations[language].initialMessage }];
        }
        return prev;
    });
  }, [language]);
  
  const handleFeedback = (messageIndex: number, newFeedback: 'up' | 'down') => {
    setMessages(prevMessages => 
        prevMessages.map((msg, index) => {
            if (index === messageIndex) {
                // If the current feedback is the same as the new one, toggle it off.
                // Otherwise, set it to the new feedback.
                const updatedFeedback = msg.feedback === newFeedback ? undefined : newFeedback;
                return { ...msg, feedback: updatedFeedback };
            }
            return msg;
        })
    );
  };

  const handleClearChat = () => {
    setMessages([
        {
            role: Role.MODEL,
            content: translations[language].initialMessage,
        },
    ]);
    setIsLoading(false);
  };

  const handleExportChat = () => {
    const formattedChat = messages.map(msg => {
      let content = `[${msg.role.toUpperCase()}]\n${msg.content}`;
      if (msg.role === Role.MODEL && msg.sources && msg.sources.length > 0) {
        const sourcesText = msg.sources.map(s => `- ${s.title}: ${s.uri}`).join('\n');
        content += `\n\nSources:\n${sourcesText}`;
      }
      return content;
    }).join('\n\n---\n\n');

    const blob = new Blob([formattedChat], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-chemistry-chat-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = useCallback(async (text: string) => {
    if (!aiRef.current) {
      alert("API Key not configured. Please set the API_KEY environment variable.");
      return;
    }

    const userMessage: Message = { role: Role.USER, content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const modelMessage: Message = { role: Role.MODEL, content: "" };
    setMessages((prev) => [...prev, modelMessage]);

    try {
      const history = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));
      history.push({ role: Role.USER, parts: [{ text }] });
      
      const responseStream = await aiRef.current.models.generateContentStream({
        model: 'gemini-2.5-pro',
        contents: history,
        config: {
          systemInstruction: getSystemInstruction(language),
          tools: [{ googleSearch: {} }],
        },
      });

      let firstChunk = true;
      for await (const chunk of responseStream) {
        if (firstChunk) {
            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
            if (groundingMetadata?.groundingChunks) {
                const sources: Source[] = groundingMetadata.groundingChunks
                .map((c: any) => ({
                    uri: c.web?.uri ?? '',
                    title: c.web?.title ?? 'Untitled Source',
                    snippet: c.web?.snippet,
                }))
                .filter((s: Source) => s.uri);

                 setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    const updatedMsg = { ...lastMsg, sources: sources };
                    return [...prev.slice(0, -1), updatedMsg];
                });
            }
            firstChunk = false;
        }

        const chunkText = chunk.text;
        setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            const updatedMsg = { ...lastMsg, content: lastMsg.content + chunkText };
            return [...prev.slice(0, -1), updatedMsg];
        });
      }
    } catch (error) {
        console.error("Error generating content:", error);
        setMessages((prev) => {
            const lastMsg = prev[prev.length-1];
            const updatedMsg = { ...lastMsg, content: "Sorry, I encountered an error. Please try again." };
            return [...prev.slice(0, -1), updatedMsg];
        });
    } finally {
        setIsLoading(false);
    }
  }, [messages, language]);

  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col font-sans text-gray-200">
        <header className="relative p-4 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 shadow-md">
            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center space-x-1 text-sm">
                <button 
                    onClick={handleExportChat}
                    className="p-2 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-700/50"
                    title="Export Chat"
                    aria-label="Export chat conversation as a text file"
                >
                    <ExportIcon />
                </button>
                <button 
                    onClick={handleClearChat}
                    className="p-2 rounded-md transition-colors text-slate-400 hover:text-white hover:bg-slate-700/50"
                    title="Clear Chat"
                    aria-label="Clear chat conversation"
                >
                    <TrashIcon />
                </button>
                <div className="h-5 w-px bg-slate-600 mx-1"></div>
                <button onClick={() => setLanguage('pt')} className={`px-2 py-1 rounded-md transition-colors ${language === 'pt' ? 'font-bold text-white bg-indigo-600/50' : 'text-slate-400 hover:text-white'}`}>PT</button>
                <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded-md transition-colors ${language === 'en' ? 'font-bold text-white bg-indigo-600/50' : 'text-slate-400 hover:text-white'}`}>EN</button>
                <button onClick={() => setLanguage('es')} className={`px-2 py-1 rounded-md transition-colors ${language === 'es' ? 'font-bold text-white bg-indigo-600/50' : 'text-slate-400 hover:text-white'}`}>ES</button>
            </div>
            <h1 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">
                {translations[language].title}
            </h1>
            <p className="text-center text-sm text-slate-400 mt-1">{translations[language].subtitle}</p>
        </header>

        <main ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {messages.map((msg, index) => (
                    <ChatMessage
                        key={index}
                        message={msg}
                        sourcesTitle={translations[language].sourcesTitle}
                        onFeedback={(feedback) => handleFeedback(index, feedback)}
                    />
                ))}
                {isLoading && messages[messages.length-1].role === Role.USER && (
                    <div className="flex items-start gap-4 my-4 justify-start">
                        <BotIcon />
                        <div className="max-w-xl p-4 rounded-xl shadow-md bg-slate-800 text-gray-200 rounded-tl-none flex items-center space-x-2">
                           <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-0"></div>
                           <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-200"></div>
                           <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-400"></div>
                        </div>
                    </div>
                )}
            </div>
             {messages.length === 1 && (
                <SuggestedPrompts
                    prompts={translations[language].suggestedPrompts}
                    onSelectPrompt={handleSendMessage}
                    isLoading={isLoading}
                />
            )}
        </main>
        
        <footer className="w-full max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} placeholder={translations[language].inputPlaceholder} />
        </footer>
    </div>
  );
};

export default App;

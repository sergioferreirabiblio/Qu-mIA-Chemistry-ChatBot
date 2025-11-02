
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Message, Source } from './types';
import { Role } from './types';

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

const SYSTEM_INSTRUCTION = `You are a world-class expert chatbot specializing in the History of Chemistry, with a deep focus on its development in Brazil. Your knowledge is vast, drawing from scientific literature, and you are familiar with chemical databases and ontologies like ChEBI and EMMO. When asked about molecules or substances, you provide accurate, detailed information. For any historical claim or scientific fact, you MUST cite your sources. You will be provided with search results to ground your answers. Always use these results to formulate your response and list the source URLs at the end of your answer under a 'Sources:' heading.`;


// --- Main Chat Components ---

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isModel = message.role === Role.MODEL;

  return (
    <div
      className={`flex items-start gap-4 my-4 ${
        isModel ? 'justify-start' : 'justify-end'
      }`}
    >
      {isModel && <BotIcon />}
      <div
        className={`max-w-xl p-4 rounded-xl shadow-md ${
          isModel
            ? 'bg-slate-800 text-gray-200 rounded-tl-none'
            : 'bg-indigo-600 text-white rounded-br-none'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-600">
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Sources:</h4>
            <ul className="list-decimal list-inside text-sm space-y-1">
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
                </li>
              ))}
            </ul>
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
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
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
                placeholder="Ask about chemistry..."
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

// --- App Component ---

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: Role.MODEL,
      content:
        'Hello! I am a chemistry expert. How can I help you today with the history of chemistry, molecules, or substances?',
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
          systemInstruction: SYSTEM_INSTRUCTION,
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
  }, [messages]);

  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col font-sans text-gray-200">
        <header className="p-4 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 shadow-md">
            <h1 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">
                Gemini Chemistry Chat
            </h1>
            <p className="text-center text-sm text-slate-400 mt-1">Your AI expert on the history and science of chemistry</p>
        </header>

        <main ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {messages.map((msg, index) => (
                    <ChatMessage key={index} message={msg} />
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
        </main>
        
        <footer className="w-full max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </footer>
    </div>
  );
};

export default App;

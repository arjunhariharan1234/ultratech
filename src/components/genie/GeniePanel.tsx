"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, MessageCircle } from "lucide-react";
import type { GenieContext } from "@/lib/genie/context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GeniePanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: GenieContext | null;
}

interface GenieResponse {
  answerMarkdown: string;
  citations?: Array<{
    type: "row" | "aggregate" | "filter";
    reference: string;
    value?: string | number;
  }>;
  debug?: {
    processingTimeMs: number;
    questionCategory: string;
    matchedPatterns: string[];
  };
}

const SUGGESTED_QUESTIONS = [
  "Which branch has the highest recovery?",
  "Top 5 consignees by diversion count",
  "What's the average short lead distance?",
  "Show corridors with most diversions",
  "Total potential recovery this month",
  "Which vehicles have repeated diversions?",
  "Compare Burdwan vs other depots",
  "Penalty candidates over ₹1000",
];

export function GeniePanel({ isOpen, onClose, context }: GeniePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      const response = await fetch("/api/genie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage.content,
          context: context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const data: GenieResponse = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answerMarkdown,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      console.error("Genie API error:", err);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, context]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRetry = () => {
    setError(null);
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
      if (lastUserMessage) {
        setInput(lastUserMessage.content);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - Right drawer on desktop (below nav), bottom sheet on mobile */}
      <div
        className={`
          fixed z-40 bg-white shadow-2xl flex flex-col
          inset-x-0 bottom-0 h-[85vh] rounded-t-2xl
          lg:inset-x-auto lg:right-0 lg:top-16 lg:bottom-auto lg:h-[calc(100vh-4rem)] lg:w-[420px] lg:border-l lg:border-ft-gray-200 lg:rounded-none
        `}
        role="dialog"
        aria-label="Genie Chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ft-gray-200 bg-ft-black text-white rounded-t-2xl lg:rounded-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ft-yellow rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-ft-black" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Genie</h2>
              <p className="text-xs text-ft-gray-400">Diversion Insights Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close Genie"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-ft-yellow/10 rounded-2xl flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-ft-yellow" />
              </div>
              <h3 className="text-lg font-semibold text-ft-gray-900 mb-2">
                Ask Genie anything
              </h3>
              <p className="text-sm text-ft-gray-500 mb-6 max-w-[280px]">
                Get insights about diversions, branches, consignees, corridors, and recovery amounts.
              </p>

              {/* Suggested Questions */}
              <div className="w-full">
                <p className="text-xs font-medium text-ft-gray-400 mb-3 uppercase tracking-wide">
                  Try asking
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSuggestedQuestion(q)}
                      className="px-3 py-1.5 bg-ft-gray-100 hover:bg-ft-yellow/20 text-ft-gray-700 text-xs rounded-full transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] px-4 py-2.5 rounded-2xl ${
                      message.role === "user"
                        ? "bg-ft-black text-white rounded-br-md"
                        : "bg-ft-gray-50 text-ft-gray-900 rounded-bl-md border border-ft-gray-200"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div
                        className="text-sm prose prose-sm max-w-none prose-headings:text-ft-gray-900 prose-headings:font-semibold prose-h2:text-sm prose-h2:mt-3 prose-h2:mb-2 prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-th:text-left prose-th:bg-ft-gray-100 prose-td:px-2 prose-td:py-1 prose-td:border-t prose-td:border-ft-gray-200"
                        dangerouslySetInnerHTML={{
                          __html: formatMarkdown(message.content)
                        }}
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-ft-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-ft-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-ft-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-ft-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <span>{error}</span>
                    <button
                      onClick={handleRetry}
                      className="text-red-600 hover:text-red-800 font-medium underline"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Suggested chips when there are messages */}
        {messages.length > 0 && messages.length < 4 && !isTyping && (
          <div className="px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {SUGGESTED_QUESTIONS.slice(4, 8).map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggestedQuestion(q)}
                  className="flex-shrink-0 px-3 py-1.5 bg-ft-gray-100 hover:bg-ft-yellow/20 text-ft-gray-600 text-xs rounded-full transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-ft-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about diversions..."
              className="flex-1 px-4 py-2.5 bg-ft-gray-50 border border-ft-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ft-yellow focus:border-transparent"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-4 py-2.5 bg-ft-yellow hover:bg-ft-yellow-dark disabled:opacity-50 disabled:cursor-not-allowed text-ft-black rounded-xl transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Simple markdown to HTML converter for structured responses
function formatMarkdown(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      const isHeader = match.includes('---');
      if (isHeader) return '';
      return `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
    })
    // Wrap tables
    .replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="w-full text-xs">$&</table>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    // Wrap lists
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc list-inside">$&</ul>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  return `<div>${html}</div>`;
}

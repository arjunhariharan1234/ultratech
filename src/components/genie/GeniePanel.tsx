"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GeniePanelProps {
  isOpen: boolean;
  onClose: () => void;
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

// Mock responses based on keywords
function getMockResponse(question: string): string {
  const q = question.toLowerCase();

  if (q.includes("branch") && (q.includes("highest") || q.includes("top"))) {
    return "Based on the current data, **Burdwan Depot** has the highest recovery potential at ₹45,230 across 12 diverted journeys. This is followed by Durgapur Depot (₹32,100) and Asansol Depot (₹28,450).";
  }

  if (q.includes("consignee") && (q.includes("top") || q.includes("count"))) {
    return "Top 5 consignees by diversion count:\n\n1. **WBQ4-BHATAR** - 8 diversions (₹12,400 recovery)\n2. **WBQ2-MONGALKOT** - 6 diversions (₹9,800)\n3. **WBQ1-KATWA** - 5 diversions (₹7,200)\n4. **WBQ3-MEMARI** - 4 diversions (₹5,600)\n5. **WBQ5-RAINA** - 3 diversions (₹4,100)";
  }

  if (q.includes("average") && q.includes("short lead")) {
    return "The **average short lead distance** across all diversions is **24.3 km**. The maximum recorded diversion distance is 67.2 km (Journey JRN-3d71265f).";
  }

  if (q.includes("corridor")) {
    return "Top corridors with most diversions:\n\n1. **BURDWAN-T2 → MONGALKOT** - 15 diversions\n2. **DURGAPUR-T1 → KATWA** - 11 diversions\n3. **ASANSOL-T1 → MEMARI** - 8 diversions\n\nThese three corridors account for 45% of all diversions.";
  }

  if (q.includes("recovery") && q.includes("month")) {
    return "Total potential recovery for the current month: **₹1,24,560**\n\nBreakdown:\n- Week 1: ₹32,400\n- Week 2: ₹41,200\n- Week 3: ₹28,960\n- Week 4 (so far): ₹22,000";
  }

  if (q.includes("vehicle") && q.includes("repeat")) {
    return "Vehicles with repeated diversions (3+ occurrences):\n\n1. **WB41J4135** - 5 diversions, ₹8,200 total impact\n2. **WB39K2847** - 4 diversions, ₹6,100 total impact\n3. **WB42L1923** - 3 diversions, ₹4,800 total impact\n\nRecommendation: Flag these vehicles for driver counseling.";
  }

  if (q.includes("burdwan") || q.includes("compare") && q.includes("depot")) {
    return "**Burdwan Depot** comparison:\n\n| Metric | Burdwan | Avg (Others) |\n|--------|---------|-------------|\n| Diversions | 28 | 15 |\n| Recovery | ₹45,230 | ₹22,100 |\n| Avg Lead | 26.4 km | 21.2 km |\n\nBurdwan has 1.8x more diversions than average.";
  }

  if (q.includes("penalty") && q.includes("1000")) {
    return "Found **12 penalty candidates** with recovery > ₹1,000:\n\nTop 3:\n1. JRN-3d71265f - ₹2,340 (Burdwan → Mongalkot)\n2. JRN-8a92bc45 - ₹1,890 (Durgapur → Katwa)\n3. JRN-5c61de78 - ₹1,560 (Asansol → Memari)\n\nView full list in the Penalty Candidates table below.";
  }

  return "I analyzed the diversion data based on your question. The dashboard shows real-time insights from your Google Sheet. You can use the filters above to narrow down by branch, consignee, or date range for more specific analysis.\n\nTry asking about specific branches, consignees, corridors, or recovery amounts.";
}

export function GeniePanel({ isOpen, onClose }: GeniePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: getMockResponse(userMessage.content),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  }, [input]);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-50 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel - Right drawer on desktop, bottom sheet on mobile */}
      <div
        className={`
          fixed z-50 bg-white shadow-2xl flex flex-col
          lg:right-0 lg:top-0 lg:h-full lg:w-[400px] lg:border-l lg:border-ft-gray-200
          inset-x-0 bottom-0 h-[85vh] rounded-t-2xl lg:rounded-none
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
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                      message.role === "user"
                        ? "bg-ft-black text-white rounded-br-md"
                        : "bg-ft-gray-100 text-ft-gray-900 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Suggested chips when there are messages */}
        {messages.length > 0 && messages.length < 4 && (
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

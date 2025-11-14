/**
 * Chat Interface Page
 *
 * Simple chat interface for communicating with dat1 gpt-oss-120b model using streaming.
 *
 * Responsibilities:
 * - Display chat messages between user and AI
 * - Handle user input and send messages to streaming API
 * - Show loading states during API calls
 */

'use client';

import { useState } from 'react';

// ============================================================================
// INTERFACES
// ============================================================================

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Displays the endpoint URL being used for chat
 */
function EndpointDisplay() {
  const [endpoint, setEndpoint] = useState<string>('dat1 gpt-oss-120b');

  useState(() => {
    fetch('/api/endpoint')
      .then((res) => res.json())
      .then((data) => setEndpoint(data.endpoint))
      .catch(() => setEndpoint('dat1 gpt-oss-120b'));
  });

  return <p>Send a message to start chatting with {endpoint}</p>;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Sends user message to chat API and displays streaming response
   */
  const sendMessage = async (): Promise<void> => {
    if (!input.trim()) {
      throw new Error('Cannot send empty message');
    }

    if (loading) {
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    const allMessages = [...messages, userMessage];

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Add empty assistant message that will be populated with streaming content
    const assistantMessageIndex = allMessages.length;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const response = await fetch('/api/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: allMessages,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from chat API');
    }

    // Read the streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let accumulatedContent = '';
    let finalData = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and parse SSE format
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          // Check for stream end marker
          if (data === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              accumulatedContent += content;
              // Update the assistant message with accumulated content
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[assistantMessageIndex] = {
                  role: 'assistant',
                  content: accumulatedContent,
                };
                return newMessages;
              });
            }

            // Capture final data chunk that may contain timing info
            if (parsed.usage || parsed.timings) {
              finalData = parsed;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Add timing info if available
    if (finalData) {
      const timings = finalData.timings;
      const usage = finalData.usage;
      let thinkingInfo = '';

      if (timings) {
        const promptTime = timings.prompt_ms?.toFixed(0) || '0';
        const predictTime = timings.predicted_ms?.toFixed(0) || '0';
        const tokensPerSec = timings.predicted_per_second?.toFixed(1) || '0';
        thinkingInfo = `Prompt: ${promptTime}ms | Generation: ${predictTime}ms | Speed: ${tokensPerSec} tok/s`;

        if (usage) {
          thinkingInfo += ` | Tokens: ${usage.total_tokens}`;
        }
      }

      // Update the message with timing info
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[assistantMessageIndex] = {
          role: 'assistant',
          content: accumulatedContent,
          thinking: thinkingInfo,
        };
        return newMessages;
      });
    }

    setLoading(false);
  };

  /**
   * Handles Enter key press to send message
   * @param e - Keyboard event
   */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /**
   * Resets the chat by clearing all messages
   */
  const resetChat = (): void => {
    setMessages([]);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            dat1 Chat (Streaming)
          </h1>
        </div>
      </header>

      {/* Messages - Scrollable container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
              <EndpointDisplay />
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.thinking && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {message.thinking}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-white px-4 py-2 dark:bg-zinc-800">
                <p className="text-zinc-500 dark:text-zinc-400">Thinking...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-500 focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-400"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500"
            >
              Send
            </button>
            <button
              onClick={resetChat}
              disabled={loading}
              className="rounded-lg border border-zinc-300 bg-white px-6 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

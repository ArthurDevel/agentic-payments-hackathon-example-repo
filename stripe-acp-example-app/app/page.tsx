/**
 * Chat Interface Page
 *
 * Chat interface for communicating with dat1 gpt-oss-120b model with streaming support.
 *
 * Responsibilities:
 * - Display chat messages between user and AI
 * - Handle user input and send messages to API
 * - Stream responses from the AI model
 * - Show loading states during API calls
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import PaymentForm from './components/PaymentForm';

// ============================================================================
// INTERFACES
// ============================================================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CheckoutState {
  checkoutId: string;
  amount: number;
  currency: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutState, setCheckoutState] = useState<CheckoutState | null>(null);
  const conversationIdRef = useRef<string>(Date.now().toString());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Scrolls to the bottom of the message list
   */
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for ready checkout when messages change
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      checkForReadyCheckout();
    }
  }, [messages, isLoading]);

  /**
   * Checks if checkout is ready for payment by querying the API
   */
  const checkForReadyCheckout = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/checkout-state?conversationId=${conversationIdRef.current}`);
      if (response.ok) {
        const data = await response.json();
        if (data.checkout) {
          setCheckoutState(data.checkout);
        } else {
          setCheckoutState(null);
        }
      }
    } catch (error) {
      // Silently fail - this is just for detecting checkout state
      console.debug('Could not check checkout state:', error);
    }
  };

  /**
   * Handles chat message submission
   * @param event - Form submit event
   */
  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCheckoutState(null); // Reset checkout state when user sends new message

    try {
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId: conversationIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                assistantMessage += content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return newMessages;
                });
              }
            } catch (parseError) {
              // Skip invalid JSON in streaming response
            }
          }
        }
      }

      // Check for ready checkout after response completes
      await checkForReadyCheckout();
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error processing your request.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles payment completion and notifies agent
   * @param paymentIntentId - Stripe payment intent ID
   */
  const handlePaymentComplete = async (paymentIntentId: string): Promise<void> => {
    if (!checkoutState) return;

    // Send payment intent ID to agent via chat message
    // Format: explicit instruction for the agent to complete checkout
    const paymentMessage = `Please complete the checkout. Checkout ID: ${checkoutState.checkoutId}, Payment token (payment_intent_id): ${paymentIntentId}`;
    
    // Clear checkout state first
    setCheckoutState(null);
    
    // Create and submit the payment message
    const userMessage: Message = { role: 'user', content: paymentMessage };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId: conversationIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                assistantMessage += content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return newMessages;
                });
              }
            } catch (parseError) {
              // Skip invalid JSON in streaming response
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, there was an error processing your payment.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles payment errors
   * @param error - Error message
   */
  const handlePaymentError = (error: string): void => {
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `Payment error: ${error}. Please try again.`,
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold">Stripe ACP Chat</h1>
        <p className="text-sm text-gray-600">Chat with dat1 gpt-oss-120b</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation to shop with AI</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Payment Form - Show when checkout is ready */}
        {checkoutState && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-4 bg-white border-2 border-blue-200 shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Complete Your Payment</h3>
              <p className="text-sm text-gray-600 mb-4">
                Total: ${(checkoutState.amount / 100).toFixed(2)} {checkoutState.currency.toUpperCase()}
              </p>
              <PaymentForm
                checkoutId={checkoutState.checkoutId}
                amount={checkoutState.amount}
                currency={checkoutState.currency}
                onPaymentComplete={handlePaymentComplete}
                onError={handlePaymentError}
              />
            </div>
          </div>
        )}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-2 bg-white border border-gray-200">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message... (e.g., 'I want to buy shoes')"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: string;
  content: string;
}

interface OnboardingChatProps {
  onComplete: () => void;
}

export function OnboardingChat({ onComplete }: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [toolInProgress, setToolInProgress] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingVoiceMessageRef = useRef<string | null>(null);

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, streamingContent]);

  // Cleanup stream reader on unmount
  useEffect(() => {
    return () => {
      if (streamReaderRef.current) {
        streamReaderRef.current.cancel().catch(() => {});
        streamReaderRef.current = null;
      }
    };
  }, []);

  // Auto-focus textarea
  useEffect(() => {
    if (hasStarted && textareaRef.current) {
      const timeoutId = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [hasStarted, messages]);

  // Handle mobile keyboard visibility using visualViewport API
  // This ensures the chat input stays visible when the keyboard opens on iOS/Android
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!hasStarted) {
      setKeyboardHeight(0);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // Calculate the difference between window height and viewport height
      // This difference is the keyboard height on mobile
      const heightDiff = window.innerHeight - viewport.height;
      // Only set if significant (> 100px indicates keyboard, not just address bar)
      setKeyboardHeight(heightDiff > 100 ? heightDiff : 0);
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    // Initial check
    handleResize();

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, [hasStarted]);

  // Auto-send voice message after transcription completes
  useEffect(() => {
    if (!isTranscribing && pendingVoiceMessageRef.current && input === pendingVoiceMessageRef.current) {
      const messageToSend = pendingVoiceMessageRef.current;
      pendingVoiceMessageRef.current = null;
      handleSend(messageToSend);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranscribing, input]);

  // Sanitize HTML to prevent XSS
  const sanitizeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Simple markdown formatting
  const formatMarkdown = (text: string) => {
    return sanitizeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-1">$1</h1>')
      .replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$&</li>')
      .replace(/\n/g, '<br />');
  };

  // Start the onboarding conversation
  const startOnboarding = async () => {
    setHasStarted(true);
    setLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          sessionId: null,
          startConversation: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start onboarding');
      }

      await handleStream(response);
    } catch (error) {
      console.error('Onboarding start error:', error);
      setMessages([{
        role: 'assistant',
        content: 'Sorry, I had trouble starting. Please refresh the page and try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle streaming response
  const handleStream = async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    streamReaderRef.current = reader;

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'session') {
              setSessionId(data.sessionId);
            } else if (data.type === 'tool_start') {
              setToolInProgress(data.tool);
            } else if (data.type === 'tool_end') {
              setToolInProgress(null);
            } else if (data.type === 'content') {
              fullContent += data.content;
              setStreamingContent(fullContent);
            } else if (data.type === 'done') {
              if (fullContent) {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: fullContent
                }]);
              }
              setStreamingContent('');
              setToolInProgress(null);
            } else if (data.type === 'onboarding_complete') {
              // Onboarding is done - trigger completion
              onComplete();
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
    streamReaderRef.current = null;
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreamingContent('');

    if (streamReaderRef.current) {
      streamReaderRef.current.cancel().catch(() => {});
      streamReaderRef.current = null;
    }

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      await handleStream(response);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
      setStreamingContent('');
      setToolInProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    if (input === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  // Voice Recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (audioBlob.size > 0) {
          setIsTranscribing(true);
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/speech/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              if (data.text) {
                pendingVoiceMessageRef.current = data.text;
                setInput(data.text);
              }
            }
          } catch (error) {
            console.error('Transcription error:', error);
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Press-and-hold mic button handlers
  const handleMicTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default to avoid long-press context menu
    if (!loading && !isTranscribing && !isRecording) {
      startRecording();
    }
  }, [loading, isTranscribing, isRecording, startRecording]);

  const handleMicTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleMicMouseDown = useCallback(() => {
    if (!loading && !isTranscribing && !isRecording) {
      startRecording();
    }
  }, [loading, isTranscribing, isRecording, startRecording]);

  const handleMicMouseUp = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  // Handle mouse leaving the button while pressed
  const handleMicMouseLeave = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  // Welcome screen before starting
  if (!hasStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-lg text-center">
          <div className="text-6xl mb-6">🏋️</div>
          <h1 className="text-3xl font-bold mb-4">Welcome to Your Fitness Journey</h1>
          <p className="text-slate-300 mb-8 text-lg">
            Let&apos;s create a personalized workout plan just for you. I&apos;ll ask a few questions
            about your experience, goals, and equipment to design the perfect program.
          </p>
          <button
            onClick={startOnboarding}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-full text-lg font-semibold transition shadow-lg shadow-emerald-500/30"
          >
            Get Started
          </button>
          <p className="text-sm text-slate-500 mt-6">
            This takes about 5 minutes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col transition-all duration-150"
      style={{
        minHeight: keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px)` : '100vh',
        maxHeight: keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px)` : undefined
      }}
    >
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold">Setting Up Your Program</h1>
          <p className="text-sm text-slate-400">Answer a few questions to get your personalized plan</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={`inline-block rounded-2xl px-4 py-3 max-w-[85%] text-left ${
                msg.role === 'user' ? 'bg-emerald-600' : 'bg-slate-800'
              }`}>
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div
                    className="prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                )}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <div className="text-left">
              <div className="inline-block rounded-2xl px-4 py-3 max-w-[85%] bg-slate-800">
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(streamingContent) }}
                />
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
              </div>
            </div>
          )}

          {/* Tool progress */}
          {toolInProgress && (
            <div className="text-left">
              <div className="inline-block rounded-2xl px-4 py-3 bg-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{toolInProgress}...</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {loading && !streamingContent && !toolInProgress && (
            <div className="text-left">
              <div className="inline-block rounded-2xl px-4 py-3 bg-slate-800">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 px-4 py-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={loading || isRecording || isTranscribing}
            placeholder={isRecording ? "Recording..." : isTranscribing ? "Transcribing..." : "Type your answer..."}
            rows={1}
            className="flex-1 p-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50 resize-none overflow-hidden"
            style={{ minHeight: '48px', maxHeight: '150px' }}
          />
          <button
            onTouchStart={handleMicTouchStart}
            onTouchEnd={handleMicTouchEnd}
            onTouchCancel={handleMicTouchEnd}
            onMouseDown={handleMicMouseDown}
            onMouseUp={handleMicMouseUp}
            onMouseLeave={handleMicMouseLeave}
            disabled={loading || isTranscribing}
            className={`px-4 py-3 rounded-xl transition select-none touch-none ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : isTranscribing
                  ? 'bg-slate-700 cursor-wait'
                  : 'bg-slate-700 hover:bg-slate-600 active:bg-red-600'
            } disabled:opacity-50`}
            title={isRecording ? "Release to send" : isTranscribing ? "Transcribing..." : "Hold to record"}
          >
            {isTranscribing ? (
              <span className="text-xl">⏳</span>
            ) : isRecording ? (
              <span className="text-xl">🎙️</span>
            ) : (
              <span className="text-xl">🎤</span>
            )}
          </button>
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim() || isRecording || isTranscribing}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-medium transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

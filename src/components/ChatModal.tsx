'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  role: string;
  content: string;
}

interface PageContext {
  page: string;
  workoutSlug?: string;
  workoutTitle?: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string | null;
  autoSend?: boolean;
  completionId?: number | null;
  onInitialStateConsumed?: () => void;
  pageContext?: PageContext;
}

export function ChatModal({
  isOpen,
  onClose,
  initialMessage,
  autoSend,
  completionId,
  onInitialStateConsumed,
  pageContext
}: ChatModalProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [showRatingButtons, setShowRatingButtons] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [awaitingRating, setAwaitingRating] = useState(false);
  const [toolInProgress, setToolInProgress] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoSentRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const workoutUpdatedRef = useRef(false);

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, streamingContent]);

  // Cleanup audio and stream reader on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (streamReaderRef.current) {
        streamReaderRef.current.cancel().catch(() => {});
        streamReaderRef.current = null;
      }
    };
  }, []);

  // Auto-send initial message when modal opens with autoSend (hidden from user)
  useEffect(() => {
    if (isOpen && initialMessage && autoSend && !hasAutoSentRef.current && messages.length === 0) {
      hasAutoSentRef.current = true;
      // Track that we're in the completion workflow awaiting rating
      if (completionId) {
        setAwaitingRating(true);
      }
      // Send as hidden system instruction (not visible to user)
      handleSendHidden(initialMessage);
      onInitialStateConsumed?.();
    }
    // Note: handleSendHidden is intentionally excluded to prevent re-triggering on function recreation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMessage, autoSend, messages.length, onInitialStateConsumed, completionId]);

  // Reset auto-send tracking when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasAutoSentRef.current = false;
      workoutUpdatedRef.current = false;
      setShowRatingButtons(false);
      setRatingSubmitted(false);
      setAwaitingRating(false);
    }
  }, [isOpen]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (!isOpen || !textareaRef.current) {
      return;
    }

    // Small delay to ensure modal is rendered
    const timeoutId = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isOpen]);

  // Show rating buttons after AI responds to workout completion
  useEffect(() => {
    if (awaitingRating && !ratingSubmitted && !showRatingButtons && !loading && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setShowRatingButtons(true);
      }
    }
  }, [messages, awaitingRating, ratingSubmitted, showRatingButtons, loading]);

  // Handle rating button click
  const handleRatingClick = async (rating: 'too_easy' | 'just_right' | 'too_hard') => {
    setShowRatingButtons(false);
    setRatingSubmitted(true);
    setAwaitingRating(false);

    // Save rating to database
    if (completionId) {
      try {
        const response = await fetch(`/api/completions/${completionId}/feedback`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ difficulty_rating: rating })
        });
        if (!response.ok) {
          throw new Error('Failed to save rating');
        }
      } catch (error) {
        console.error('Failed to save rating:', error);
        // Provide user feedback and allow retry
        alert('Could not save your rating. Please try again.');
        setRatingSubmitted(false);
        setShowRatingButtons(true);
        return;
      }
    }

    // Send rating as chat message
    const ratingText = {
      too_easy: "That workout felt too easy for me.",
      just_right: "That workout was just right - good challenge!",
      too_hard: "That workout was too hard for me."
    };

    handleSend(ratingText[rating]);
  };

  // Sanitize HTML to prevent XSS
  const sanitizeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Simple markdown formatting (sanitizes first to prevent XSS)
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

  // Strip markdown for TTS
  const stripMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^#{1,3} (.+)$/gm, '$1')
      .replace(/^- /gm, '')
      .replace(/^\d+\. /gm, '');
  };

  // Send a hidden system instruction (not visible to user, but AI responds)
  const handleSendHidden = async (instruction: string) => {
    if (!instruction.trim() || loading) return;

    setLoading(true);
    setStreamingContent('');

    // Cancel any existing stream before starting new one
    if (streamReaderRef.current) {
      streamReaderRef.current.cancel().catch(() => {});
      streamReaderRef.current = null;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          sessionId,
          systemInstruction: instruction,
          pageContext
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader() || null;
      if (!reader) {
        throw new Error('No response body');
      }
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
                // Track if workout was updated to refresh UI later
                if (data.tool === 'Updating workout') {
                  workoutUpdatedRef.current = true;
                }
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
                // Refresh page if workout was updated
                if (workoutUpdatedRef.current) {
                  workoutUpdatedRef.current = false;
                  router.refresh();
                }
              }
            } catch {
              // Ignore parse errors for malformed data
            }
          }
        }
      }
      streamReaderRef.current = null;
    } catch (error) {
      console.error('Chat error:', error);
      if (streamReaderRef.current) {
        streamReaderRef.current.cancel().catch(() => {});
        streamReaderRef.current = null;
      }
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

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreamingContent('');

    // Cancel any existing stream before starting new one
    if (streamReaderRef.current) {
      streamReaderRef.current.cancel().catch(() => {});
      streamReaderRef.current = null;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          sessionId,
          pageContext
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader() || null;
      if (!reader) {
        throw new Error('No response body');
      }
      streamReaderRef.current = reader;

      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = ''; // Buffer for incomplete SSE lines

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last potentially incomplete line in buffer
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
                // Track if workout was updated to refresh UI later
                if (data.tool === 'Updating workout') {
                  workoutUpdatedRef.current = true;
                }
              } else if (data.type === 'content') {
                fullContent += data.content;
                setStreamingContent(fullContent);
              } else if (data.type === 'done') {
                // Finalize the message
                if (fullContent) {
                  setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: fullContent
                  }]);
                }
                setStreamingContent('');
                setToolInProgress(null);
                // Refresh page if workout was updated
                if (workoutUpdatedRef.current) {
                  workoutUpdatedRef.current = false;
                  router.refresh();
                }
              }
            } catch {
              // Ignore parse errors for malformed data
            }
          }
        }
      }
      // Clear ref after successful completion
      streamReaderRef.current = null;
    } catch (error) {
      console.error('Chat error:', error);
      // Cancel reader to prevent resource leak
      if (streamReaderRef.current) {
        streamReaderRef.current.cancel().catch(() => {});
        streamReaderRef.current = null;
      }
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

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Reset height to auto to get the correct scrollHeight
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  // Reset textarea height when input is cleared
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
                setInput(data.text);
              }
            } else {
              console.error('Transcription failed');
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

  // Text-to-Speech
  const speakMessage = useCallback(async (text: string, index: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (speakingIndex === index && isSpeaking) {
      setIsSpeaking(false);
      setSpeakingIndex(null);
      return;
    }

    setIsSpeaking(true);
    setSpeakingIndex(index);

    try {
      const cleanText = stripMarkdown(text);

      const response = await fetch('/api/speech/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        throw new Error('TTS failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setSpeakingIndex(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setSpeakingIndex(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      setSpeakingIndex(null);
    }
  }, [isSpeaking, speakingIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-slate-900 w-full md:max-w-2xl md:rounded-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">Personal Trainer</h2>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setSessionId(null);
                }}
                className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                title="Start new conversation"
              >
                New Chat
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {messages.length === 0 && !streamingContent && (
            <div className="text-center text-slate-400 py-8">
              <p className="mb-2">Your personal fitness coach</p>
              <p className="text-sm">I can help with:</p>
              <ul className="text-sm mt-2 space-y-1 text-left max-w-xs mx-auto">
                <li>• Exercise technique and form</li>
                <li>• Workout modifications</li>
                <li>• Training advice for your goals</li>
                <li>• Equipment recommendations</li>
              </ul>
              <p className="text-xs mt-4 text-slate-500">
                Tell me about your equipment, goals, or injuries — I&apos;ll remember for next time!
              </p>
              <p className="text-xs mt-2 text-slate-500">
                🎤 Tap the microphone to use voice input
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={`inline-block rounded-lg px-4 py-2 max-w-[80%] text-left ${
                msg.role === 'user' ? 'bg-emerald-600' : 'bg-slate-800'
              }`}>
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <>
                    <div
                      className="prose prose-invert prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                    />
                    <button
                      onClick={() => speakMessage(msg.content, i)}
                      className="mt-2 text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                      title={speakingIndex === i && isSpeaking ? "Stop speaking" : "Listen to response"}
                    >
                      {speakingIndex === i && isSpeaking ? (
                        <>
                          <span className="text-emerald-400">◼</span> Stop
                        </>
                      ) : (
                        <>
                          <span>🔊</span> Listen
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <div className="text-left">
              <div className="inline-block rounded-lg px-4 py-2 max-w-[80%] bg-slate-800">
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(streamingContent) }}
                />
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
              </div>
            </div>
          )}

          {/* Tool progress indicator */}
          {toolInProgress && (
            <div className="text-left">
              <div className="inline-block rounded-lg px-4 py-2 bg-slate-800">
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

          {/* Loading indicator (shown before streaming starts, when no tool is running) */}
          {loading && !streamingContent && !toolInProgress && (
            <div className="text-left">
              <div className="inline-block rounded-lg px-4 py-2 bg-slate-800">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Rating buttons for workout completion feedback */}
          {showRatingButtons && !ratingSubmitted && (
            <div className="flex justify-center gap-2 py-4">
              <button
                onClick={() => handleRatingClick('too_easy')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-sm font-medium transition"
              >
                Too Easy
              </button>
              <button
                onClick={() => handleRatingClick('just_right')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition"
              >
                Just Right
              </button>
              <button
                onClick={() => handleRatingClick('too_hard')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium transition"
              >
                Too Hard
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={loading || isRecording || isTranscribing}
            placeholder={isRecording ? "Recording..." : isTranscribing ? "Transcribing..." : "Type a message..."}
            rows={1}
            className="flex-1 p-3 rounded bg-slate-800 text-white border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50 resize-none overflow-hidden"
            style={{ minHeight: '48px', maxHeight: '150px' }}
          />
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading || isTranscribing}
            className={`p-3 rounded transition ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : isTranscribing
                  ? 'bg-slate-700 cursor-wait'
                  : 'bg-slate-700 hover:bg-slate-600'
            } disabled:opacity-50`}
            title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Voice input"}
          >
            {isTranscribing ? (
              <span className="text-lg">⏳</span>
            ) : isRecording ? (
              <span className="text-lg">⏹</span>
            ) : (
              <span className="text-lg">🎤</span>
            )}
          </button>
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim() || isRecording || isTranscribing}
            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded text-white font-medium transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

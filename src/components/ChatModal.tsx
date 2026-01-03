'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: string;
  content: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, streamingContent]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat', {
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

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'session') {
                setSessionId(data.sessionId);
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
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
      setStreamingContent('');
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
              <div className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
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

          {/* Loading indicator (shown before streaming starts) */}
          {loading && !streamingContent && (
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
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || isRecording || isTranscribing}
            placeholder={isRecording ? "Recording..." : isTranscribing ? "Transcribing..." : "Type a message..."}
            className="flex-1 p-3 rounded bg-slate-800 text-white border border-slate-700 focus:border-emerald-500 outline-none disabled:opacity-50"
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

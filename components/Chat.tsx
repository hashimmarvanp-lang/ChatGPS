
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../types';
import { generateText } from '../services/geminiService';
import { SendIcon, LoaderIcon, SparklesIcon, MicIcon, TrashIcon } from './Icons';
import { Content, GoogleGenAI, LiveServerMessage, Blob, LiveSession } from '@google/genai';

// Helper function for audio encoding
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

interface ChatProps {
  currentUser: string;
}

const Chat: React.FC<ChatProps> = ({ currentUser }) => {
  const CHAT_HISTORY_KEY = `chatgps-chat-history-${currentUser}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
        const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
        console.error("Failed to load chat history from localStorage", error);
        return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [useLiteModel, setUseLiteModel] = useState(false);
  const [subject, setSubject] = useState('General');
  const [problemType, setProblemType] = useState('General Question');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (error) {
        console.error("Failed to save chat history to localStorage", error);
    }
  }, [messages, CHAT_HISTORY_KEY]);


  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: input }],
    };
    setMessages((prev) => [...prev, userMessage]);

    let promptForAI = input;
    if (subject !== 'General' || problemType !== 'General Question') {
        promptForAI = `As an expert in ${subject}, please help me with the following task: ${problemType}.\n\nHere is my problem:\n${input}`;
    }

    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts
      })) as Content[];

      const response = await generateText(promptForAI, history, useLiteModel);
      const modelMessage: ChatMessage = {
        role: 'model',
        parts: [{ text: response.text }],
      };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'model',
        parts: [{ text: 'Sorry, I encountered an error. Please try again.' }],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.then(session => session.close());
        sessionRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
     if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    setInput('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      sessionRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: { inputAudioTranscription: {} },
        callbacks: {
          onopen: async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;

            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              if (sessionRef.current) {
                sessionRef.current.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
            setIsRecording(true);
          },
          onmessage: (message: LiveServerMessage) => {
            const transcript = message.serverContent?.inputTranscription?.text;
            if (transcript) {
              setInput(prev => prev + transcript);
            }
          },
          onerror: (e) => {
            console.error('Live session error:', e);
            stopRecording();
          },
          onclose: () => {
             // Handled by stopRecording
          },
        },
      });
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not start recording. Please ensure you have given microphone permissions.');
      setIsRecording(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear the chat history? This action cannot be undone.')) {
        setMessages([]);
    }
  };

  useEffect(() => {
    return () => {
        stopRecording();
    }
  }, [stopRecording]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0">
                <SparklesIcon className="w-5 h-5" />
              </div>
            )}
            <div
              className={`max-w-xl p-4 rounded-2xl whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-500 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
              }`}
            >
              {msg.parts[0].text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0">
                <SparklesIcon className="w-5 h-5" />
            </div>
            <div className="max-w-xl p-4 rounded-2xl bg-white dark:bg-gray-700">
                <LoaderIcon className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <div className="mb-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                    <span className="material-symbols-outlined text-lg mr-2 text-indigo-500">school</span>
                    Homework Helper
                </h4>
                {messages.length > 0 && (
                    <button
                        onClick={handleClearHistory}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <TrashIcon className="w-4 h-4" />
                        Clear History
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="subject" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Subject</label>
                    <select 
                        id="subject" 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)} 
                        className="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        disabled={isRecording}
                    >
                        <option>General</option>
                        <option>Math</option>
                        <option>Science</option>
                        <option>English</option>
                        <option>History</option>
                        <option>Computer Science</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="problemType" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Task</label>
                    <select 
                        id="problemType" 
                        value={problemType} 
                        onChange={e => setProblemType(e.target.value)} 
                        className="w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        disabled={isRecording}
                    >
                        <option>General Question</option>
                        <option>Solve an Equation</option>
                        <option>Explain a Concept</option>
                        <option>Outline an Essay</option>
                        <option>Debug Code</option>
                        <option>Fact Check</option>
                    </select>
                </div>
            </div>
        </div>
        <form onSubmit={handleSend} className="flex items-center gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Listening..." : "Ask a question..."}
            className="flex-1 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading || isRecording}
          />
          <button
            type="button"
            onClick={handleMicClick}
            className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            disabled={isLoading}
          >
            <MicIcon className={`w-6 h-6 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
          </button>
          <button
            type="submit"
            className="p-3 bg-indigo-500 text-white rounded-lg disabled:bg-indigo-300 hover:bg-indigo-600 transition-colors"
            disabled={isLoading || !input.trim() || isRecording}
          >
            <SendIcon className="w-6 h-6" />
          </button>
        </form>
         <div className="flex items-center mt-2">
            <label htmlFor="lite-model-toggle" className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" id="lite-model-toggle" className="sr-only" checked={useLiteModel} onChange={() => setUseLiteModel(!useLiteModel)} />
                <div className="block bg-gray-600 w-10 h-6 rounded-full"></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useLiteModel ? 'transform translate-x-full bg-indigo-400' : ''}`}></div>
              </div>
              <div className="ml-3 text-gray-700 dark:text-gray-300 text-sm font-medium">
                Use Fast Response Model (Flash Lite)
              </div>
            </label>
          </div>
      </div>
    </div>
  );
};

export default Chat;
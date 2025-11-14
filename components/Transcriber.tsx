
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Blob } from '@google/genai';
import { MicIcon } from './Icons';

// Helper function for audio encoding
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const Transcriber: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [finalizedTranscription, setFinalizedTranscription] = useState('');

  const sessionRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const stopTranscription = useCallback(() => {
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
    setFinalizedTranscription(prev => prev + transcription);
    setTranscription('');
  }, [transcription]);

  const startTranscription = async () => {
    if (isRecording) return;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      sessionRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;
            
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              if (sessionRef.current) {
                  sessionRef.current.then((session) => {
                      session.sendRealtimeInput({ media: pcmBlob });
                  });
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
            setIsRecording(true);
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => prev + message.serverContent.inputTranscription.text);
            }
            if (message.serverContent?.turnComplete) {
              setFinalizedTranscription(prev => prev + transcription);
              setTranscription('');
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Transcription error:', e);
            stopTranscription();
          },
          onclose: () => {
            setIsRecording(false);
          },
        },
      });
    } catch (err) {
      console.error('Failed to start transcription:', err);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      stopTranscription();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Audio Transcriber</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Record your voice and get a live transcription.</p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
            <button
                onClick={isRecording ? stopTranscription : startTranscription}
                className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300
                    ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}
                `}
            >
                <MicIcon className="w-12 h-12 text-white" />
                {isRecording && <div className="absolute inset-0 rounded-full border-4 border-white animate-pulse"></div>}
            </button>
            <p className="text-lg font-medium">{isRecording ? 'Recording...' : 'Tap to Record'}</p>
            <div className="w-full max-w-3xl h-80 bg-white dark:bg-gray-700 rounded-lg p-6 overflow-y-auto shadow-inner text-gray-800 dark:text-gray-200">
                <p className="whitespace-pre-wrap">
                  {finalizedTranscription}
                  <span className="text-gray-500 dark:text-gray-400">{transcription}</span>
                </p>
            </div>
        </div>
    </div>
  );
};

export default Transcriber;

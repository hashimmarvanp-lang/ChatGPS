
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { MicIcon } from './Icons';

// Helper functions for audio encoding/decoding
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// fix: Updated audio decoding function to match guideline implementation for robustness.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const LiveChat: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<{ user: string; model: string }[]>([]);
  const [currentInterim, setCurrentInterim] = useState({ user: '', model: '' });
  
  const sessionRef = useRef<Promise<LiveSession> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const stopConversation = useCallback(() => {
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
    setIsActive(false);
    setIsConnecting(false);
  }, []);

  const startConversation = async () => {
    if (isActive || isConnecting) return;

    setIsConnecting(true);
    setTranscription([]);
    setCurrentInterim({ user: '', model: '' });

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let nextStartTime = 0;
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContext.createGain();
        outputNode.connect(outputAudioContext.destination);

        sessionRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                systemInstruction: 'You are ChatGPS, a friendly and helpful AI assistant for students. Keep your answers concise and conversational.',
                inputAudioTranscription: {},
                outputAudioTranscription: {}
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
                    setIsConnecting(false);
                    setIsActive(true);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        setCurrentInterim(prev => ({ ...prev, user: prev.user + message.serverContent.inputTranscription.text }));
                    }
                    if (message.serverContent?.outputTranscription) {
                        setCurrentInterim(prev => ({ ...prev, model: prev.model + message.serverContent.outputTranscription.text }));
                    }

                    if (message.serverContent?.turnComplete) {
                        setTranscription(prev => [...prev, currentInterim]);
                        setCurrentInterim({user: '', model: ''});
                    }
                    
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio) {
                        nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                        // fix: Pass sample rate and channel count to the updated decodeAudioData function.
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                        const source = outputAudioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    stopConversation();
                },
                onclose: () => {
                    stopConversation();
                }
            }
        });
    } catch (err) {
        console.error('Failed to start conversation:', err);
        setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => {
        stopConversation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
            <button
                onClick={isActive ? stopConversation : startConversation}
                disabled={isConnecting}
                className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300
                    ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}
                    ${isConnecting ? 'bg-gray-400 cursor-not-allowed' : ''}
                `}
            >
                <MicIcon className="w-16 h-16 text-white" />
                {isActive && <div className="absolute inset-0 rounded-full border-4 border-white animate-pulse"></div>}
            </button>
            <div className="text-center">
                <p className="text-lg font-medium">{isConnecting ? 'Connecting...' : (isActive ? 'Conversation Active' : 'Tap to Start')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{isActive ? 'Tap to end the conversation' : 'Allow microphone access'}</p>
            </div>
            <div className="w-full max-w-2xl h-64 bg-white dark:bg-gray-700 rounded-lg p-4 overflow-y-auto shadow-inner">
                {transcription.map((turn, index) => (
                    <div key={index} className="mb-2">
                        <p><strong className="text-indigo-500">You:</strong> {turn.user}</p>
                        <p><strong className="text-green-500">ChatGPS:</strong> {turn.model}</p>
                    </div>
                ))}
                { (currentInterim.user || currentInterim.model) &&
                    <div>
                         <p className="text-gray-500"><strong className="text-indigo-500">You:</strong> {currentInterim.user}</p>
                         <p className="text-gray-500"><strong className="text-green-500">ChatGPS:</strong> {currentInterim.model}</p>
                    </div>
                }
            </div>
        </div>
    </div>
  );
};

export default LiveChat;
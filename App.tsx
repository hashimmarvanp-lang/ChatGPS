
import React, { useState } from 'react';
import Chat from './components/Chat';
import MediaAnalyzer from './components/MediaAnalyzer';
import LiveChat from './components/LiveChat';
import Transcriber from './components/Transcriber';
import { SparklesIcon, MessageSquareIcon, FilmIcon, MicIcon, AudioLinesIcon, GraduationCapIcon } from './components/Icons';

type Feature = 'chat' | 'media' | 'live' | 'transcribe';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<Feature>('chat');

  const navItems = [
    { id: 'chat', name: 'Student Chat', icon: <MessageSquareIcon /> },
    { id: 'media', name: 'Media Analyzer', icon: <FilmIcon /> },
    { id: 'live', name: 'Live Conversation', icon: <AudioLinesIcon /> },
    { id: 'transcribe', name: 'Audio Transcriber', icon: <MicIcon /> },
  ] as const;

  const renderFeature = () => {
    switch (activeFeature) {
      case 'chat':
        return <Chat />;
      case 'media':
        return <MediaAnalyzer />;
      case 'live':
        return <LiveChat />;
      case 'transcribe':
        return <Transcriber />;
      default:
        return <Chat />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <aside className="w-64 bg-white dark:bg-gray-800 flex flex-col border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-20 border-b border-gray-200 dark:border-gray-700 px-4">
           <GraduationCapIcon className="h-8 w-8 text-indigo-500" />
          <h1 className="text-xl font-bold ml-2">EduBot AI</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveFeature(item.id)}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeFeature === item.id
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span className="w-6 h-6 mr-3">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <SparklesIcon className="w-5 h-5 mr-2 text-indigo-400" />
            <span>Powered by Gemini</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen">
        {renderFeature()}
      </main>
    </div>
  );
};

export default App;


import React, { useState } from 'react';
import Chat from './components/Chat';
import MediaAnalyzer from './components/MediaAnalyzer';
import LiveChat from './components/LiveChat';
import Transcriber from './components/Transcriber';
import LoginPage from './components/LoginPage';
import { SparklesIcon, MessageSquareIcon, FilmIcon, MicIcon, AudioLinesIcon, GraduationCapIcon, LogOutIcon, MenuIcon, XIcon } from './components/Icons';

type Feature = 'chat' | 'media' | 'live' | 'transcribe';

interface NavItem {
  id: Feature;
  name: string;
  // fix: Use React.ReactElement to avoid JSX namespace error.
  icon: React.ReactElement;
  description: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: readonly NavItem[];
  activeFeature: Feature;
  setActiveFeature: (feature: Feature) => void;
  currentUser: string | null;
  handleLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, navItems, activeFeature, setActiveFeature, currentUser, handleLogout }) => {
  const handleNavItemClick = (feature: Feature) => {
    setActiveFeature(feature);
    onClose();
  };
    
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      />
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 flex flex-col border-r border-gray-200 dark:border-gray-700 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between h-20 border-b border-gray-200 dark:border-gray-700 px-4">
          <div className="flex items-center">
            <GraduationCapIcon className="h-8 w-8 text-indigo-500" />
            <h1 className="text-xl font-bold ml-2 text-gray-900 dark:text-gray-100">ChatGPS AI</h1>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <XIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavItemClick(item.id)}
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
          {currentUser && (
            <div className="mb-4">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Signed in as</p>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate">{currentUser}</p>
            </div>
          )}
           <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <LogOutIcon className="w-6 h-6 mr-3" />
            <span>Logout</span>
          </button>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            <SparklesIcon className="w-5 h-5 mr-2 text-indigo-400" />
            <span>Powered by Gemini</span>
          </div>
        </div>
      </aside>
    </>
  );
};


const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<Feature>('chat');
  const [currentUser, setCurrentUser] = useState<string | null>(() => sessionStorage.getItem('chatgps-currentUser'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'chat', name: 'Student Chat', icon: <MessageSquareIcon />, description: 'Get help with homework or ask about school services.' },
    { id: 'media', name: 'Media Analyzer', icon: <FilmIcon />, description: 'Upload an image or video and ask questions about it.' },
    { id: 'live', name: 'Conversation Audio Transfer', icon: <AudioLinesIcon />, description: 'Speak directly with the AI assistant in real-time.' },
    { id: 'transcribe', name: 'Audio Transcriber', icon: <MicIcon />, description: 'Record your voice and get a live transcription.' },
  ] as const;
  
  const handleLogin = (username: string) => {
    setCurrentUser(username);
    sessionStorage.setItem('chatgps-currentUser', username);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out? Your chat history on this device will be permanently deleted.')) {
        if (currentUser) {
            localStorage.removeItem(`chatgps-chat-history-${currentUser}`);
        }
        setCurrentUser(null);
        sessionStorage.removeItem('chatgps-currentUser');
        setIsSidebarOpen(false);
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderFeature = () => {
    switch (activeFeature) {
      case 'chat':
        return <Chat currentUser={currentUser} />;
      case 'media':
        return <MediaAnalyzer />;
      case 'live':
        return <LiveChat />;
      case 'transcribe':
        return <Transcriber />;
      default:
        return <Chat currentUser={currentUser} />;
    }
  };

  const activeNavItem = navItems.find(item => item.id === activeFeature);

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        navItems={navItems}
        activeFeature={activeFeature}
        setActiveFeature={setActiveFeature}
        currentUser={currentUser}
        handleLogout={handleLogout}
      />
      <div className="flex flex-col h-screen">
        <header className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center shadow-sm flex-shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Open menu"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="ml-4">
            <h1 className="text-xl font-bold">{activeNavItem?.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{activeNavItem?.description}</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {renderFeature()}
        </main>
      </div>
    </div>
  );
};

export default App;
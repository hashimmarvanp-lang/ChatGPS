
import React, { useState } from 'react';
import { GraduationCapIcon, GoogleIcon, FacebookIcon, AppleIcon } from './Icons';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

// Hardcoded users for demonstration.
// In a real application, this would be replaced with a call to an authentication service.
const validUsers: Record<string, string> = {
    'student': 'pass123',
    'teacher': 'admin',
    'demouser': 'demo',
};

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (validUsers[username] === password) {
        setError('');
        onLogin(username);
    } else {
        setError('Invalid username or password.');
    }
  };
  
  const handleSocialLogin = (user: string) => {
    // For demo purposes, we'll log in a generic user.
    // In a real app, this would trigger the OAuth flow.
    setError('');
    onLogin(user);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg dark:bg-gray-800">
        <div className="text-center">
            <div className="flex items-center justify-center mx-auto mb-4 h-16 w-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
                <GraduationCapIcon className="h-10 w-10 text-indigo-500" />
            </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to ChatGPS AI</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to access your assistant.</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username (e.g., student)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password (e.g., pass123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-center text-red-500">{error}</p>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign In
            </button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>
        
        <div className="space-y-3">
            <button
                onClick={() => handleSocialLogin('demouser')}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
                <GoogleIcon className="w-5 h-5 mr-3" />
                <span>Continue with Google</span>
            </button>
            <button
                onClick={() => handleSocialLogin('demouser')}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1877F2] hover:bg-[#166fe5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
                <FacebookIcon className="w-5 h-5 mr-3" />
                <span>Continue with Facebook</span>
            </button>
            <button
                onClick={() => handleSocialLogin('demouser')}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black dark:bg-gray-200 dark:text-gray-800 dark:hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
                <AppleIcon className="w-5 h-5 mr-3" />
                <span>Continue with Apple</span>
            </button>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
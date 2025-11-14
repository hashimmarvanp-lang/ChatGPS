import React, { useState, useRef } from 'react';
import { generateTextAndImage, generateTextAndVideo } from '../services/geminiService';
import { LoaderIcon } from './Icons';

// Helper function to convert a file to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

const MediaAnalyzer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [filePreview, setFilePreview] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult('');
            setError('');
            const previewUrl = URL.createObjectURL(selectedFile);
            setFilePreview(previewUrl);
        }
    };

    const handleAnalyze = async () => {
        if (!file || !prompt.trim()) {
            setError('Please upload a file and enter a prompt.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult('');

        try {
            if (file.type.startsWith('image/')) {
                const base64Data = await fileToBase64(file);
                const response = await generateTextAndImage(prompt, { mimeType: file.type, data: base64Data });
                setResult(response.text);
            } else if (file.type.startsWith('video/')) {
                await analyzeVideo();
            } else {
                setError('Unsupported file type. Please upload an image or video.');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            setError('An error occurred during analysis. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const analyzeVideo = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !filePreview) return;

        video.src = filePreview;
        
        video.onloadeddata = async () => {
            const duration = video.duration;
            const framesToCapture = 10;
            const interval = duration / framesToCapture;
            const capturedFrames: { mimeType: string; data: string }[] = [];
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setError("Could not get canvas context.");
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            for (let i = 0; i < framesToCapture; i++) {
                video.currentTime = i * interval;
                await new Promise<void>(resolve => {
                    video.onseeked = () => {
                        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                        const dataUrl = canvas.toDataURL('image/jpeg');
                        capturedFrames.push({
                            mimeType: 'image/jpeg',
                            data: dataUrl.split(',')[1],
                        });
                        resolve();
                    };
                });
            }

            if (capturedFrames.length > 0) {
                 const response = await generateTextAndVideo(prompt, capturedFrames);
                 setResult(response.text);
            } else {
                setError("Could not capture any frames from the video.");
            }
        };
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Input Section */}
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-sm">
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload File</label>
                                <div className="mt-2">
                                    <input
                                        type="file"
                                        id="file-upload"
                                        name="file-upload"
                                        className="sr-only"
                                        accept="image/*,video/*"
                                        onChange={handleFileChange}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <span className="material-symbols-outlined mr-2 -ml-1 h-5 w-5">upload_file</span>
                                        Choose File
                                    </label>
                                </div>
                                {file && (
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        Selected: <span className="font-medium">{file.name}</span>
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    PNG, JPG, GIF, MP4 up to 50MB
                                </p>
                            </div>
                            {filePreview && (
                                <div className="border rounded-lg overflow-hidden">
                                    {file?.type.startsWith('image/') && <img src={filePreview} alt="Preview" className="w-full h-auto object-contain max-h-64" />}
                                    {file?.type.startsWith('video/') && <video ref={videoRef} src={filePreview} controls className="w-full h-auto max-h-64"></video>}
                                </div>
                            )}
                             <canvas ref={canvasRef} className="hidden"></canvas>
                            <div>
                                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Question</label>
                                <textarea
                                    id="prompt"
                                    rows={4}
                                    className="mt-1 block w-full rounded-md bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., What is happening in this image? or Summarize this video."
                                />
                            </div>
                            <button
                                onClick={handleAnalyze}
                                disabled={isLoading || !file || !prompt}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : 'Analyze'}
                            </button>
                        </div>
                    </div>

                    {/* Output Section */}
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Analysis Result</h3>
                        <div className="mt-4 prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 h-full overflow-y-auto">
                            {isLoading && <p>Analyzing, please wait... This might take a moment for videos.</p>}
                            {error && <p className="text-red-500">{error}</p>}
                            {result && <p className="whitespace-pre-wrap">{result}</p>}
                            {!result && !isLoading && !error && <p>Your analysis result will appear here.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaAnalyzer;

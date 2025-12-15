
import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon, MicrophoneIcon, XMarkIcon, PaperClipIcon } from '../icons';
import { processNaturalLanguageCommand, ContextData, AIResponse, ChatMessage } from '../../services/geminiService';
import { blobToBase64 } from '../../utils/helpers';

export type InputMode = 'text' | 'voice' | 'image';

interface AIAssistantProps {
    context: ContextData;
    onAction: (response: AIResponse) => void;
    allowedInputs?: InputMode[]; // ['text', 'voice', 'image'] default
}

const AIAssistant: React.FC<AIAssistantProps> = ({ context, onAction, allowedInputs = ['text', 'voice', 'image'] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: 'Hola, soy tu asistente. ¿En qué te ayudo?' }
    ]);
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isVoiceOnly = allowedInputs.length === 1 && allowedInputs.includes('voice');
    const canUseImage = allowedInputs.includes('image');
    const canUseText = allowedInputs.includes('text');

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'es-ES';

            recognitionRef.current.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                setInputText(text);
                setIsListening(false);
                if (isVoiceOnly) {
                    handleProcess(text); // Auto submit on voice only
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                setIsListening(false);
            };
            
            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [isVoiceOnly]);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            try {
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (e) {
                alert("No se puede acceder al micrófono.");
            }
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await blobToBase64(file);
                setSelectedImage(base64);
            } catch (err) {
                console.error("Error reading image", err);
            }
        }
    };

    const handleProcess = async (text: string) => {
        if (!text.trim() && !selectedImage) return;
        
        const userMsg: ChatMessage = { role: 'user', text, image: selectedImage || undefined };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        
        // Reset inputs
        setInputText('');
        setSelectedImage(null);
        setIsProcessing(true);
        
        try {
            const result = await processNaturalLanguageCommand(newHistory, context);
            
            if (result.action !== 'none') {
                onAction(result);
            }

            setMessages(prev => [...prev, { role: 'model', text: result.message }]);
            
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Error de conexión." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmitText = (e: React.FormEvent) => {
        e.preventDefault();
        handleProcess(inputText);
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-transform hover:scale-105 z-40 flex items-center justify-center border-2 border-white"
                title="Asistente IA"
            >
                <SparklesIcon className="w-8 h-8" />
            </button>

            <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                
                <div className={`bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[85vh] transition-transform duration-300 ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-10 scale-95'}`}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white shadow-md">
                        <div className="flex items-center space-x-2">
                            <SparklesIcon className="w-6 h-6" />
                            <div>
                                <h3 className="font-bold text-lg leading-tight">Asistente IA</h3>
                                <p className="text-xs text-indigo-100">
                                    {isVoiceOnly ? 'Modo Voz' : 'Multimodal'}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition-colors">
                            <XMarkIcon />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                {msg.image && (
                                    <img src={msg.image} alt="Upload" className="w-32 h-32 object-cover rounded-lg mb-2 border shadow-sm" />
                                )}
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-br-none' 
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        {selectedImage && (
                            <div className="mb-2 flex items-center bg-gray-100 p-2 rounded-lg">
                                <span className="text-xs text-gray-500 truncate flex-1">Imagen seleccionada</span>
                                <button onClick={() => setSelectedImage(null)} className="text-red-500 hover:text-red-700">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center space-x-2 justify-center">
                            
                            {/* Image Button (If allowed) */}
                            {canUseImage && (
                                <>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-3 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all flex-shrink-0"
                                        title="Adjuntar Imagen"
                                    >
                                        <PaperClipIcon className="w-5 h-5" />
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleImageUpload}
                                    />
                                </>
                            )}

                            {/* Mic Button */}
                            <button
                                onClick={toggleListening}
                                className={`p-3 rounded-full transition-all flex-shrink-0 ${
                                    isListening 
                                        ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-100 scale-110' 
                                        : isVoiceOnly ? 'bg-indigo-600 text-white hover:bg-indigo-700 w-12 h-12 flex items-center justify-center' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                                title="Dictar por voz"
                            >
                                <MicrophoneIcon className={`${isVoiceOnly ? 'w-6 h-6' : 'w-5 h-5'}`} />
                            </button>
                            
                            {/* Text Input (If allowed) */}
                            {canUseText && (
                                <form onSubmit={handleSubmitText} className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder={isListening ? "Escuchando..." : "Escribe una orden..."}
                                        className="w-full border-gray-200 bg-gray-50 rounded-full pl-5 pr-12 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                                        disabled={isProcessing}
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!inputText.trim() && !selectedImage || isProcessing}
                                        className="absolute right-2 top-1.5 bottom-1.5 bg-indigo-600 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
                                    >
                                        <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                        </svg>
                                    </button>
                                </form>
                            )}
                        </div>
                        {isVoiceOnly && <p className="text-center text-xs text-gray-400 mt-2">Modo solo voz activado</p>}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AIAssistant;

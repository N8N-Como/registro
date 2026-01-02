
import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon, MicrophoneIcon, XMarkIcon } from '../icons';
import { processNaturalLanguageCommand, ContextData, AIResponse, ChatMessage } from '../../services/geminiService';
import { updateRoomStatus, getRooms } from '../../services/mockApi';

export type InputMode = 'text' | 'voice' | 'image';

interface AIAssistantProps {
    context: ContextData;
    onAction: (response: AIResponse) => void;
    allowedInputs?: InputMode[] | null;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ context, onAction, allowedInputs }) => {
    const canType = allowedInputs?.includes('text') ?? true;
    
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: 'Hola, soy tu asistente de Como en Casa. ¿Qué necesitas gestionar hoy?' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.lang = 'es-ES';

            recognitionRef.current.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                setIsListening(false);
                handleProcess(text);
            };
            recognitionRef.current.onerror = () => setIsListening(false);
            recognitionRef.current.onend = () => setIsListening(false);
        }
    }, []);

    const toggleListening = () => {
        if (isListening) recognitionRef.current?.stop();
        else {
            try { recognitionRef.current?.start(); setIsListening(true); } 
            catch (e) { alert("Microfono no disponible"); }
        }
    };

    const handleProcess = async (text: string) => {
        if (!text.trim()) return;
        const userMsg: ChatMessage = { role: 'user', text };
        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setInputText('');
        setIsProcessing(true);
        try {
            const rooms = await getRooms();
            const result = await processNaturalLanguageCommand(newHistory, { ...context, rooms });
            if (result.action !== 'none' && result.data) {
                if (result.action === 'updateRoomStatus') {
                    await updateRoomStatus(result.data.room_id, result.data.status, context.currentUser?.employee_id);
                }
                onAction(result);
            }
            setMessages(prev => [...prev, { role: 'model', text: result.message }]);
            if ('speechSynthesis' in window) {
                const ut = new SpeechSynthesisUtterance(result.message);
                ut.lang = 'es-ES';
                window.speechSynthesis.speak(ut);
            }
        } catch (e) { setMessages(prev => [...prev, { role: 'model', text: "Error procesando comando." }]); } finally { setIsProcessing(false); }
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-gradient-to-tr from-primary to-indigo-600 text-white p-4 rounded-full shadow-2xl transition-all z-40 border-2 border-white">
                <SparklesIcon className="w-8 h-8" />
            </button>
            <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[550px]">
                    <div className="bg-primary p-4 flex justify-between items-center text-white font-bold">
                        <span>Asistente de Voz</span>
                        <button onClick={() => setIsOpen(false)}><XMarkIcon /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-primary text-white' : 'bg-white border shadow-sm'}`}>{m.text}</div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-6 border-t flex flex-col items-center gap-4">
                        <button onClick={toggleListening} className={`p-10 rounded-full ${isListening ? 'bg-red-500 animate-ping' : 'bg-primary text-white scale-110'}`}>
                            <MicrophoneIcon className="w-12 h-12" />
                        </button>
                        {canType && (
                            <form onSubmit={e => { e.preventDefault(); handleProcess(inputText); }} className="w-full flex gap-2">
                                <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} className="flex-1 border rounded-full px-4" placeholder="Escribe aquí..." />
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AIAssistant;

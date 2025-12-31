
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
    const canVoice = allowedInputs?.includes('voice') ?? true;
    
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
                // Ejecución directa para "Modo Manos Ocupadas"
                if (result.action === 'updateRoomStatus') {
                    await updateRoomStatus(result.data.room_id, result.data.status, context.currentUser?.employee_id);
                }
                onAction(result);
            }

            setMessages(prev => [...prev, { role: 'model', text: result.message }]);
            
            // TTS para confirmación sin manos
            if ('speechSynthesis' in window) {
                // Fix: Changed non-existent SynthesisUtterance to SpeechSynthesisUtterance
                const utterance = new SpeechSynthesisUtterance(result.message);
                utterance.lang = 'es-ES';
                window.speechSynthesis.speak(utterance);
            }

        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Error procesando comando." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 bg-gradient-to-tr from-primary to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all z-40 border-2 border-white">
                <SparklesIcon className="w-8 h-8" />
            </button>

            <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm bg-black/40 transition-all ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[550px]">
                    <div className="bg-primary p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5" />
                            <span className="font-bold">Asistente de Voz / Manos Ocupadas</span>
                        </div>
                        <button onClick={() => setIsOpen(false)}><XMarkIcon /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 rounded-2xl text-sm shadow-sm max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-white border rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isProcessing && <div className="text-xs text-gray-400 italic animate-pulse">Procesando orden...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-6 border-t flex flex-col items-center gap-4 bg-white">
                        <button
                            onClick={toggleListening}
                            className={`p-10 rounded-full transition-all shadow-xl ${isListening ? 'bg-red-500 text-white animate-ping' : 'bg-primary text-white scale-110'}`}
                        >
                            <MicrophoneIcon className="w-12 h-12" />
                        </button>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {isListening ? 'Escuchando...' : 'Pulsa para dar una orden'}
                        </p>
                        
                        {canType && (
                            <form onSubmit={(e) => { e.preventDefault(); handleProcess(inputText); }} className="w-full flex gap-2">
                                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} className="flex-1 border rounded-full px-4 text-sm" placeholder="O escribe aquí..." />
                                <button type="submit" className="bg-gray-100 p-2 rounded-full"><SparklesIcon className="w-4 h-4 text-primary"/></button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AIAssistant;

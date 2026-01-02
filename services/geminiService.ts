
import { GoogleGenAI } from "@google/genai";
import { Employee, Room, Location, InventoryItem, MaintenancePlan, ShiftConfig, StockPrediction } from '../types';

export interface ContextData {
    employees: Employee[];
    rooms?: Room[];
    locations: Location[];
    currentUser?: Employee;
    inventory?: InventoryItem[];
    maintenancePlans?: MaintenancePlan[];
}

export interface AIResponse {
    action: 'createTask' | 'createIncident' | 'createShift' | 'updateInventory' | 'createMaintenancePlan' | 'createDocument' | 'logLostItem' | 'addToShiftLog' | 'updateRoomStatus' | 'none';
    data?: any;
    message: string;
}

export interface PayrollMapping {
    page_number: number;
    employee_id: string;
    employee_name: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

/**
 * Analiza un PDF de nóminas y mapea cada página a un ID de empleado.
 */
export const identifyPayrollPages = async (pdfBase64: string, employees: Employee[]): Promise<PayrollMapping[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key de Gemini no configurada.");
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = pdfBase64.split(',')[1] || pdfBase64;
        const employeeList = employees.map(e => `${e.first_name} ${e.last_name} (ID: ${e.employee_id})`).join('\n');

        const prompt = `
        Analiza este documento PDF que contiene múltiples nóminas de empleados.
        
        LISTA DE EMPLEADOS AUTORIZADOS:
        ${employeeList}

        INSTRUCCIONES:
        1. Identifica qué empleado aparece en cada página del documento.
        2. Devuelve un array JSON con el número de página (empezando en 1) y el ID del empleado correspondiente.

        RESPUESTA ESPERADA (JSON):
        [{"page_number": 1, "employee_id": "id1", "employee_name": "Nombre Detectado"}]
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { 
                parts: [
                    { text: prompt }, 
                    { inlineData: { mimeType: 'application/pdf', data: base64Data } }
                ] 
            },
            config: { 
                responseMimeType: 'application/json'
            }
        });

        return JSON.parse(response.text || "[]");
    } catch (error: any) {
        console.error("AI Error:", error);
        throw new Error(error.message || "Error analizando el PDF.");
    }
};

/**
 * Analiza cuadrantes de horarios (PDF o Imagen)
 */
export const parseScheduleImage = async (imageBase64: string, employees: Employee[], shiftConfigs: ShiftConfig[], month: number, year: number): Promise<any[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API Key de Gemini no configurada.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        const mimeType = imageBase64.includes('application/pdf') ? 'application/pdf' : 'image/png';

        const prompt = `
        Analiza este cuadrante de turnos para el mes ${month} del año ${year}.
        IDs de Empleados válidos: ${employees.map(e => `${e.first_name}:${e.employee_id}`).join(', ')}
        Códigos de turno comunes: M (Mañana), T (Tarde), N (Noche), L (Libre), V (Vacaciones).

        Extrae los turnos para cada día y devuélvelos en este formato JSON:
        {"ID_EMPLEADO": {"DIA_NUMERICO": "CODIGO_TURNO"}}
        
        Ejemplo: {"id_juan": {"1": "M", "2": "T", "3": "L"}}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { 
                parts: [
                    { text: prompt }, 
                    { inlineData: { mimeType, data: base64Data } }
                ] 
            },
            config: { 
                responseMimeType: 'application/json'
            }
        });

        const compactData = JSON.parse(response.text || '{}');
        const results: any[] = [];
        Object.entries(compactData).forEach(([empId, days]: [string, any]) => {
            Object.entries(days).forEach(([dayStr, code]: [string, any]) => {
                results.push({ employee_id: empId, day: parseInt(dayStr, 10), shift_code: code });
            });
        });
        return results;
    } catch (error: any) {
        throw new Error("La IA no pudo procesar la imagen: " + error.message);
    }
};

export const processNaturalLanguageCommand = async (history: ChatMessage[], context: ContextData): Promise<AIResponse> => {
    if (!process.env.API_KEY) return { action: 'none', message: "API Key no configurada." };
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const roomContext = context.rooms?.map(r => `Habitación ${r.name} (ID: ${r.room_id})`).join(', ') || '';
        
        const systemInstruction = `
        Eres el asistente de 'Como en Casa'. Procesa órdenes de voz/texto.
        Contexto: Habitaciones: ${roomContext}.
        Acciones: updateRoomStatus, createIncident, updateInventory, addToShiftLog.
        Devuelve JSON: { action, data, message }.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
            config: { 
                systemInstruction: systemInstruction,
                responseMimeType: "application/json"
            }
        });

        return JSON.parse(response.text || '{"action":"none", "message":"No entiendo la orden."}');
    } catch (error) {
        return { action: 'none', message: "Error de conexión con el asistente." };
    }
};

export const analyzeStockTrends = async (inventory: InventoryItem[], logs: any[]): Promise<StockPrediction[]> => {
    if (!process.env.API_KEY) return [];
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analiza stock y logs. Devuelve JSON con predicciones de agotamiento de stock.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

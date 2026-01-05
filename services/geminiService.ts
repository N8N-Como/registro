
import { GoogleGenAI } from "@google/genai";
import { Employee, Room, Location, InventoryItem, MaintenancePlan, ShiftConfig, StockLog, StockPrediction } from '../types';

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

/**
 * Interface representing a chat message for AI context.
 */
// Added ChatMessage interface as it was missing and needed by AIAssistant.tsx
export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

/**
 * Analiza un PDF de nóminas y mapea cada página a un ID de empleado.
 */
export const identifyPayrollPages = async (pdfBase64: string, employees: Employee[]): Promise<PayrollMapping[]> => {
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
        2. El nombre en la nómina puede no ser exacto, usa lógica difusa para emparejarlo con la lista proporcionada.
        3. Devuelve un array JSON con el número de página (empezando en 1) y el ID del empleado correspondiente.

        RESPUESTA ESPERADA (JSON):
        [{"page_number": 1, "employee_id": "id1", "employee_name": "Nombre Detectado"}]
        
        Retorna SOLO el JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { 
                parts: [
                    { text: prompt }, 
                    { inlineData: { mimeType: 'application/pdf', data: base64Data } }
                ] 
            },
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || "[]");
    } catch (error) {
        console.error("AI Payroll Analysis Error:", error);
        throw new Error("Error analizando el PDF de nóminas.");
    }
};

/**
 * Analiza comandos de voz y texto para ejecutar acciones operativas directas.
 */
// Updated history parameter to use ChatMessage[] instead of any[]
export const processNaturalLanguageCommand = async (history: ChatMessage[], context: ContextData): Promise<AIResponse> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const roomContext = context.rooms?.map(r => `Habitación ${r.name} (ID: ${r.room_id})`).join(', ') || 'No hay habitaciones.';
        const empContext = context.employees.map(e => `${e.first_name} (ID: ${e.employee_id})`).join(', ');

        const systemInstruction = `
        Eres el cerebro de gestión de 'Como en Casa'. Tu objetivo es procesar órdenes rápidas de empleados.
        
        CONTEXTO OPERATIVO:
        - Habitaciones: ${roomContext}
        - Personal: ${empContext}

        ACCIONES POSIBLES:
        1. updateRoomStatus: Si dicen "habitación X terminada/limpia/sucia". Data: { room_id, status: 'clean' | 'dirty' | 'in_progress' }
        2. createIncident: Si reportan una avería. Data: { description, priority: 'high'|'medium'|'low' }
        3. updateInventory: Si dicen "añade/quita X unidades de Y". Data: { item_name, amount }
        4. none: Si es charla general o duda.

        REGLAS:
        - Si marcan una habitación como terminada, usa 'updateRoomStatus' con status 'clean'.
        - Responde siempre con un mensaje breve y profesional en español que pueda leerse por TTS.
        
        Devuelve siempre JSON con campos: action, data, message.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
            config: { 
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json' 
            }
        });

        return JSON.parse(response.text || '{"action":"none", "message":"No pude procesar la orden."}');
    } catch (error: any) {
        return { action: 'none', message: "Lo siento, hubo un error con el asistente de voz." };
    }
};

// Funciones existentes mantenidas...
export const analyzeStockTrends = async (inventory: InventoryItem[], logs: any[]): Promise<StockPrediction[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analiza stock y logs de consumo. Devuelve JSON con predicciones.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const parseScheduleImage = async (imageBase64: string, employees: Employee[], shiftConfigs: ShiftConfig[], month: number, year: number): Promise<any[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        const prompt = `Analiza cuadrante mensual. IDs: ${employees.map(e => e.employee_id).join(',')}. Retorna JSON.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64Data } }] },
            config: { responseMimeType: 'application/json' }
        });
        const compactData = JSON.parse(response.text || '{}');
        const results: any[] = [];
        Object.entries(compactData).forEach(([empId, days]: [string, any]) => {
            Object.entries(days).forEach(([dayStr, code]: [string, any]) => {
                results.push({ employee_id: empId, day: parseInt(dayStr, 10), shift_code: code });
            });
        });
        return results;
    } catch (error: any) { throw new Error(error.message); }
};

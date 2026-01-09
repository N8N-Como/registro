
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

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface PayrollMapping {
    page_number: number;
    employee_id: string;
    employee_name: string;
}

export const identifyPayrollPages = async (pdfBase64: string, employees: Employee[]): Promise<PayrollMapping[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = pdfBase64.split(',')[1] || pdfBase64;
        const employeeList = employees.map(e => `${e.first_name} ${e.last_name} (ID: ${e.employee_id})`).join('\n');
        const prompt = `Analiza este PDF de nóminas. LISTA EMPLEADOS: ${employeeList}. Devuelve JSON array con page_number y employee_id.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }, { inlineData: { mimeType: 'application/pdf', data: base64Data } }] },
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { throw new Error("Error analizando nóminas."); }
};

export const processNaturalLanguageCommand = async (history: ChatMessage[], context: ContextData): Promise<AIResponse> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const roomContext = context.rooms?.map(r => `${r.name} (${r.room_id})`).join(', ') || '';
        const systemInstruction = `Cerebro operativo Como en Casa. Contexto Habitaciones: ${roomContext}. Acciones: updateRoomStatus, createIncident, updateInventory. Devuelve JSON.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
            config: { systemInstruction, responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || '{"action":"none", "message":"Error"}');
    } catch (error) { return { action: 'none', message: "Error" }; }
};

export const analyzeStockTrends = async (inventory: InventoryItem[], logs: any[]): Promise<StockPrediction[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analiza stock: ${JSON.stringify(inventory)} y logs: ${JSON.stringify(logs.slice(0,30))}. Predice agotamiento. Devuelve JSON array StockPrediction.`;
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
        const employeeList = employees.map(e => `${e.first_name} ${e.last_name} (ID: ${e.employee_id})`).join('\n');
        
        const prompt = `
        Analiza esta imagen de un CUADRANTE LABORAL (enero).
        
        EMPLEADOS EN DB (ID y Nombre):
        ${employeeList}

        CÓDIGOS GUÍA:
        V25, V -> Vacaciones
        L, D -> Libre
        T, TH -> Tarde
        MM -> Media Mañana
        P -> Partida
        BM, BH, B -> Baja
        AD -> Asuntos
        S -> Saliente
        R -> Refuerzo

        INSTRUCCIONES:
        1. Asocia los nombres de la imagen con los IDs de la DB de arriba.
        2. Escanea todas las celdas (1-31).
        3. Solo devuelve celdas con texto.
        4. Respuesta obligatoria JSON compacto:
        { "id_empleado": { "dia": "codigo" } }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64Data } }] },
            config: { responseMimeType: 'application/json' }
        });
        
        const compactData = JSON.parse(response.text || '{}');
        const results: any[] = [];
        Object.entries(compactData).forEach(([empId, days]: [string, any]) => {
            // Validar que el empId realmente existe en nuestra lista
            if (employees.some(e => e.employee_id === empId)) {
                Object.entries(days).forEach(([dayStr, code]: [string, any]) => {
                    const day = parseInt(dayStr, 10);
                    if (day >= 1 && day <= 31) {
                        results.push({ employee_id: empId, day: day, shift_code: String(code).toUpperCase() });
                    }
                });
            }
        });
        return results;
    } catch (error: any) { throw new Error("La IA no pudo procesar la imagen correctamente."); }
};

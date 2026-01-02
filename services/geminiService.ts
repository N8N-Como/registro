
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

export const identifyPayrollPages = async (pdfBase64: string, employees: Employee[]): Promise<PayrollMapping[]> => {
    if (!process.env.API_KEY) throw new Error("API Key no configurada.");
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = pdfBase64.split(',')[1] || pdfBase64;
        const employeeList = employees.map(e => `${e.first_name} ${e.last_name} (ID: ${e.employee_id})`).join('\n');
        const prompt = `Analiza este PDF de nóminas. LISTA: ${employeeList}. Devuelve JSON: [{"page_number": 1, "employee_id": "id", "employee_name": "Nombre"}]`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [{ text: prompt }, { inlineData: { mimeType: 'application/pdf', data: base64Data } }] }, config: { responseMimeType: 'application/json' } });
        return JSON.parse(response.text || "[]");
    } catch (error: any) { throw new Error(error.message); }
};

export const parseScheduleImage = async (imageBase64: string, employees: Employee[], _shiftConfigs: ShiftConfig[], month: number, year: number): Promise<any[]> => {
    if (!process.env.API_KEY) throw new Error("API Key no configurada.");
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        const mimeType = imageBase64.includes('application/pdf') ? 'application/pdf' : 'image/png';
        const prompt = `Analiza cuadrante mes ${month} año ${year}. IDs: ${employees.map(e => `${e.first_name}:${e.employee_id}`).join(', ')}. JSON: {"ID_EMP": {"DIA": "CODIGO"}}`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }, config: { responseMimeType: 'application/json' } });
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

export const processNaturalLanguageCommand = async (history: ChatMessage[], context: ContextData): Promise<AIResponse> => {
    if (!process.env.API_KEY) return { action: 'none', message: "API Key no configurada." };
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const roomContext = context.rooms?.map(r => `Hab ${r.name} (ID: ${r.room_id})`).join(', ') || '';
        const systemInstruction = `Asistente 'Como en Casa'. Habitaciones: ${roomContext}. JSON: { action, data, message }. Acciones: updateRoomStatus, createIncident, updateInventory, addToShiftLog.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })), config: { systemInstruction: systemInstruction, responseMimeType: "application/json" } });
        return JSON.parse(response.text || '{"action":"none", "message":"No entiendo."}');
    } catch (error) { return { action: 'none', message: "Error." }; }
};

export const analyzeStockTrends = async (_inventory: InventoryItem[], _logs: any[]): Promise<StockPrediction[]> => {
    if (!process.env.API_KEY) return [];
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analiza stock y logs. Devuelve JSON con predicciones.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: { parts: [{ text: prompt }] }, config: { responseMimeType: "application/json" } });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

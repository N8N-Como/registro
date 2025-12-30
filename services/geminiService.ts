
import { GoogleGenAI, Type } from "@google/genai";
import { Employee, Room, Location, InventoryItem, MaintenancePlan, ShiftConfig } from '../types';

export interface ContextData {
    employees: Employee[];
    rooms?: Room[];
    locations: Location[];
    currentUser?: Employee;
    inventory?: InventoryItem[];
    maintenancePlans?: MaintenancePlan[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface AIResponse {
    action: 'createTask' | 'createIncident' | 'createShift' | 'updateInventory' | 'createMaintenancePlan' | 'createDocument' | 'logLostItem' | 'addToShiftLog' | 'none';
    data?: any;
    message: string;
}

export interface ParsedShiftFromImage {
    employee_id: string;
    day: number;
    shift_code: string; 
}

interface CompactSchedule {
    [employeeId: string]: {
        [day: string]: string; 
    }
}

const getAIClient = () => {
    const apiKey = process.env.API_KEY || (import.meta as any).env?.VITE_API_KEY;
    if (!apiKey) throw new Error("API Key not configured.");
    return new GoogleGenAI({ apiKey });
};

export const parseScheduleImage = async (
    imageBase64: string, 
    employees: Employee[], 
    shiftConfigs: ShiftConfig[],
    month: number,
    year: number
): Promise<ParsedShiftFromImage[]> => {
    try {
        const ai = getAIClient();
        const base64Data = imageBase64.split(',')[1] || imageBase64;

        const employeeContext = employees.map(e => `Name: "${e.first_name} ${e.last_name}", ID: "${e.employee_id}"`).join('\n');
        
        const prompt = `
        Analiza la imagen de este cuadrante mensual (Mes: ${month}, Año: ${year}).
        
        LISTA DE EMPLEADOS (Usa estos IDs exactos):
        ${employeeContext}

        REGLAS DE CÓDIGOS PARA HOSPITALITY:
        - TRABAJO (Type 'work'): M (Mañana), T (Tarde), P (Partido), R (Refuerzo), A (Apoyo), MM (Media Mañana), D (Disponibilidad), TH, BH, BM, AD, S.
        - AUSENCIA (Type 'off/vacation'): L (Libre), V (Vacaciones), V25, B (Baja).

        IMPORTANTE: Si ves una "P" es "PARTIDO" (TRABAJO), NUNCA permiso.

        INSTRUCCIONES:
        1. Localiza los nombres en la columna izquierda.
        2. Identifica el código en cada celda del día (1-31).
        3. Devuelve un JSON donde las llaves son los IDs de empleados y los valores son objetos { "dia": "codigo" }.
        
        EJEMPLO:
        { "id_noelia": { "1": "V25", "2": "L", "10": "T" } }
        
        Retorna SOLO JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64Data } }] }],
            config: { responseMimeType: 'application/json', temperature: 0.1 }
        });

        const text = response.text;
        if (!text) throw new Error("No se recibió respuesta de la IA");
        
        const compactData = JSON.parse(text) as CompactSchedule;
        const results: ParsedShiftFromImage[] = [];
        
        Object.entries(compactData).forEach(([empId, days]) => {
            if (employees.some(e => e.employee_id === empId)) {
                Object.entries(days).forEach(([dayStr, code]) => {
                    results.push({ employee_id: empId, day: parseInt(dayStr, 10), shift_code: code });
                });
            }
        });
        return results;
    } catch (error: any) {
        console.error("Gemini Image Parsing Error:", error);
        throw new Error("Error procesando el documento: " + error.message);
    }
};

export const processNaturalLanguageCommand = async (history: ChatMessage[], context: ContextData): Promise<AIResponse> => {
    try {
        const ai = getAIClient();
        const systemInstruction = `Eres un asistente de gestión hotelera para 'Como en Casa'.`;
        const contents = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: { systemInstruction: systemInstruction }
        });
        return { action: 'none', message: response.text || "No entendí." };
    } catch (error: any) {
        return { action: 'none', message: `Error: ${error.message}` };
    }
};

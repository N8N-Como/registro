
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

/**
 * Analiza el stock actual y los logs de consumo para predecir cuándo se agotarán los productos.
 */
// Fixed: Included inventory and logs data in the prompt so the AI can actually perform the analysis
export const analyzeStockTrends = async (inventory: InventoryItem[], logs: any[]): Promise<StockPrediction[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const inventoryData = JSON.stringify(inventory);
        const logsData = JSON.stringify(logs.slice(0, 50)); // Limit logs for context window

        const prompt = `
        Eres un experto en logística para 'Como en Casa'. Analiza el stock actual y los movimientos recientes de consumo para predecir cuándo se agotarán los productos.

        STOCK ACTUAL:
        ${inventoryData}

        LOGS DE MOVIMIENTO (Últimos 50):
        ${logsData}

        INSTRUCCIONES:
        1. Calcula la velocidad de consumo de cada producto basándote en los logs.
        2. Estima cuántos días quedan de stock para los productos críticos.
        3. Devuelve un array JSON con predicciones detalladas.

        RESPUESTA ESPERADA (JSON Array of StockPrediction):
        [{
            "item_id": "uuid",
            "item_name": "Nombre",
            "days_left": 5,
            "risk_level": "high" | "medium" | "low",
            "recommendation": "Comprar 10 unidades antes del viernes"
        }]

        Retorna SOLO el JSON.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: prompt }] },
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { 
        console.error("AI Stock Analysis Error:", error);
        return []; 
    }
};

/**
 * Analiza una imagen de un cuadrante mensual para extraer los turnos de los empleados.
 */
// Fixed: Enhanced prompt to better guide the model on how to map the image to the employee IDs and shift configs
export const parseScheduleImage = async (imageBase64: string, employees: Employee[], shiftConfigs: ShiftConfig[], month: number, year: number): Promise<any[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        
        const employeeList = employees.map(e => `${e.first_name} ${e.last_name} (ID: ${e.employee_id})`).join('\n');
        const configList = shiftConfigs.map(c => `Código: ${c.code}, Horario: ${c.start_time}-${c.end_time}`).join('\n');

        const prompt = `
        Analiza esta imagen de un cuadrante de turnos para el mes ${month} del año ${year}.
        
        LISTA DE EMPLEADOS:
        ${employeeList}

        CONFIGURACIÓN DE TURNOS CONOCIDOS:
        ${configList}

        INSTRUCCIONES:
        1. Identifica a cada empleado en la tabla de la imagen.
        2. Para cada día del mes, identifica el código de turno (M, T, N, L, V, B, etc.).
        3. Devuelve un objeto JSON donde las llaves sean los employee_id y los valores sean objetos con el día del mes como llave y el código de turno como valor.

        EJEMPLO DE RESPUESTA:
        {
          "emp_id_123": {
            "1": "M",
            "2": "M",
            "3": "L"
          }
        }

        Retorna SOLO el JSON compacto.
        `;

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
    } catch (error: any) { 
        console.error("AI Schedule Parsing Error:", error);
        throw new Error(error.message); 
    }
};

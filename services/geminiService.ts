
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { Employee, Room, Location, Task, Incident } from '../types';

// Define interfaces for context
export interface ContextData {
    employees: Employee[];
    rooms?: Room[];
    locations?: Location[];
    currentUser?: Employee;
    // Add generic data for other views
    data?: any; 
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    image?: string; // Base64 string
}

// --- TOOL DEFINITIONS ---

const createTaskTool: FunctionDeclaration = {
    name: 'createTask',
    description: 'Create a new cleaning or maintenance task assigned to an employee.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'Description of the task' },
            room_id: { type: Type.STRING, description: 'The UUID of the room. Optional.' },
            location_id: { type: Type.STRING, description: 'The UUID of the location. Mandatory.' },
            assigned_to: { type: Type.STRING, description: 'The UUID of the employee' },
            due_date: { type: Type.STRING, description: 'Due date in YYYY-MM-DD format.' }
        },
        required: ['description', 'location_id', 'assigned_to', 'due_date']
    }
};

const createIncidentTool: FunctionDeclaration = {
    name: 'createIncident',
    description: 'Report a new incident or damage.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'Description of the incident' },
            location_id: { type: Type.STRING, description: 'The UUID of the location' },
            room_id: { type: Type.STRING, description: 'The UUID of the room (optional)' },
            priority: { type: Type.STRING, description: 'Priority: low, medium, high' },
        },
        required: ['description', 'location_id', 'priority']
    }
};

const createShiftTool: FunctionDeclaration = {
    name: 'createShift',
    description: 'Create a work shift for an employee in the scheduler.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            employee_id: { type: Type.STRING, description: 'UUID of the employee' },
            start_time: { type: Type.STRING, description: 'ISO String for start time' },
            end_time: { type: Type.STRING, description: 'ISO String for end time' },
            location_id: { type: Type.STRING, description: 'UUID of location' },
            type: { type: Type.STRING, description: 'Type: work, off, vacation' }
        },
        required: ['employee_id', 'start_time', 'end_time', 'type']
    }
};

const createDocumentTool: FunctionDeclaration = {
    name: 'createDocument',
    description: 'Create a new internal document or announcement.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            requires_signature: { type: Type.BOOLEAN }
        },
        required: ['title', 'description']
    }
};

const createMaintenancePlanTool: FunctionDeclaration = {
    name: 'createMaintenancePlan',
    description: 'Create a preventive maintenance plan.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            frequency: { type: Type.STRING, description: 'monthly, quarterly, semestral, annual' },
            location_id: { type: Type.STRING }
        },
        required: ['title', 'frequency', 'location_id']
    }
};

const updateStockTool: FunctionDeclaration = {
    name: 'updateStock',
    description: 'Update inventory stock or create new item if name matches nothing.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            item_name: { type: Type.STRING },
            quantity_change: { type: Type.NUMBER, description: 'Positive to add, negative to remove' },
            reason: { type: Type.STRING }
        },
        required: ['item_name', 'quantity_change']
    }
};

const addLostItemTool: FunctionDeclaration = {
    name: 'addLostItem',
    description: 'Register a lost and found item.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING },
            location_id: { type: Type.STRING },
            room_id: { type: Type.STRING }
        },
        required: ['description', 'location_id']
    }
};

const createShiftLogTool: FunctionDeclaration = {
    name: 'createShiftLog',
    description: 'Add an entry to the daily shift log.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            message: { type: Type.STRING },
            target_role: { type: Type.STRING, description: 'admin, cleaner, maintenance, etc. or all' }
        },
        required: ['message']
    }
};

export interface AIResponse {
    action: 'createTask' | 'createIncident' | 'createShift' | 'createDocument' | 'createMaintenancePlan' | 'updateStock' | 'addLostItem' | 'createShiftLog' | 'none';
    data?: any;
    message: string;
}

// Lazy initialization function
const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key not configured");
    }
    return new GoogleGenAI({ apiKey });
};

export const processNaturalLanguageCommand = async (
    history: ChatMessage[], 
    context: ContextData
): Promise<AIResponse> => {
    
    try {
        const ai = getAIClient();
        
        // Prepare System Instruction
        const employeeList = context.employees.map(e => `${e.first_name} ${e.last_name} (ID: ${e.employee_id})`).join(', ');
        const locationList = (context.locations || []).map(l => `${l.name} (ID: ${l.location_id})`).join(', ');
        
        const systemInstruction = `
        You are an AI Assistant for "Como en Casa".
        Current Date: ${new Date().toISOString()}
        User ID: ${context.currentUser?.employee_id || 'unknown'}

        CONTEXT:
        Employees: ${employeeList}
        Locations: ${locationList}

        Identify the user intent and call the appropriate tool.
        If the user provides an image, analyze it to extract details (e.g., description of a lost item, text from a document, or damage for an incident).
        `;

        // Convert internal ChatMessage history to Gemini Content format
        const contents = history.map(msg => {
            const parts: any[] = [{ text: msg.text }];
            if (msg.image) {
                // Remove data:image/png;base64, prefix if present
                const base64Data = msg.image.split(',')[1] || msg.image;
                parts.push({
                    inlineData: {
                        mimeType: 'image/jpeg', // Assuming jpeg for simplicity
                        data: base64Data
                    }
                });
            }
            return {
                role: msg.role,
                parts: parts
            };
        });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ 
                    functionDeclarations: [
                        createTaskTool, 
                        createIncidentTool,
                        createShiftTool,
                        createDocumentTool,
                        createMaintenancePlanTool,
                        updateStockTool,
                        addLostItemTool,
                        createShiftLogTool
                    ] 
                }],
            }
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            
            for (const part of parts) {
                if (part.functionCall) {
                    const fc = part.functionCall;
                    return {
                        action: fc.name as any,
                        data: fc.args,
                        message: 'Procesando solicitud...'
                    };
                }
            }
            
            if (parts[0].text) {
                return {
                    action: 'none',
                    message: parts[0].text
                };
            }
        }

        return {
            action: 'none',
            message: "No he entendido la orden."
        };

    } catch (error) {
        console.error("Gemini API Error:", error);
        return {
            action: 'none',
            message: "Error de conexión con el asistente."
        };
    }
};

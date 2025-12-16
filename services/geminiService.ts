
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { Employee, Room, Location, InventoryItem, MaintenancePlan } from '../types';

// Define interfaces for context
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

// --- Function Declarations (Tools) ---

const createTaskTool: FunctionDeclaration = {
    name: 'createTask',
    description: 'Create a new cleaning or maintenance task.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'Description of the task' },
            room_id: { type: Type.STRING, description: 'The UUID of the room. Use "all_rooms" if generic.' },
            location_id: { type: Type.STRING, description: 'The UUID of the location.' },
            assigned_to: { type: Type.STRING, description: 'The UUID of the employee' },
            due_date: { type: Type.STRING, description: 'Due date YYYY-MM-DD' }
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
    description: 'Create or schedule a work shift.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            employee_id: { type: Type.STRING, description: 'The UUID of the employee' },
            start_time: { type: Type.STRING, description: 'ISO 8601 Timestamp for start' },
            end_time: { type: Type.STRING, description: 'ISO 8601 Timestamp for end' },
            type: { type: Type.STRING, description: "Type: 'work', 'off', 'vacation', 'sick', 'permission'" },
            location_id: { type: Type.STRING, description: 'Optional location UUID' }
        },
        required: ['employee_id', 'start_time', 'end_time']
    }
};

const updateInventoryTool: FunctionDeclaration = {
    name: 'updateInventory',
    description: 'Update stock quantity for an item (add or remove).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            item_name: { type: Type.STRING, description: 'Approximate name of the item to search for' },
            quantity_change: { type: Type.NUMBER, description: 'Positive to add, negative to remove/consume' },
            reason: { type: Type.STRING, description: 'Reason for change (e.g. "purchase", "cleaning room 101")' }
        },
        required: ['item_name', 'quantity_change']
    }
};

const createMaintenancePlanTool: FunctionDeclaration = {
    name: 'createMaintenancePlan',
    description: 'Create a new preventive maintenance plan.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            location_id: { type: Type.STRING },
            frequency: { type: Type.STRING, description: "'monthly', 'quarterly', 'semestral', 'annual'" },
            first_due_date: { type: Type.STRING, description: 'YYYY-MM-DD' }
        },
        required: ['title', 'location_id', 'frequency', 'first_due_date']
    }
};

const createDocumentTool: FunctionDeclaration = {
    name: 'createDocument',
    description: 'Upload or link a new company document/announcement.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, description: "'link' (for URLs) or 'file' (simulated)" },
            url: { type: Type.STRING, description: 'The URL if type is link' },
            requires_signature: { type: Type.BOOLEAN }
        },
        required: ['title', 'type']
    }
};

const logLostItemTool: FunctionDeclaration = {
    name: 'logLostItem',
    description: 'Register a found lost item.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING },
            location_id: { type: Type.STRING },
            room_id: { type: Type.STRING, description: 'Optional room UUID' }
        },
        required: ['description', 'location_id']
    }
};

const addToShiftLogTool: FunctionDeclaration = {
    name: 'addToShiftLog',
    description: 'Add a note to the shift log (Libro de Novedades).',
    parameters: {
        type: Type.OBJECT,
        properties: {
            message: { type: Type.STRING },
            target_role: { type: Type.STRING, description: "'all', 'gobernanta', 'receptionist', etc." }
        },
        required: ['message']
    }
};

export interface AIResponse {
    action: 'createTask' | 'createIncident' | 'createShift' | 'updateInventory' | 'createMaintenancePlan' | 'createDocument' | 'logLostItem' | 'addToShiftLog' | 'none';
    data?: any;
    message: string;
}

const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not configured");
    return new GoogleGenAI({ apiKey });
};

export const processNaturalLanguageCommand = async (
    history: ChatMessage[], 
    context: ContextData
): Promise<AIResponse> => {
    
    try {
        const ai = getAIClient();
        
        const employeeList = context.employees.map(e => `${e.first_name} ${e.last_name} (${e.role_id})`).join(', ');
        const locationList = context.locations.map(l => `${l.name}`).join(', ');
        const inventoryList = context.inventory ? context.inventory.map(i => `${i.name} (Stock: ${i.quantity})`).join(', ') : '';
        
        const systemInstruction = `
        You are an AI Assistant for "Como en Casa" hotel management.
        Current Date: ${new Date().toISOString().split('T')[0]}
        Current User: ${context.currentUser?.first_name} (${context.currentUser?.role_id})

        CONTEXT:
        - Employees: ${employeeList}
        - Locations: ${locationList}
        - Inventory Sample: ${inventoryList}

        Match the user request to the most appropriate tool. If asking to create/log something, use a tool.
        For inventory, fuzzy match the item name.
        `;

        const contents = history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations: [
                    createTaskTool, createIncidentTool, createShiftTool, 
                    updateInventoryTool, createMaintenancePlanTool, createDocumentTool,
                    logLostItemTool, addToShiftLogTool
                ]}],
            }
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            for (const part of parts) {
                if (part.functionCall) {
                    const fc = part.functionCall;
                    // Resolver IDs based on names if needed (simple logic)
                    const resolvedArgs = { ...fc.args };
                    
                    // Helper to resolve location name to ID
                    if (resolvedArgs.location_id && !resolvedArgs.location_id.startsWith('loc_')) {
                         const loc = context.locations.find(l => l.name.toLowerCase().includes(resolvedArgs.location_id.toLowerCase()));
                         if (loc) resolvedArgs.location_id = loc.location_id;
                    }
                    // Helper to resolve employee name to ID
                    if (resolvedArgs.assigned_to && !resolvedArgs.assigned_to.startsWith('emp_')) {
                         const emp = context.employees.find(e => e.first_name.toLowerCase().includes(resolvedArgs.assigned_to.toLowerCase()));
                         if (emp) resolvedArgs.assigned_to = emp.employee_id;
                    }
                    // Helper for inventory item matching
                    if (fc.name === 'updateInventory' && resolvedArgs.item_name && context.inventory) {
                        const item = context.inventory.find(i => i.name.toLowerCase().includes(resolvedArgs.item_name.toLowerCase()));
                        if (item) {
                            resolvedArgs.item_id = item.item_id; // Add ID to args for the frontend handler
                        }
                    }

                    return {
                        action: fc.name as any,
                        data: resolvedArgs,
                        message: 'Procesando solicitud...'
                    };
                }
            }
            if (parts[0].text) {
                return { action: 'none', message: parts[0].text };
            }
        }

        return { action: 'none', message: "No he entendido la orden." };

    } catch (error) {
        console.error("Gemini API Error:", error);
        return { action: 'none', message: "Error de conexión con el asistente." };
    }
};

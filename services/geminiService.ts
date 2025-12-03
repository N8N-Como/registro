
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { Employee, Room, Location, Task, Incident } from '../types';

// IMPORTANT: In a real environment, this should be an environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define interfaces for context
export interface ContextData {
    employees: Employee[];
    rooms: Room[];
    locations: Location[];
    currentUser?: Employee;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

// Function Declarations (Tools)

const createTaskTool: FunctionDeclaration = {
    name: 'createTask',
    description: 'Create a new cleaning or maintenance task assigned to an employee. Use this when the user wants to add a job, chore, or to-do.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'Description of the task' },
            room_id: { type: Type.STRING, description: 'The UUID of the room. MANDATORY if a room is mentioned.' },
            location_id: { type: Type.STRING, description: 'The UUID of the location/establishment. MANDATORY.' },
            assigned_to: { type: Type.STRING, description: 'The UUID of the employee' },
            due_date: { type: Type.STRING, description: 'Due date in YYYY-MM-DD format. Default to today if not specified.' }
        },
        required: ['description', 'location_id', 'assigned_to', 'due_date']
    }
};

const createIncidentTool: FunctionDeclaration = {
    name: 'createIncident',
    description: 'Report a new incident, damage, or issue in a location.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'Description of the incident' },
            location_id: { type: Type.STRING, description: 'The UUID of the location' },
            room_id: { type: Type.STRING, description: 'The UUID of the room (optional)' },
            priority: { type: Type.STRING, description: 'Priority level: low, medium, or high' },
        },
        required: ['description', 'location_id', 'priority']
    }
};

export interface AIResponse {
    action: 'createTask' | 'createIncident' | 'none';
    data?: any;
    message: string;
}

export const processNaturalLanguageCommand = async (
    history: ChatMessage[], 
    context: ContextData
): Promise<AIResponse> => {
    
    // Prepare System Instruction with mapped IDs to help Gemini
    const employeeList = context.employees.map(e => `${e.first_name} ${e.last_name} (ID: ${e.employee_id})`).join(', ');
    const locationList = context.locations.map(l => `${l.name} (ID: ${l.location_id})`).join(', ');
    
    // Create a strict mapping for Room -> Location to prevent AI hallucinations
    const roomMapping = context.rooms.map(r => {
        const loc = context.locations.find(l => l.location_id === r.location_id);
        return `Room "${r.name}" is inside Location ID "${r.location_id}" (RoomID: ${r.room_id})`;
    }).join('\n');

    const systemInstruction = `
    You are an efficient AI Assistant for "Como en Casa" hotel management.
    Your capability is to CREATE TASKS and REPORT INCIDENTS based on user input.

    Current Date: ${new Date().toISOString().split('T')[0]}
    Current User ID: ${context.currentUser?.employee_id || 'unknown'}

    DATA CONTEXT:
    - Employees: ${employeeList}
    - Locations: ${locationList}
    
    CRITICAL - ROOM TO LOCATION MAPPING:
    ${roomMapping}

    RULES:
    1. **Context Memory**: Use the chat history to understand references like "create another one" or "for the same room".
    2. **Location Resolution**: If the user mentions a Room, you MUST look up the corresponding Location ID from the "ROOM TO LOCATION MAPPING" list above. Do not guess the location.
    3. **Date Handling**: If "tomorrow" or "Monday" is mentioned, calculate YYYY-MM-DD based on Current Date.
    4. **Self Assignment**: If assigned to "me" or "myself", use the Current User ID.
    5. **Clarity**: If you trigger a function, reply with a short confirmation. If you cannot understand, ask for clarification.
    `;

    try {
        // Convert internal ChatMessage history to Gemini Content format
        const contents = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents, // Pass full history
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations: [createTaskTool, createIncidentTool] }],
            }
        });

        // Check for function calls
        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
            const parts = candidates[0].content.parts;
            
            // Prioritize Function Calls
            for (const part of parts) {
                if (part.functionCall) {
                    const fc = part.functionCall;
                    return {
                        action: fc.name as 'createTask' | 'createIncident',
                        data: fc.args,
                        message: 'Entendido, procesando solicitud...' // Temporary message, UI will handle success
                    };
                }
            }
            
            // If no function call, return the text response
            if (parts[0].text) {
                return {
                    action: 'none',
                    message: parts[0].text
                };
            }
        }

        return {
            action: 'none',
            message: "No he entendido la orden. Por favor, intenta ser más específico."
        };

    } catch (error) {
        console.error("Gemini API Error:", error);
        return {
            action: 'none',
            message: "Hubo un error al conectar con la IA."
        };
    }
};

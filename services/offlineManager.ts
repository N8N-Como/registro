
import { 
    clockIn, 
    clockOut, 
    checkInToLocation, 
    checkOutOfLocation, 
    startTask, 
    finishTask,
    addIncident,
    createTimeCorrectionRequest
} from './mockApi';

export type OfflineActionType = 
    | 'CLOCK_IN' 
    | 'CLOCK_OUT' 
    | 'CHECK_IN_LOCATION' 
    | 'CHECK_OUT_LOCATION'
    | 'START_TASK'
    | 'FINISH_TASK'
    | 'ADD_INCIDENT'
    | 'ADD_CORRECTION';

export interface OfflineAction {
    id: string;
    type: OfflineActionType;
    payload: any;
    timestamp: number;
    retryCount: number;
}

const STORAGE_KEY = 'offline_action_queue';

export const getQueue = (): OfflineAction[] => {
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

const saveQueue = (queue: OfflineAction[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const clearQueue = () => {
    localStorage.removeItem(STORAGE_KEY);
};

export const addToQueue = (type: OfflineActionType, payload: any) => {
    const queue = getQueue();
    const action: OfflineAction = {
        id: crypto.randomUUID(),
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0
    };
    queue.push(action);
    saveQueue(queue);
    console.log(`[OfflineManager] Action ${type} queued. Total: ${queue.length}`);
};

export const removeFromQueue = (id: string) => {
    const queue = getQueue();
    const newQueue = queue.filter(item => item.id !== id);
    saveQueue(newQueue);
};

export const processQueue = async (): Promise<boolean> => {
    const queue = getQueue();
    if (queue.length === 0) return true;

    console.log(`[OfflineManager] Processing ${queue.length} items...`);
    let allSuccess = true;

    for (const action of queue) {
        try {
            switch (action.type) {
                case 'CLOCK_IN':
                    await clockIn(
                        action.payload.employeeId,
                        action.payload.locationId,
                        action.payload.latitude,
                        action.payload.longitude,
                        action.payload.workType,
                        action.payload.workMode,
                        action.payload.deviceData, 
                        action.payload.customTime 
                    );
                    break;
                case 'CLOCK_OUT':
                    await clockOut(action.payload.entryId, action.payload.locationId, action.payload.isManual, action.payload.customTime);
                    break;
                case 'CHECK_IN_LOCATION':
                    await checkInToLocation(
                        action.payload.timeEntryId,
                        action.payload.employeeId,
                        action.payload.locationId,
                        action.payload.latitude,
                        action.payload.longitude
                    );
                    break;
                case 'CHECK_OUT_LOCATION':
                    await checkOutOfLocation(action.payload.activityId);
                    break;
                case 'ADD_CORRECTION':
                    // Limpieza preventiva: si el ID no es UUID, lo regeneramos antes de reintento
                    const cleanPayload = { ...action.payload };
                    if (cleanPayload.request_id && !cleanPayload.request_id.includes('-')) {
                        cleanPayload.request_id = crypto.randomUUID();
                    }
                    // Normalización de tiempo HH:MM:SS
                    if (cleanPayload.requested_clock_in && cleanPayload.requested_clock_in.length === 5) {
                        cleanPayload.requested_clock_in += ':00';
                    }
                    if (cleanPayload.requested_clock_out && cleanPayload.requested_clock_out.length === 5) {
                        cleanPayload.requested_clock_out += ':00';
                    }
                    
                    await createTimeCorrectionRequest(cleanPayload);
                    break;
            }
            // Si tiene éxito, eliminamos de la cola
            removeFromQueue(action.id);
        } catch (error: any) {
            console.error(`[OfflineManager] Failed to process action ${action.type}`, error);
            
            // SI EL ERROR TIENE UN STATUS 400 (Bad Request), significa que el servidor RECHAZÓ los datos.
            // No tiene sentido seguir reintentando porque nunca funcionará. Lo eliminamos.
            if (error.status === 400 || (error.code && error.code.startsWith('2'))) {
                console.warn(`[OfflineManager] Permanent error detected for action ${action.id}. Removing from queue.`);
                removeFromQueue(action.id);
            } else {
                // Si parece un error de red (no hay status o es 5xx), lo dejamos para el siguiente ciclo
                allSuccess = false;
            }
        }
    }
    
    return allSuccess;
};

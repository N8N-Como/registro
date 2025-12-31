
import { 
    clockIn, 
    clockOut, 
    checkInToLocation, 
    checkOutOfLocation, 
    startTask, 
    finishTask,
    addIncident
} from './mockApi';

export type OfflineActionType = 
    | 'CLOCK_IN' 
    | 'CLOCK_OUT' 
    | 'CHECK_IN_LOCATION' 
    | 'CHECK_OUT_LOCATION'
    | 'START_TASK'
    | 'FINISH_TASK'
    | 'ADD_INCIDENT';

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

    // Process sequentially to maintain order (important for clock in -> clock out)
    for (const action of queue) {
        try {
            switch (action.type) {
                case 'CLOCK_IN':
                    // Fixed argument count: clockIn expects 7 arguments
                    await clockIn(
                        action.payload.employeeId,
                        action.payload.locationId,
                        action.payload.latitude,
                        action.payload.longitude,
                        action.payload.workType,
                        action.payload.workMode,
                        action.payload.photoUrl
                    );
                    break;
                case 'CLOCK_OUT':
                    // Fixed argument count: clockOut expects 4 arguments
                    await clockOut(action.payload.entryId, action.payload.locationId, false, undefined);
                    break;
                case 'CHECK_IN_LOCATION':
                    // Fixed argument count: checkInToLocation expects 5 arguments
                    await checkInToLocation(
                        action.payload.timeEntryId,
                        action.payload.employeeId,
                        action.payload.locationId,
                        action.payload.latitude,
                        action.payload.longitude
                    );
                    break;
                case 'CHECK_OUT_LOCATION':
                    // Fixed argument count: checkOutOfLocation expects 1 argument
                    await checkOutOfLocation(action.payload.activityId);
                    break;
                // Add handlers for tasks later if needed
            }
            removeFromQueue(action.id);
        } catch (error) {
            console.error(`[OfflineManager] Failed to process action ${action.type}`, error);
            allSuccess = false;
            // If it's a logic error (e.g. 400), maybe remove it? For now keep retrying.
        }
    }
    
    return allSuccess;
};

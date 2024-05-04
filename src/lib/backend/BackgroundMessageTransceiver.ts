import {
    isBackgroundResponseMessage,
    type BackgroundMessage,
    type BackgroundResponseMessage as BackgroundResponseMessage
} from './BackgroundMessage';
import { BackgroundMessageType } from './BackgroundMessageType';

export default class BackgroundMessageTransceiver {
    private nextMessageId = 0;
    private pendingResponses = new Map<
        number,
        { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
    >();

    public constructor(private readonly worker: Worker) { }

    public async sendMessage(message: BackgroundMessage) {
        return new Promise((resolve, reject) => {
            message.id = this.nextMessageId++;
            this.pendingResponses.set(message.id, { resolve, reject });
            this.worker.postMessage(message);
        });
    }

    public sendSuccessResponse(message: BackgroundMessage, result?: unknown) {
        this.worker.postMessage({
            id: message.id,
            type: BackgroundMessageType.RESPONSE,
            result
        } as BackgroundResponseMessage);
    }

    public sendErrorResponse(message: BackgroundMessage, reason: unknown) {
        this.worker.postMessage({
            id: message.id,
            type: BackgroundMessageType.RESPONSE,
            result: reason,
            error: true
        } as BackgroundResponseMessage);
    }

    public onMessage(message: BackgroundMessage) {
        if (isBackgroundResponseMessage(message)) {
            if (this.pendingResponses.has(message.id)) {
                const { resolve, reject } = this.pendingResponses.get(message.id)!;
                if (message.error) {
                    reject(message.result);
                } else {
                    resolve(message.result);
                }
                this.pendingResponses.delete(message.id);
            } else {
                console.warn('received response for unknown message:', message);
            }
        } else {
            console.warn('received invalid message:', message);
        }
    }
}

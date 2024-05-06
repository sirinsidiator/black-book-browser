import {
    isBackgroundProgressMessage,
    isBackgroundResponseMessage,
    type BackgroundMessage,
    type BackgroundProgressMessage,
    type BackgroundResponseMessage
} from './BackgroundMessage';
import { BackgroundMessageType } from './BackgroundMessageType';

export default class BackgroundMessageTransceiver {
    private nextMessageId = 0;
    private pendingResponses = new Map<
        number,
        {
            resolve: (value: unknown) => void;
            reject: (reason: unknown) => void;
            onprogress?: (progress: unknown) => void;
        }
    >();

    public constructor(private readonly worker: Worker) {}

    public async sendMessage(message: BackgroundMessage, onprogress?: (progress: unknown) => void) {
        return new Promise((resolve, reject) => {
            message.id = this.nextMessageId++;
            this.pendingResponses.set(message.id, { resolve, reject, onprogress });
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

    public sendProgressResponse(message: BackgroundMessage, progress: unknown) {
        this.worker.postMessage({
            id: message.id,
            type: BackgroundMessageType.PROGRESS,
            progress
        } as BackgroundProgressMessage);
    }

    public onMessage(message: BackgroundMessage) {
        if (isBackgroundProgressMessage(message)) {
            if (this.pendingResponses.has(message.id)) {
                const { onprogress } = this.pendingResponses.get(message.id)!;
                if (onprogress) {
                    onprogress(message.progress);
                } else {
                    console.warn(
                        'received progress for message without onprogress handler:',
                        message
                    );
                }
            } else {
                console.warn('received progress for unknown message:', message);
            }
        } else if (isBackgroundResponseMessage(message)) {
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

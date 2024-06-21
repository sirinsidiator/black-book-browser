// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import {
    isBackgroundMessage,
    type BackgroundMessage,
    type BackgroundWorkerInitMessage
} from './BackgroundMessage';
import { BackgroundMessageType } from './BackgroundMessageType';
import BackgroundWorker from './BackgroundWorker';

onmessage = (event) => {
    if (isBackgroundMessage(event.data)) {
        handleMessage(event.data);
    } else {
        console.warn('worker received invalid message:', event.data);
    }
};

function handleMessage(message: BackgroundMessage) {
    if (!BackgroundWorker.isWorker()) {
        if (message.type === BackgroundMessageType.INIT) {
            BackgroundWorker.initialize(message as BackgroundWorkerInitMessage);
        } else {
            console.warn('worker received message before initialization:', message);
        }
    } else {
        BackgroundWorker.getInstance().handleMessage(message);
    }
}

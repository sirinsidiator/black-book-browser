// SPDX-FileCopyrightText: 2026 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

export function redirectKeydown(action: () => void | Promise<void>) {
    return (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void action();
        }
    };
}

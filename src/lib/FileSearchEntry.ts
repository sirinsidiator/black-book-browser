// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { Prepared } from "fuzzysort";

export default interface FileSearchEntry {
    archive: string;
    file: string;
    data: Prepared;
}

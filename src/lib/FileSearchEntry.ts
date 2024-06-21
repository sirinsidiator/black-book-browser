// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

export default interface FileSearchEntry {
    archive: string;
    file: string;
    data: Fuzzysort.Prepared;
}

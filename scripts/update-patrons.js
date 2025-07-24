// SPDX-FileCopyrightText: 2025 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

// get patrons from https://sir.insidi.at/or/patrons.json and update the patrons.json file
// Usage: node scripts/update-patrons.js

import { writeFileSync } from 'fs';
import { get } from 'https';

const patronsUrl = 'https://sir.insidi.at/or/patrons.json';
const patronsFile = 'src/lib/assets/patrons.json';

get(patronsUrl, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        writeFileSync(patronsFile, data);
        console.log('Patrons updated');
    });
}).on('error', (err) => {
    console.error('Error: ' + err.message);
    process.exit(1);
});

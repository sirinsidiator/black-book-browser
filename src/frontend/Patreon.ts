import ContentViewer from "./ContentViewer";
import { readFile } from "../util/FileUtil";

enum TierEmphasis {
    SMALL,
    MEDIUM,
    LARGE,
}

interface PatronData {
    name: string
    tier: TierEmphasis
}

interface PatronList {
    active: PatronData[]
    former: PatronData[]
}

const PATREON_LINK = 'https://www.patreon.com/bePatron?u=18954089';

export async function initializePatreon() {
    let content = await readFile('patrons.json');
    let patrons = JSON.parse(content.toString('utf8')) as PatronList;

    let $container = $('#patrons');
    let becomePatron = $container.find('button');
    becomePatron.click(() => {
        window.require('nw.gui').Shell.openExternal(PATREON_LINK);
    });

    let activeList = $container.find('#activeList');
    let formerList = $container.find('#formerList');

    shuffleArray(patrons.active);
    patrons.active.forEach(patron => {
        $('<span></span>').text(patron.name)
            .addClass('emph' + patron.tier)
            .appendTo(activeList);
    });

    shuffleArray(patrons.former);
    patrons.former.forEach(patron => {
        $('<span></span>').text(patron.name)
            .addClass('emph' + patron.tier)
            .appendTo(formerList);
    });

    $container.find('#formerContainer').accordion({
        collapsible: true,
        active: false
    });
    formerList.css('height', 'auto');
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
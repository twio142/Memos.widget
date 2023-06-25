const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const { execFile } = require('child_process');
const dataFile = path.join(__dirname, 'data.json');

const [screenWidth, screenHeight] = [1470, 932]; // CONFIG SCREEN SIZE HERE

const readData = () => 
    JSON.parse(fs.readFileSync(dataFile, 'utf8') || '{}');

const writeData = (data) => 
    fs.writeFileSync(dataFile, JSON.stringify(data));

const reloadApp = () =>
    execFile('osascript', ['-l', 'JavaScript', '-e', 'Application("tracesOf.Uebersicht").widgets.byId("Memos-widget-Memos-jsx").reload()']);

const getRandomPosition = (existingMemos, {width, height}) => {
    let left, top;
    let overlap = true;
    while (overlap) {
        left = Math.round(Math.random() * (screenWidth - width - 60)) + 30;
        top = Math.round(Math.random() * (screenHeight - height - 60)) + 30;
        if (left < 920 && top < 500) continue;
        overlap = existingMemos.some(existingMemo => {
            const existingLeft = existingMemo.position.left;
            const existingTop = existingMemo.position.top;
            const existingRight = existingLeft + existingMemo.size.width;
            const existingBottom = existingTop + existingMemo.size.height;
            const newRight = left + width;
            const newBottom = top + height;
            const overlapsHorizontally = newRight >= existingLeft && left <= existingRight;
            const overlapsVertically = newBottom >= existingTop && top <= existingBottom;
            return overlapsHorizontally && overlapsVertically;
        });
    }
    return { left, top };
}

const init = () => {
    writeData({});
    createMemo('Welcome to Memos!');
}

const createMemo = (text='') => {
    let data = readData();
    let size = {width: 260, height: 180};
    let position = getRandomPosition(Object.values(data), size);
    if (process.env.debug) {
        console.log(position);
        return;
    }
    data[uuid()] = { position, size, text };
    writeData(data);
    reloadApp();
}

const deleteMemo = (id) => {
    let data = readData();
    if (!data[id]) throw new Error(`Invalid memo id ${id}`);
    delete data[id];
    writeData(data);
    reloadApp();
}

const editMemo = (id, text='', append=!1) => {
    let data = readData();
    if (!data[id]) throw new Error(`Invalid memo id ${id}`);
    data[id].text = append ? data[id].text + (data[id].text && !data[id].text.endsWith('\n') ? '\n' : '') + text : text;
    writeData(data);
    reloadApp();
}

const listMemos = () => {
    let data = readData();
    Object.keys(data).forEach(id => {
        let text = data[id].text;
        text = text.length > 20 ? text.substring(0, 20) + '...' : text;
        console.log(`${id}: ${text}`);
    });
}

((mode) => {
    if (mode === 'init') {
        init();
    } else if (mode === 'new') {
        createMemo(process.argv[2]);
    } else if (mode === 'delete' && process.env.mID) {
        deleteMemo(process.env.mID);
    } else if (['edit', 'append'].includes(mode) && process.argv[2]) {
        editMemo(process.env.mID, process.argv[2], mode === 'append');
    } else if (mode === 'list') {
        listMemos();
    } else {
        console.log('Usage: node actions.js [init|new|delete|edit|append|list] [memoId] [text]');
    }
})(process.env.mode);

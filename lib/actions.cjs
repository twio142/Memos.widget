#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const { resolve } = require('path');

const dataFile = resolve(__dirname, 'data.json');

let screenWidth = 1280;
let screenHeight = 960;
try {
  const screen = require('./screen');
  screenWidth = screen.w;
  screenHeight = screen.h;
} catch {}

function readData() {
  try {
    return require(dataFile);
  } catch {
    return {};
  }
}

const writeData = data => fs.writeFileSync(dataFile, JSON.stringify(data));

function reloadApp() {
  const indexFile = resolve(__dirname, '../index.jsx');
  exec(`sleep 0.5; touch '${indexFile}'`);
}

function getRandomPosition(existingMemos, { width, height }) {
  let left, top;
  let overlap = true;
  while (overlap) {
    left = Math.round(Math.random() * (screenWidth - width - 60)) + 30;
    top = Math.round(Math.random() * (screenHeight - height - 60)) + 30;
    if (left < 920 && top < 500)
      continue;
    overlap = existingMemos.some((existingMemo) => {
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

function prep(text) {
  return text
    ?.replace(/\\[nr]/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
}

function init() {
  try {
    require(dataFile);
  } catch {
    writeData({});
    createMemo('Welcome to Memos!');
  }
}

function uuid() {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${s4()}${s4()}${s4()}`;
}

function createMemo(text = '') {
  const data = readData();
  const size = { width: 260, height: 180 };
  const position = getRandomPosition(Object.values(data), size);
  if (process.env.debug) {
    console.log(position);
    return;
  }
  text = prep(text);
  const id = uuid();
  data[id] = { position, size, text };
  writeData(data);
  console.log(id);
  reloadApp();
}

function deleteMemo(id) {
  const data = readData();
  if (!data[id])
    throw new Error(`Invalid memo id ${id}`);
  delete data[id];
  writeData(data);
  reloadApp();
}

function editMemo(id, text = '', append = !1) {
  const data = readData();
  if (!data[id])
    throw new Error(`Invalid memo id ${id}`);
  text = prep(text);
  data[id].text = append ? data[id].text + (data[id].text && !data[id].text.endsWith('\n') ? '\n' : '') + text : text;
  writeData(data);
  reloadApp();
}

function listMemos() {
  const data = readData();
  Object.keys(data).forEach((id) => {
    let text = data[id].text;
    text = text.length > 30 ? `${text.substring(0, 30)}...` : text;
    console.log(`\u001B[1m${id}\u001B[0m: ${text}`);
  });
}

((mode) => {
  if (mode === 'init') {
    init();
  } else if (mode === 'new') {
    createMemo(process.argv[3]);
  } else if (mode === 'delete' && process.argv[3]) {
    deleteMemo(process.argv[3]);
  } else if (mode === 'print' && process.argv[3]) {
    try {
      const memo = readData()[process.argv[3]];
      if (!memo)
        throw new Error(`Invalid memo id ${process.argv[3]}`);
      console.log(memo.text);
    } catch (e) {
      console.error(e.message);
    }
  } else if (['edit', 'append'].includes(mode) && process.argv[3]) {
    editMemo(process.argv[3], process.argv[4], mode === 'append');
  } else if (mode === 'list') {
    listMemos();
  } else {
    console.log('Usage: node actions.js [init|new|print|delete|edit|append|list] [memoId] [text]');
  }
})(process.argv[2]);

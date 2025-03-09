#!/usr/bin/env node

import { exec } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const __filename = new URL(import.meta.url).pathname;
const dataFile = resolve(__filename, '../data.json');

const SCREEN = {
  w: 1280,
  h: 960,
};

async function initScreen() {
  const { w, h } = await import('./screen.mjs');
  SCREEN.w = w;
  SCREEN.h = h;
};

function readData() {
  try {
    return JSON.parse(readFileSync(dataFile, 'utf8'));
  } catch {
    return {};
  }
}

const writeData = data => writeFileSync(dataFile, JSON.stringify(data));

function reloadApp() {
  const indexFile = resolve(__filename, '../../index.jsx');
  exec(`sleep 0.5; touch '${indexFile}'`);
}

async function getRandomPosition(existingMemos, { width, height }) {
  await initScreen();
  let left, top;
  let overlap = true;
  while (overlap) {
    left = Math.round(Math.random() * (SCREEN.w - width - 60)) + 30;
    top = Math.round(Math.random() * (SCREEN.h - height - 60)) + 30;
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
    .replace(/\\\\/g, '\\');
}

function init() {
  try {
    JSON.parse(readFileSync(dataFile, 'utf8'));
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

async function createMemo(text = '') {
  const data = readData();
  const size = { width: 260, height: 180 };
  const position = await getRandomPosition(Object.values(data), size);
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

((mode, ...args) => {
  switch (mode) {
    case 'init':
      init();
      break;
    case 'new':
      if (args[0]) {
        createMemo(args[0]);
      } else {
        let content = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
          content += chunk;
        });
        process.stdin.on('end', () => {
          content = content.trim();
          createMemo(content);
        });
      }
      break;
    case 'delete':
      if (args[0]) {
        deleteMemo(args[0]);
      } else {
        throw new Error('Missing memo id');
      }
      break;
    case 'print':
      if (args[0]) {
        try {
          const memo = readData()[args[0]];
          if (!memo)
            throw new Error(`Invalid memo id ${args[0]}`);
          console.log(memo.text);
        } catch (e) {
          console.error(e.message);
        }
      } else {
        throw new Error('Missing memo id');
      }
      break;
    case 'edit':
    case 'append':
      if (args[0]) {
        if (args[1]) {
          editMemo(args[0], args[1], mode === 'append');
        } else {
          let content = '';
          process.stdin.setEncoding('utf8');
          process.stdin.on('data', (chunk) => {
            content += chunk;
          });
          process.stdin.on('end', () => {
            content = content.trim();
            editMemo(args[0], content, mode === 'append');
          });
        }
      } else {
        throw new Error('Missing memo id');
      }
      break;
    case 'list':
      listMemos();
      break;
    default:
      console.log('Usage: node actions.mjs [init|new|print|delete|edit|append|list] [memoId] [text]');
  }
})(...process.argv.slice(2));

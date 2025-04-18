import { React, run, styled } from 'uebersicht';

const { useEffect, useRef } = React;

const widgetDir = 'Memos.widget';
const NODE = '/Applications/Übersicht.app/Contents/Resources/localnode';
const exec = `"${NODE}" "${widgetDir}/lib/actions.mjs"`;
const dataFile = `${widgetDir}/lib/data.json`;
export function init() {
  const template = `export const w = ${window.screen.availWidth};\nexport const h = ${window.screen.availHeight};`;
  run(`echo "${template}" > "${widgetDir}/lib/screen.mjs"; ${exec} init`);
}
export const command = `cat "${dataFile}"`;
export const refreshFrequency = 864e5;
const STATIC_INDEX = 99998;
const ops = { passiv: !1, capture: !1 };
let memo;
let initPos = {};

export const className = `
  pointer-events: none;
  width: 100%;
  height: 100%;
  #selection {
    position: absolute;
    background-color: rgba(var(--fg), .05);
  }
  --bg: 255, 255, 255;
  --fg: 0, 0, 0;
  @media (prefers-color-scheme: dark) {
    --bg: 0, 0, 0;
    --fg: 255, 255, 255;
  }
`;

const Memo = styled('div')`
  pointer-events: auto;
  position: absolute;
  background-color: rgb(var(--bg));
  min-width: 80px;
  min-height: 60px;
  border: 1px solid rgb(var(--fg));
  user-select: none;
  top: ${prop => prop.top}px;
  left: ${prop => prop.left}px;
  width: ${prop => prop.width}px;
  height: ${prop => prop.height}px;
  z-index: ${STATIC_INDEX};
  &.active {
    user-select: auto;
    box-shadow: 10px 10px rgba(var(--fg), 0.25);
  }
  &.active,
  &.active .close,
  &.active textarea {
    user-select: none !important;
  }
`;

const Textarea = styled('textarea')`
  position: absolute;
  top: 13px;
  left: 0;
  width: calc(100% - 32px);
  height: calc(100% - 38px);
  padding: 12px 16px;
  margin: 0;
  border: 0;
  outline: 0;
  resize: none;
  overflow: auto;
  font-family: 'Input Mono', 'Fira Code', 'Noto Sans SC', monospace;
  font-size: 11px;
  font-weight: 100;
  line-height: 16px;
  cursor: text;
  background: rgb(var(--bg));
  color: rgb(var(--fg));
  /* scrollbar-color: rgb(var(--fg)) transparent;
  scrollbar-width: thin; */
  &::-webkit-scrollbar {
    width: 1px;
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    margin-bottom: 6px;
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgb(var(--fg));
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgb(var(--fg));
  }
  &::-webkit-scrollbar-thumb:active {
    background: rgb(var(--fg));
  }
  &::placeholder {
    color: rgba(var(--fg), 0.4);
  }
`;

const Drag = styled('div')`
  position: absolute;
  background-color: transparent;
  cursor: grab;
  top: 0;
  right: 0;
  width: 100%;
  height: 12px;
  border-bottom: 1px solid rgb(var(--fg));
`;

const Close = styled('div')`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 1px;
  color: rgb(var(--fg));
  font-size: 15px;
  font-weight: 400;
  text-align: center;
  line-height: 10px;
  width: 12px;
  height: 12px;
  border-bottom: 1px solid rgb(var(--fg));
`;

const Resize = styled('div')`
  cursor: nw-resize;
  position: absolute;
  background-color: transparent;
  right: 0;
  bottom: 0;
  width: 6px;
  height: 6px;
  border-top: 1px solid rgb(var(--fg));
  border-left: 1px solid rgb(var(--fg));
`;

function readData() {
  return new Promise(resolve => run(`cat "${dataFile}"`).then(data => resolve(JSON.parse(data || 'null'))));
}

const writeData = data => run(`echo ${JSON.stringify(JSON.stringify(data)).replaceAll('`', '\\`')} > "${dataFile}"`);

function decreaseAllMemoIndexes(key) {
  return document
    .querySelectorAll(`.memo:not([data-id="${key}"])`)
    .forEach(m => (m.style.zIndex = Number.parseInt(m.style.zIndex) - 1));
}

function inputEvent(e) {
  readData().then((data) => {
    const key = e.target.parentNode.getAttribute('data-id');
    data[key] = {
      ...data[key],
      text: e.target.value,
    };
    writeData(data);
  });
}

function keydownEvent(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.target.blur();
  } else if (e.key === 'n' && e.metaKey) {
    e.preventDefault();
    run(`${exec} new; sleep 0.5`).then(id =>
      document.querySelector(`.memo[data-id="${id.trim()}"] .input`).focus(),
    );
  } else if (e.key === 'w' && e.metaKey) {
    e.preventDefault();
    closeEvent(e);
  }
}

function dragEvent(e) {
  decreaseAllMemoIndexes(e.target.getAttribute('data-id'));
  memo = e.target.parentNode;
  memo.classList.add('active');
  memo.style.zIndex = STATIC_INDEX;
  memo.querySelectorAll('.input')[0].blur();
  e.target.style.backgroundColor = 'rgba(var(--fg), .05)';
  e.target.style.cursor = 'grabbing';
  document.body.style.cursor = 'grabbing';
  initPos = { x: e.clientX, y: e.clientY, top: memo.offsetTop, left: memo.offsetLeft };
  document.addEventListener('mousemove', handleDragMouseMove, ops);
  document.addEventListener('mouseup', handleDragMouseUp, ops);
}

function handleDragMouseMove(e) {
  if (!memo.classList.contains('active'))
    return;
  const deltaX = e.clientX - initPos.x;
  const deltaY = e.clientY - initPos.y;
  memo.style.top = `${initPos.top + deltaY}px`;
  memo.style.left = `${initPos.left + deltaX}px`;
}

function handleDragMouseUp() {
  memo.classList.remove('active');
  const drag = memo.querySelectorAll('.drag')[0];
  drag.style.cursor = 'grab';
  drag.style.backgroundColor = 'transparent';
  memo.querySelector('.input').focus();
  document.body.style.cursor = 'default';
  document.removeEventListener('mousemove', handleDragMouseMove);
  document.removeEventListener('mouseup', handleDragMouseUp);
  readData().then((data) => {
    const key = memo.getAttribute('data-id');
    data[key] = {
      ...data[key],
      position: { left: memo.offsetLeft, top: memo.offsetTop },
    };
    writeData(data);
  });
}

function resizeEvent(e) {
  decreaseAllMemoIndexes(e.target.getAttribute('data-id'));
  memo = e.target.parentNode;
  memo.classList.add('active');
  memo.style.zIndex = STATIC_INDEX;
  memo.querySelectorAll('.input')[0].blur();
  e.target.style.backgroundColor = 'rgba(var(--fg), .05)';
  initPos = { x: e.clientX, y: e.clientY, width: memo.offsetWidth, height: memo.offsetHeight };
  document.body.style.cursor = 'nw-resize';
  document.addEventListener('mousemove', handleResizeMouseMove, ops);
  document.addEventListener('mouseup', handleResizeMouseUp, ops);
}

function handleResizeMouseMove(e) {
  if (!memo.classList.contains('active'))
    return;
  const deltaX = e.clientX - initPos.x;
  const deltaY = e.clientY - initPos.y;
  memo.style.width = `${initPos.width + deltaX}px`;
  memo.style.height = `${initPos.height + deltaY}px`;
}

function handleResizeMouseUp() {
  const resize = memo.querySelector('.resize');
  resize.style.cursor = 'nw-resize';
  resize.style.backgroundColor = 'transparent';
  memo.classList.remove('active');
  memo.querySelectorAll('.input')[0].focus();
  document.removeEventListener('mousemove', handleResizeMouseMove, ops);
  document.removeEventListener('mouseup', handleResizeMouseUp, ops);
  readData().then((data) => {
    const key = memo.getAttribute('data-id');
    data[key] = {
      ...data[key],
      size: { width: memo.offsetWidth, height: memo.offsetHeight },
    };
    writeData(data);
  });
}

function closeEvent(e) {
  const mID = e.target.parentNode.getAttribute('data-id');
  run(
    `osascript -e 'display dialog "Delete this memo?" buttons {"Cancel", "OK"} default button "OK" cancel button "Cancel" with icon stop' 2>/dev/null && { ${exec} delete ${mID}; sleep 0.5; touch ${widgetDir}/index.jsx; }`,
  );
}

function MemoWrapper({ state }) {
  const {
    position: { top, left },
    size: { width, height },
    key,
    text,
  } = state;
  const dragRef = useRef(null);
  const closeRef = useRef(null);
  const resizeRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    const drag = dragRef.current;
    const close = closeRef.current;
    const resize = resizeRef.current;
    if (text)
      textarea.value = text;
    const focusEvent = (e) => {
      e.target.classList.add('active');
      decreaseAllMemoIndexes(key);
      e.target.parentNode.style.zIndex = STATIC_INDEX;
    };
    const blurEvent = e => e.target.classList.remove('active');
    textarea.addEventListener('focus', focusEvent);
    textarea.addEventListener('input', inputEvent, ops);
    textarea.addEventListener('blur', blurEvent, ops);
    textarea.addEventListener('keydown', keydownEvent);
    drag.addEventListener('mousedown', dragEvent);
    close.addEventListener('mouseup', closeEvent);
    resize.addEventListener('mousedown', resizeEvent);
    return () => {
      textarea.removeEventListener('focus', focusEvent);
      textarea.removeEventListener('input', inputEvent, ops);
      textarea.removeEventListener('blur', blurEvent, ops);
      textarea.removeEventListener('keydown', keydownEvent);
      drag.removeEventListener('mousedown', dragEvent);
      close.removeEventListener('mouseup', closeEvent);
      resize.removeEventListener('mousedown', resizeEvent);
    };
  }, [text, key]);

  useEffect(() => {
    const textarea = textareaRef.current;
    textarea.value = text;
  }, [text]);

  return (
    <Memo key={key} data-id={key} className="memo" top={top} left={left} width={width} height={height}>
      <Textarea ref={textareaRef} className="input" placeholder="Type here..." autocomplete="true" />
      <Drag ref={dragRef} className="drag" />
      <Close ref={closeRef} className="close">
        –
      </Close>
      <Resize ref={resizeRef} className="resize" />
    </Memo>
  );
}

export function render({ output }) {
  output = JSON.parse(output || '{}');
  return (
    <div id="MemoBoard">
      {Object.keys(output)?.map((key) => {
        const { size, position, text } = output[key];
        return <MemoWrapper state={{ size, position, text, key }} key={key} />;
      })}
    </div>
  );
}

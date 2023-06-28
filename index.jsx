import { styled, run, React } from "uebersicht";
const { useEffect, useRef } = React;

/* CONFIG */
const node = "$HOME/.nvm/versions/node/v18.4.0/bin/node"; // node executable path

const dataFile = "./Memos.widget/lib/data.json";
export const init = () => {
    run(`
    sed -i '' 's/_SCREEN_SIZE_/${window.screen.availWidth}, ${window.screen.availHeight}/' Memos.widget/lib/actions.js;
    [ -f ${dataFile} ] || "${node}" Memos.widget/lib/actions.js init
    `);
}
export const command = `cat ${dataFile}`;
export const refreshFrequency = 864e5;
const STATIC_INDEX = 99998;
const ops = {passiv: !1, useCapture: !1};
let memo, initPos = {};

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
    min-height: 80px;
    border: 1px solid rgb(var(--fg));
    user-select: none;
    top: ${prop => prop.top}px;
    left: ${prop => prop.left}px;
    width: ${prop => prop.width}px;
    height: ${prop => prop.height}px;
    z-index: ${STATIC_INDEX};
    &.active {
        user-select: auto;
        box-shadow: 10px 10px rgba(var(--fg), .25);
    }
    &.active, &.active .close, &.active textarea {
        user-select: none!important;
        -webkit-user-select: none!important;
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
    font-family: "Input Mono", "Fira Code", "Noto Sans SC", monospace;
    font-size: 11px;
    font-weight: 100;
    line-height: 16px;
    cursor: text;
    background: rgb(var(--bg));
    color: rgb(var(--fg));
    scrollbar-color: rgb(var(--fg)) transparent;
    scrollbar-width: thin;
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
        color: rgba(var(--fg), .4);
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

const readData = () => new Promise(resolve => run(`cat ${dataFile}`).then(data => resolve(JSON.parse(data || 'null'))));

const writeData = (data) => run(`echo '${JSON.stringify(data)}' > ${dataFile}`);

const decreaseAllMemoIndexes = (key) =>
    document.querySelectorAll(`.memo:not([data-id="${key}"])`).forEach(m => m.style.zIndex = parseInt(m.style.zIndex) - 1 );

const inputEvent = (e) => {
    readData().then(data => {
        let key = e.target.parentNode.getAttribute('data-id');
        data[key] = {
            ...data[key],
            text: e.target.value
        };
        writeData(data);
    });
}

const keydownEvent = (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        e.target.blur();
    } else if (e.key === 'n' && e.metaKey) {
        e.preventDefault();
        run(`"${node}" Memos.widget/lib/actions.js new`);
    } else if (e.key === 'w' && e.metaKey) {
        e.preventDefault();
        closeEvent({target: e.target.parentNode.querySelectorAll('.close')[0]});
    }
}

const dragEvent = (e) => {
    decreaseAllMemoIndexes(e.target.getAttribute('data-id'));
    memo = e.target.parentNode;
    memo.classList.add('active');
    memo.style.zIndex = STATIC_INDEX;
    memo.querySelectorAll('.input')[0].blur();
    e.target.style.backgroundColor = 'rgba(var(--fg), .05)';
    e.target.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    initPos = {x: e.clientX, y: e.clientY, top: memo.offsetTop, left: memo.offsetLeft};
    document.addEventListener('mousemove', handleDragMouseMove, ops);
    document.addEventListener('mouseup', handleDragMouseUp, ops);
};

const handleDragMouseMove = (e) => {
    if (!memo.classList.contains('active')) return;
    const deltaX = e.clientX - initPos.x, deltaY = e.clientY - initPos.y;
    memo.style.top = initPos.top + deltaY + 'px';
    memo.style.left = initPos.left + deltaX + 'px';
};

const handleDragMouseUp = (e) => {
    memo.classList.remove('active');
    const drag = memo.querySelectorAll('.drag')[0];
    drag.style.cursor = 'grab';
    drag.style.backgroundColor = 'transparent';
    memo.querySelectorAll('.input')[0].focus();
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handleDragMouseMove);
    document.removeEventListener('mouseup', handleDragMouseUp);
    readData().then(data => {
        let key = memo.getAttribute('data-id');
        data[key] = {
            ...data[key],
            position: {left: memo.offsetLeft, top: memo.offsetTop},
        };
        writeData(data);
    });
};

const resizeEvent = (e) => {
    decreaseAllMemoIndexes(e.target.getAttribute('data-id'));
    memo = e.target.parentNode;
    memo.classList.add('active');
    memo.style.zIndex = STATIC_INDEX;
    memo.querySelectorAll('.input')[0].blur();
    e.target.style.backgroundColor = 'rgba(var(--fg), .05)';
    initPos = {x: e.clientX, y: e.clientY, width: memo.offsetWidth, height: memo.offsetHeight};
    document.body.style.cursor = 'nw-resize';
    document.addEventListener('mousemove', handleResizeMouseMove, ops);
    document.addEventListener('mouseup', handleResizeMouseUp, ops);
};

const handleResizeMouseMove = (e) => {
    if (!memo.classList.contains('active')) return;
    const deltaX = e.clientX - initPos.x, deltaY = e.clientY - initPos.y;
    memo.style.width = initPos.width + deltaX + 'px';
    memo.style.height = initPos.height + deltaY + 'px';
};

const handleResizeMouseUp = (e) => {
    const resize = memo.querySelector('.resize');
    resize.style.cursor = 'nw-resize';
    resize.style.backgroundColor = 'transparent';
    memo.classList.remove('active');
    memo.querySelectorAll('.input')[0].focus();
    document.removeEventListener('mousemove', handleResizeMouseMove, ops);
    document.removeEventListener('mouseup', handleResizeMouseUp, ops);
    readData().then(data => {
        let key = memo.getAttribute('data-id');
        data[key] = {
            ...data[key],
            size: {width: memo.offsetWidth, height: memo.offsetHeight},
        };
        writeData(data);
    });
};

const closeEvent = (e) =>
    run('osascript -l JavaScript ./Memos.widget/lib/confirm.scpt').then(answer => {
        if (answer.trim() === 'OK') {
            let memo = e.target.parentNode;
            memo.parentNode.removeChild(memo);
            readData().then(data => {
                delete data[memo.getAttribute('data-id')];
                writeData(data);
            });
        }
    });

const MemoWrapper = ({state, dispatch}) => {
    const {position: {top, left}, size: {width, height}, key, text} = state;
    const dragRef = useRef(null), closeRef = useRef(null), resizeRef = useRef(null), textareaRef = useRef(null);
    useEffect(() => {
        if (text)
            textareaRef.current.value = text;
        textareaRef.current.addEventListener('focus', (e) => {
            e.target.classList.add('active');
            decreaseAllMemoIndexes(key);
            e.target.parentNode.style.zIndex = STATIC_INDEX;
        });
        textareaRef.current.addEventListener('input', inputEvent, ops);
        textareaRef.current.addEventListener('blur', (e) => e.target.classList.remove('active'), ops);
        textareaRef.current.addEventListener('keydown', keydownEvent);
        dragRef.current.addEventListener('mousedown', dragEvent);
        closeRef.current.addEventListener('mouseup', closeEvent);
        resizeRef.current.addEventListener('mousedown', resizeEvent);
    }, []);

    return (
        <Memo key={key} data-id={key} className="memo" top={top} left={left} width={width} height={height}>
            <Textarea ref={textareaRef} className="input" placeholder="Type here..." autocomplete="true"/>
            <Drag ref={dragRef} className="drag"/>
            <Close ref={closeRef} className="close">–</Close>
            <Resize ref={resizeRef} className="resize"/>
        </Memo>
    );
};

export const render = ({output, error}, dispatch) => {
    output = JSON.parse(output || '{}');
    window.addEventListener('resize', (e) => {});
    return (
        <div id="MemoBoard">
        {
            Object.keys(output).map(key => {
                let {size, position, text} = output[key];
                let {top, left} = position;
                let {width, height} = size;
                return (
                    <MemoWrapper state={{size, position, text, key}} dispatch={dispatch}/>
                )
            })
        }
        </div>
    )
}


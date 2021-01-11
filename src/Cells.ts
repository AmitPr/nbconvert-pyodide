import { render, html } from 'uhtml';
import CodeMirror from './codemirror/codemirror';

import './codemirror/codemirror.css';

import './codemirror/addon/simplescrollbars';
import './codemirror/addon/simplescrollbars.css';

import './codemirror/mode/markdown.js';
import './codemirror/mode/python.js';
import { Notebook } from './Notebook';


abstract class Cell {
    notebook: Notebook;
    container: HTMLElement;
    _content: string;

    private _type: string;
    get type(): string {
        return this._type;
    }
    set type(value: string) {
        this._type = value;
    }

    get content(): string {
        if (this.editor === undefined) {
            return this._content;
        }
        return this.editor.getValue();
    }
    set content(value: string) {
        this.editor.setValue(value);
    }

    editor: CodeMirror.Editor;
    outputWrapper: HTMLElement;
    inputWrapper: HTMLElement;

    constructor(notebook: Notebook, container: HTMLElement, type: string, content: string) {
        this.notebook = notebook;
        this.container = container;
        this.container.classList.add("cell");
        this.container.onclick = () => {
            this.notebook.setActiveCell(this);
        };
        this._type = type;
        this.container.dataset.language = this.type;
        this._content = content;
        this.renderCell();
        this.editor = this.initCodeMirror(content);
        this.outputWrapper = this.container.querySelector(".cell-output") as HTMLElement;
        this.inputWrapper = this.container.querySelector(".cell-input") as HTMLElement;
        this.setInputDisplay(true);
    }

    abstract runCell(): void;

    renderCell(): void {
        render(this.container, html`
        <div class = "cell-input">
            <textarea id="cm-textarea">${this.content}</textarea>
        </div>
        <div class = "cell-output"></div>
        `);
    }

    setInputDisplay(visible = false): void {
        if (visible) {
            this.inputWrapper.style.display = 'block';
        } else {
            this.inputWrapper.style.display = 'none';
        }
    }

    initCodeMirror(content: string): CodeMirror.Editor {
        const editor = CodeMirror.fromTextArea(this.container.querySelector("#cm-textarea") as HTMLTextAreaElement, {
            mode: {
                name: this.type,
                version: 3,
                singleLineStringErrors: false,
                fencedCodeBlockDefaultMode: 'python'
            },
            extraKeys: {
                'Tab': (cm: CodeMirror.Editor) => {
                    const indentUnit = cm.getOption("indentUnit") as number;
                    const spaces = Array(indentUnit + 1).join(" ");
                    cm.replaceSelection(spaces);
                },
                'Shift-Enter': (cm: CodeMirror.Editor) => {
                    this.notebook.runCell(cm);
                    return;
                },
            },
            indentUnit: 4,
            theme: 'one-theme',
            scrollbarStyle: 'overlay',
            viewportMargin: Infinity,
            lineNumbers: true
        });
        editor.setValue(content);
        editor.refresh();
        return editor;
    }
    toJSON(): CellSerialized {
        const serializedContent: string[] = this.content.split("\n");
        return {
            type: this.type,
            content: serializedContent
        }
    }
}

class Cells {
    public static builtins: { [type: string]: new (notebook: Notebook, container: HTMLElement, type: string, content: string) => Cell } = {};
    public static plugins: { [type: string]: new (notebook: Notebook, container: HTMLElement, type: string, content: string) => Cell } = {};
}

export { Cells, Cell };
export interface CellSerialized {
    type: string,
    content: string[]
}
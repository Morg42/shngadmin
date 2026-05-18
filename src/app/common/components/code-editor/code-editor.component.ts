import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  CompletionContext,
  CompletionResult,
  autocompletion,
  closeBrackets,
  completionStatus,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentLess, insertTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldCode,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  unfoldAll,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, Extension, Transaction } from '@codemirror/state';
import {
  EditorView,
  KeyBinding,
  ViewUpdate,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';

export type CmLanguage = 'python' | 'yaml' | 'javascript' | 'xml' | 'text';
export type CmCompletionSource = (
  context: CompletionContext,
) => CompletionResult | null | Promise<CompletionResult | null>;

@Component({
  selector: 'app-code-editor',
  template: `<div #host class="cm-host"></div>`,
  styles: [
    `
      :host {
        display: block;
        height: 300px;
        width: 100%;
      }
      :host.cm-fullscreen {
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999;
      }
      .cm-host {
        height: 100%;
        width: 100%;
      }
      .cm-host .cm-editor {
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeEditorComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('host', { static: true }) private hostRef!: ElementRef<HTMLDivElement>;

  @Input() language: CmLanguage = 'text';
  @Input() readOnly = false;
  @Input() lineNums = true;
  @Input() lineWrapping = false;
  @Input() foldable = false;
  @Input() firstLineNumber = 1;
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  /** Extra keybindings specific to the hosting component. */
  @Input() extraKeybindings: KeyBinding[] = [];

  /** Optional CM6 completion source for autocomplete (logics-edit). */
  @Input() completionSource?: CmCompletionSource;

  /** If set, typed text matching this regex is blocked (watch-items editor). */
  @Input() allowedCharsPattern?: RegExp;

  @HostBinding('class.cm-fullscreen')
  private _fullscreen = false;

  private _lineWrapping!: boolean;

  private readOnlyComp = new Compartment();
  private lineNumComp = new Compartment();
  private lineWrapComp = new Compartment();
  private completionComp = new Compartment();

  private _view?: EditorView;

  get view(): EditorView | undefined {
    return this._view;
  }

  ngOnInit() {
    this._lineWrapping = this.lineWrapping;
  }

  ngAfterViewInit() {
    this._view = new EditorView({
      state: this._buildState(this.value),
      parent: this.hostRef.nativeElement,
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this._view) return;

    if (changes['value'] && !changes['value'].firstChange) {
      const current = this._view.state.doc.toString();
      if (current !== this.value) {
        this._view.dispatch({
          changes: { from: 0, to: current.length, insert: this.value ?? '' },
        });
      }
    }
    if (changes['readOnly'] && !changes['readOnly'].firstChange) {
      this._view.dispatch({
        effects: this.readOnlyComp.reconfigure(EditorState.readOnly.of(this.readOnly)),
      });
    }
    if (changes['lineNums'] && !changes['lineNums'].firstChange) {
      this._view.dispatch({
        effects: this.lineNumComp.reconfigure(this._lineNumsExtension()),
      });
    }
    if (changes['firstLineNumber'] && !changes['firstLineNumber'].firstChange) {
      this._view.dispatch({
        effects: this.lineNumComp.reconfigure(this._lineNumsExtension()),
      });
    }
    if (changes['completionSource'] && !changes['completionSource'].firstChange) {
      this._view.dispatch({
        effects: this.completionComp.reconfigure(this._completionExtension()),
      });
    }
  }

  ngOnDestroy() {
    this._view?.destroy();
  }

  // ---------------------------------------------------------------------------
  // Public API called by host components
  // ---------------------------------------------------------------------------

  toggleFullscreen() {
    this._fullscreen = !this._fullscreen;
  }

  exitFullscreen() {
    if (this._fullscreen) this._fullscreen = false;
  }

  toggleLineWrapping() {
    this._lineWrapping = !this._lineWrapping;
    this._view?.dispatch({
      effects: this.lineWrapComp.reconfigure(this._lineWrapping ? EditorView.lineWrapping : []),
    });
  }

  scrollToEnd() {
    if (!this._view) return;
    const len = this._view.state.doc.length;
    this._view.dispatch({ selection: { anchor: len }, scrollIntoView: true });
  }

  foldAtCursor() {
    if (this._view) foldCode(this._view);
  }

  unfoldAllCode() {
    if (this._view) unfoldAll(this._view);
  }

  /** Check whether the CM6 autocomplete dropdown is currently open. */
  get completionActive(): boolean {
    return this._view ? completionStatus(this._view.state) !== null : false;
  }

  // ---------------------------------------------------------------------------
  // State construction helpers
  // ---------------------------------------------------------------------------

  private _lineNumsExtension(): Extension {
    if (!this.lineNums) return [];
    const offset = this.firstLineNumber - 1;
    return offset > 0 ? lineNumbers({ formatNumber: (n) => String(n + offset) }) : lineNumbers();
  }

  private _completionExtension(): Extension {
    if (!this.completionSource) return autocompletion();
    return autocompletion({ override: [this.completionSource] });
  }

  private _buildState(doc: string): EditorState {
    const self = this;

    const builtinKeys: KeyBinding[] = [
      {
        key: 'F11',
        run: () => {
          self.toggleFullscreen();
          return true;
        },
      },
      {
        key: 'Escape',
        run: () => {
          self.exitFullscreen();
          return false;
        },
      },
      {
        key: 'Ctrl-q',
        run: (view) => {
          foldCode(view);
          return true;
        },
      },
      {
        key: 'Shift-Ctrl-q',
        run: (view) => {
          unfoldAll(view);
          return true;
        },
      },
      {
        key: 'Ctrl-l',
        run: () => {
          self.toggleLineWrapping();
          return true;
        },
      },
      { key: 'Tab', run: insertTab, shift: indentLess },
      { key: 'Shift-Tab', run: indentLess },
    ];

    const extensions: Extension[] = [
      this.readOnlyComp.of(EditorState.readOnly.of(this.readOnly)),
      this.lineNumComp.of(this._lineNumsExtension()),
      this.lineWrapComp.of(this._lineWrapping ? EditorView.lineWrapping : []),
      this.completionComp.of(this._completionExtension()),
      this._languageExtension(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      history(),
      drawSelection(),
      highlightSpecialChars(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      this.foldable ? foldGutter() : [],
      keymap.of([
        ...this.extraKeybindings,
        ...builtinKeys,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...searchKeymap,
      ]),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          self.valueChange.emit(update.state.doc.toString());
        }
      }),
    ];

    if (this.allowedCharsPattern) {
      const pattern = this.allowedCharsPattern;
      extensions.push(
        EditorState.transactionFilter.of((tr: Transaction) => {
          if (!tr.docChanged) return tr;
          let allowed = true;
          tr.changes.iterChanges((_from, _to, _fromB, _toB, inserted) => {
            const text = inserted.toString().replace(/\n/g, '');
            if (text.length > 0 && !pattern.test(text)) {
              allowed = false;
            }
          });
          return allowed ? tr : [];
        }),
      );
    }

    return EditorState.create({ doc, extensions });
  }

  private _languageExtension(): Extension {
    switch (this.language) {
      case 'python':
        return python();
      case 'yaml':
        return yaml();
      case 'javascript':
        return javascript();
      case 'xml':
        return xml();
      default:
        return [];
    }
  }
}

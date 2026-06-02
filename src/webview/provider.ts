import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { GameState } from '../game/types';

export interface WebviewMessage {
  type: string;
  payload?: unknown;
}

export class SudokuViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'sudoku-vs.gameView';
  private _view?: vscode.WebviewView;
  private _messageHandler?: (message: WebviewMessage) => void;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public setMessageHandler(handler: (message: WebviewMessage) => void) {
    this._messageHandler = handler;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        if (this._messageHandler) {
          this._messageHandler(message);
        }
      },
      undefined
    );
  }

  public postMessage(message: { type: string; payload?: unknown }) {
    this._view?.webview.postMessage(message);
  }

  public updateGameState(state: GameState) {
    this.postMessage({ type: 'gameState', payload: this._serializeGameState(state) });
  }

  public showWelcome() {
    this.postMessage({ type: 'welcome' });
  }

  public showStatistics(stats: unknown) {
    this.postMessage({ type: 'statistics', payload: stats });
  }

  private _serializeGameState(state: GameState): unknown {
    return {
      board: state.board.map(row =>
        row.map(cell => ({
          value: cell.value,
          notes: Array.from(cell.notes),
          isGiven: cell.isGiven,
          isError: cell.isError,
        }))
      ),
      solution: state.solution,
      difficulty: state.difficulty,
      status: state.status,
      mistakes: state.mistakes,
      maxMistakes: state.maxMistakes,
      time: state.time,
      hintsUsed: state.hintsUsed,
      maxHints: state.maxHints,
      selectedCell: state.selectedCell,
      notesMode: state.notesMode,
      canUndo: state.historyIndex >= 0,
      canRedo: state.historyIndex < state.history.length - 1,
    };
  }

  private _getHtml(): string {
    if (!this._view) { return this._getErrorHtml(); }

    const webview = this._view.webview;
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'style.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'main.js')
    );

    const scriptPath = path.join(this._extensionUri.fsPath, 'dist', 'webview', 'main.js');
    if (!fs.existsSync(scriptPath)) { return this._getLoadingHtml(); }

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>Sudoku VS</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _getLoadingHtml(): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:var(--vscode-editor-background);color:var(--vscode-foreground);font-family:var(--vscode-font-family);">
<div>Loading Sudoku VS...<br><small>Run <code>npm run compile</code> to build.</small></div></body></html>`;
  }

  private _getErrorHtml(): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:var(--vscode-editor-background);color:var(--vscode-foreground);">
<div>Error loading Sudoku VS</div></body></html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

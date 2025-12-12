import * as vscode from 'vscode';
import * as path from 'path';
import { fileExists } from '../utils/file-utils';
import { calculateTestPath } from '../utils/test-file-utils';

export class DartTestFileDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  async provideFileDecoration(
    uri: vscode.Uri,
    token: vscode.CancellationToken
  ): Promise<vscode.FileDecoration | undefined> {
    // Only decorate Dart files
    if (!uri.fsPath.endsWith('.dart')) {
      return undefined;
    }

    // Don't decorate test files themselves
    if (uri.fsPath.includes('_test.dart')) {
      return undefined;
    }

    // Get workspace folder
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return undefined;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    const testPath = await calculateTestPath(uri, workspaceRoot);

    if (!testPath) {
      return undefined;
    }

    // Check if test file exists
    const testUri = vscode.Uri.file(testPath);
    const hasTest = await fileExists(testUri);

    if (hasTest) {
      const testRelativePath = path.relative(workspaceRoot, testPath);
      return {
        badge: '🟢',
        tooltip: `Test file exists: ${testRelativePath}`
      };
    }

    return undefined;
  }

  refresh(uri?: vscode.Uri): void {
    this._onDidChangeFileDecorations.fire(uri);
  }
}


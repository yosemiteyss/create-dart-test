import * as vscode from 'vscode';
import { DART_CLASS_REGEX, COMMAND_ID } from '../constants';
import { ClassInfo } from '../types';

export class DartTestCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    const lines = document.getText().split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(DART_CLASS_REGEX);
      if (match) {
        const [fullMatch, whole, className] = match;
        const range = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, whole.length)
        );

        const command: vscode.Command = {
          title: '$(beaker) Create test file',
          tooltip: `Create test file for ${className}`,
          command: COMMAND_ID,
          arguments: [{ uri: document.uri.toString(), className } as ClassInfo]
        };

        lenses.push(new vscode.CodeLens(range, command));
      }
    }

    return lenses;
  }
}


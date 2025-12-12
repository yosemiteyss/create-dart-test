import * as vscode from 'vscode';
import { VOID_MAIN_REGEX, UPDATE_GOLDENS_COMMAND_ID } from '../constants';

export class TestGoldenCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];

    // Only provide code lens for test files
    if (!document.fileName.endsWith('_test.dart')) {
      return lenses;
    }

    const lines = document.getText().split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(VOID_MAIN_REGEX);
      if (match) {
        const [fullMatch, whole] = match;
        const range = new vscode.Range(
          new vscode.Position(i, 0),
          new vscode.Position(i, whole.length)
        );

        const command: vscode.Command = {
          title: '$(sync) Update Goldens',
          tooltip: 'Run flutter test --update-goldens for this test file',
          command: UPDATE_GOLDENS_COMMAND_ID,
          arguments: [document.uri.fsPath]
        };

        lenses.push(new vscode.CodeLens(range, command));
      }
    }

    return lenses;
  }
}


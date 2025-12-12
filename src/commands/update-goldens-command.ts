import * as vscode from 'vscode';
import * as path from 'path';

export async function handleUpdateGoldensCommand(testFilePath: string): Promise<void> {
  try {
    const testUri = vscode.Uri.file(testFilePath);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(testUri);

    if (!workspaceFolder) {
      vscode.window.showErrorMessage('Test file is not in a workspace folder');
      return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    const relativeTestPath = path.relative(workspaceRoot, testFilePath);

    // Create a terminal to run the command
    const terminal = vscode.window.createTerminal({
      name: 'Update Goldens',
      cwd: workspaceRoot
    });

    terminal.show();
    terminal.sendText(`flutter test --update-goldens ${relativeTestPath}`);

    vscode.window.showInformationMessage(
      `Updating goldens for: ${path.basename(testFilePath)}`
    );
  } catch (err) {
    console.error('Failed to update goldens:', err);
    vscode.window.showErrorMessage(`Failed to update goldens: ${String(err)}`);
  }
}


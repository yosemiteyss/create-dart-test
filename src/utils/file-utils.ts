import * as vscode from 'vscode';

/**
 * Checks if a file exists
 */
export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  const dirUri = vscode.Uri.file(dirPath);
  try {
    await vscode.workspace.fs.createDirectory(dirUri);
  } catch {
    // Directory might already exist, that's fine
  }
}


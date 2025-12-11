import * as vscode from 'vscode';
import * as path from 'path';
import { ClassInfo } from '../types';
import { fileExists, ensureDirectoryExists } from '../utils/file-utils';
import {
  getPackageName,
  isUnderLibDirectory,
  calculateTestFileInfoForLib,
  calculateTestFileInfoForNonLib,
  generateTestContent
} from '../utils/test-file-utils';

/**
 * Opens an existing test file
 */
async function openExistingTestFile(testPath: string): Promise<void> {
  const testUri = vscode.Uri.file(testPath);
  const doc = await vscode.workspace.openTextDocument(testUri);
  await vscode.window.showTextDocument(doc, {
    preview: false,
    viewColumn: vscode.ViewColumn.Beside
  });
  vscode.window.showInformationMessage(
    `Test file already exists: ${path.basename(testPath)}`
  );
}

/**
 * Creates and opens a new test file
 */
async function createAndOpenTestFile(
  testPath: string,
  content: string,
  workspaceRoot: string
): Promise<void> {
  const testUri = vscode.Uri.file(testPath);
  await vscode.workspace.fs.writeFile(testUri, Buffer.from(content, 'utf8'));

  const doc = await vscode.workspace.openTextDocument(testUri);
  await vscode.window.showTextDocument(doc, {
    preview: false,
    viewColumn: vscode.ViewColumn.Beside
  });

  vscode.window.showInformationMessage(
    `Created test: ${path.relative(workspaceRoot, testPath)}`
  );
}

export async function handleCreateTestCommand(args: ClassInfo): Promise<void> {
  try {
    const sourceUri = vscode.Uri.parse(args.uri);
    const sourcePath = sourceUri.fsPath;
    const ext = path.extname(sourcePath);
    const sourceFileName = path.basename(sourcePath, ext);

    // Validate workspace
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri);
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('File is not in a workspace folder');
      return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    const relativePath = path.relative(workspaceRoot, sourcePath);

    // Get package name for package-style imports
    const packageName = await getPackageName(workspaceRoot);

    // Calculate test file paths
    const testFileInfo = isUnderLibDirectory(relativePath)
      ? calculateTestFileInfoForLib(workspaceRoot, sourcePath, relativePath, sourceFileName, ext, packageName)
      : calculateTestFileInfoForNonLib(sourcePath, sourceFileName, ext);

    const { testPath, importPath } = testFileInfo;
    const testUri = vscode.Uri.file(testPath);

    // Check if test file already exists
    if (await fileExists(testUri)) {
      await openExistingTestFile(testPath);
      return;
    }

    // Create new test file
    await ensureDirectoryExists(path.dirname(testPath));
    const testContent = generateTestContent(args.className, importPath);
    await createAndOpenTestFile(testPath, testContent, workspaceRoot);

  } catch (err) {
    console.error('Failed to create test file:', err);
    vscode.window.showErrorMessage(`Failed to create test file: ${String(err)}`);
  }
}


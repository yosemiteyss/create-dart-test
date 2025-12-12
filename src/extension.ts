import * as vscode from 'vscode';
import { COMMAND_ID, REFRESH_DECORATIONS_COMMAND_ID, UPDATE_GOLDENS_COMMAND_ID } from './constants';
import { ClassInfo } from './types';
import { DartTestCodeLensProvider } from './providers/create-test-code-lens-provider';
import { TestGoldenCodeLensProvider } from './providers/test-golden-code-lens-provider';
import { DartTestFileDecorationProvider } from './providers/test-file-decoration-provider';
import { handleCreateTestCommand } from './commands/create-test-command';
import { handleUpdateGoldensCommand } from './commands/update-goldens-command';

/**
 * Refresh the decoration for the related file (test <-> source)
 */
function refreshRelatedFile(uri: vscode.Uri, provider: DartTestFileDecorationProvider): void {
  const fsPath = uri.fsPath;

  if (fsPath.includes('_test.dart')) {
    // If a test file changed, refresh its source file
    const sourcePath = fsPath.replace('_test.dart', '.dart');
    provider.refresh(vscode.Uri.file(sourcePath));
  } else if (fsPath.endsWith('.dart')) {
    // If a source file changed, refresh its test file
    const testPath = fsPath.replace('.dart', '_test.dart');
    provider.refresh(vscode.Uri.file(testPath));
  }
}

export function activate(context: vscode.ExtensionContext): void {
  console.log('Create Test CodeLens extension activated for Dart/Flutter');

  // Register CodeLens provider for source files
  const codeLensProvider = new DartTestCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(['dart'], codeLensProvider)
  );

  // Register CodeLens provider for test files (update goldens)
  const testGoldenCodeLensProvider = new TestGoldenCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(['dart'], testGoldenCodeLensProvider)
  );

  // Register file decoration provider
  const decorationProvider = new DartTestFileDecorationProvider();
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(decorationProvider)
  );

  // Watch for file changes to refresh decorations
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.dart');

  fileWatcher.onDidCreate((uri) => {
    // Refresh decorations for the created file and potentially its source file
    decorationProvider.refresh(uri);
    refreshRelatedFile(uri, decorationProvider);
  });

  fileWatcher.onDidDelete((uri) => {
    // Refresh decorations when a file is deleted
    decorationProvider.refresh(uri);
    refreshRelatedFile(uri, decorationProvider);
  });

  context.subscriptions.push(fileWatcher);

  // Register command to manually refresh decorations
  context.subscriptions.push(
    vscode.commands.registerCommand(REFRESH_DECORATIONS_COMMAND_ID, () => {
      decorationProvider.refresh(undefined);
      vscode.window.showInformationMessage('Test file decorations refreshed');
    })
  );

  // Register create test command
  const commandDisposable = vscode.commands.registerCommand(
    COMMAND_ID,
    async (args: ClassInfo) => {
      await handleCreateTestCommand(args);
      // Refresh decorations after creating a test file
      decorationProvider.refresh(vscode.Uri.parse(args.uri));
    }
  );
  context.subscriptions.push(commandDisposable);

  // Register update goldens command
  const updateGoldensDisposable = vscode.commands.registerCommand(
    UPDATE_GOLDENS_COMMAND_ID,
    async (testFilePath: string) => {
      await handleUpdateGoldensCommand(testFilePath);
    }
  );
  context.subscriptions.push(updateGoldensDisposable);
}

export function deactivate(): void {
  // Cleanup if needed
}

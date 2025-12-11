import * as vscode from 'vscode';
import * as path from 'path';

// Regex to find class declarations in Dart 3
// Matches all Dart 3 class modifiers: abstract, base, interface, final, sealed, mixin
// Examples: class Foo, abstract class Foo, final class Foo, sealed class Foo, mixin class Foo
// Also supports: base mixin class Foo, abstract base class Foo, etc.
const DART_CLASS_REGEX = /^(\s*(?:(?:abstract|base|interface|final|sealed|mixin)\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*))/;

const COMMAND_ID = 'createTest.createTestForClass';

interface ClassInfo {
  uri: string;
  className: string;
}

interface TestFileInfo {
  testPath: string;
  importPath: string;
}

class DartTestCodeLensProvider implements vscode.CodeLensProvider {
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

/**
 * Determines if a file path is under the lib/ directory
 */
function isUnderLibDirectory(relativePath: string): boolean {
  return relativePath.startsWith('lib' + path.sep) || relativePath.startsWith('lib/');
}

/**
 * Reads the package name from pubspec.yaml
 */
async function getPackageName(workspaceRoot: string): Promise<string | null> {
  try {
    const pubspecPath = path.join(workspaceRoot, 'pubspec.yaml');
    const pubspecUri = vscode.Uri.file(pubspecPath);
    const pubspecContent = await vscode.workspace.fs.readFile(pubspecUri);
    const content = Buffer.from(pubspecContent).toString('utf8');

    // Extract package name using regex
    const match = content.match(/^name:\s*([a-z_][a-z0-9_]*)\s*$/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Calculates the test file path and import path for a source file under lib/
 */
function calculateTestFileInfoForLib(
  workspaceRoot: string,
  sourcePath: string,
  relativePath: string,
  sourceFileName: string,
  ext: string,
  packageName: string | null
): TestFileInfo {
  // Remove 'lib/' prefix to get path structure
  const pathUnderLib = relativePath.substring(4);
  const dirUnderLib = path.dirname(pathUnderLib);
  const testFileName = sourceFileName + '_test' + ext;

  // Build test path: test/ + same structure as lib/
  const testDir = path.join(workspaceRoot, 'test', dirUnderLib);
  const testPath = path.join(testDir, testFileName);

  // Generate package-style import path
  let importPath: string;
  if (packageName) {
    // Use package import: package:my_app/models/user.dart
    const pathForImport = pathUnderLib.split(path.sep).join('/');
    importPath = `package:${packageName}/${pathForImport}`;
  } else {
    // Fallback to relative import if package name not found
    const testRelativePath = path.relative(workspaceRoot, testPath);
    const sourceRelativePath = path.relative(workspaceRoot, sourcePath);
    importPath = path.relative(path.dirname(testRelativePath), sourceRelativePath);
    // Convert Windows backslashes to forward slashes for Dart imports
    importPath = importPath.split(path.sep).join('/');
  }

  return { testPath, importPath };
}

/**
 * Calculates the test file path and import path for a source file not under lib/
 */
function calculateTestFileInfoForNonLib(
  sourcePath: string,
  sourceFileName: string,
  ext: string
): TestFileInfo {
  const sourceDir = path.dirname(sourcePath);
  const testFileName = sourceFileName + '_test' + ext;
  const testPath = path.join(sourceDir, testFileName);
  const importPath = './' + sourceFileName + ext;

  return { testPath, importPath };
}

/**
 * Generates the test file content
 */
function generateTestContent(className: string, importPath: string): string {
  return `import '${importPath}';\n\n` +
    `void main() {\n` +
    `  group('${className}', () {\n\n` +
    `  });\n` +
    `}\n`;
}

/**
 * Checks if a file exists
 */
async function fileExists(uri: vscode.Uri): Promise<boolean> {
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
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  const dirUri = vscode.Uri.file(dirPath);
  try {
    await vscode.workspace.fs.createDirectory(dirUri);
  } catch {
    // Directory might already exist, that's fine
  }
}

/**
 * Opens an existing test file
 */
async function openExistingTestFile(testPath: string): Promise<void> {
  const testUri = vscode.Uri.file(testPath);
  const doc = await vscode.workspace.openTextDocument(testUri);
  await vscode.window.showTextDocument(doc);
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
  await vscode.window.showTextDocument(doc);

  vscode.window.showInformationMessage(
    `Created test: ${path.relative(workspaceRoot, testPath)}`
  );
}

async function handleCreateTestCommand(args: ClassInfo): Promise<void> {
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

export function activate(context: vscode.ExtensionContext): void {
  console.log('Create Test CodeLens extension activated for Dart/Flutter');

  // Register CodeLens provider
  const codeLensProvider = new DartTestCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(['dart'], codeLensProvider)
  );

  // Register command
  const commandDisposable = vscode.commands.registerCommand(
    COMMAND_ID,
    handleCreateTestCommand
  );
  context.subscriptions.push(commandDisposable);
}

export function deactivate(): void {
  // Cleanup if needed
}

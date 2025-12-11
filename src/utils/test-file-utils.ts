import * as vscode from 'vscode';
import * as path from 'path';
import { TestFileInfo } from '../types';

/**
 * Determines if a file path is under the lib/ directory
 */
export function isUnderLibDirectory(relativePath: string): boolean {
  return relativePath.startsWith('lib' + path.sep) || relativePath.startsWith('lib/');
}

/**
 * Reads the package name from pubspec.yaml
 */
export async function getPackageName(workspaceRoot: string): Promise<string | null> {
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
export function calculateTestFileInfoForLib(
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
export function calculateTestFileInfoForNonLib(
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
export function generateTestContent(className: string, importPath: string): string {
  return `import '${importPath}';\n\n` +
    `void main() {\n` +
    `  group('${className}', () {\n\n` +
    `  });\n` +
    `}\n`;
}

/**
 * Calculate the expected test file path for a given source file
 */
export async function calculateTestPath(
  uri: vscode.Uri,
  workspaceRoot: string
): Promise<string | null> {
  const sourcePath = uri.fsPath;
  const relativePath = path.relative(workspaceRoot, sourcePath);
  const ext = path.extname(sourcePath);
  const sourceFileName = path.basename(sourcePath, ext);

  let testPath: string;
  if (isUnderLibDirectory(relativePath)) {
    const packageName = await getPackageName(workspaceRoot);
    const pathUnderLib = relativePath.substring(4);
    const dirUnderLib = path.dirname(pathUnderLib);
    const testFileName = sourceFileName + '_test' + ext;
    const testDir = path.join(workspaceRoot, 'test', dirUnderLib);
    testPath = path.join(testDir, testFileName);
  } else {
    const sourceDir = path.dirname(sourcePath);
    const testFileName = sourceFileName + '_test' + ext;
    testPath = path.join(sourceDir, testFileName);
  }

  return testPath;
}


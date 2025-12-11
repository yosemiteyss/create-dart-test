// Regex to find class declarations in Dart 3
// Matches all Dart 3 class modifiers: abstract, base, interface, final, sealed, mixin
// Examples: class Foo, abstract class Foo, final class Foo, sealed class Foo, mixin class Foo
// Also supports: base mixin class Foo, abstract base class Foo, etc.
export const DART_CLASS_REGEX = /^(\s*(?:(?:abstract|base|interface|final|sealed|mixin)\s+)*class\s+([A-Za-z_][A-Za-z0-9_]*))/;

export const COMMAND_ID = 'createTest.createTestForClass';
export const REFRESH_DECORATIONS_COMMAND_ID = 'createTest.refreshDecorations';

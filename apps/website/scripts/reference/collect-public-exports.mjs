import ts from 'typescript';

function getDeclarationKind(declaration) {
  if (ts.isFunctionDeclaration(declaration)) return 'function';
  if (ts.isInterfaceDeclaration(declaration)) return 'interface';
  if (ts.isTypeAliasDeclaration(declaration)) return 'type';
  if (ts.isClassDeclaration(declaration)) return 'class';
  if (ts.isEnumDeclaration(declaration)) return 'enum';
  return 'symbol';
}

function sanitizeText(value) {
  return String(value)
    .replace(/\{@link\s+([^}\s|]+)(?:\s*\|\s*([^}]+))?\s*\}/g, (_, target, label) => label ?? target)
    .replace(/\s+/g, ' ')
    .trim();
}

function getDescription(symbol, checker) {
  const description = sanitizeText(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
  if (description.length > 0) return description;

  return '';
}

function getSymbolTarget(symbol, checker) {
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    return checker.getAliasedSymbol(symbol);
  }

  return symbol;
}

/**
 * Collect public API entries from `packages/shardwire/src/index.ts` (same surface the reference generator uses).
 *
 * @param {string} indexFile Absolute path to `index.ts`
 */
export function collectPublicExports(indexFile) {
  const program = ts.createProgram([indexFile], {
    allowJs: false,
    checkJs: false,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(indexFile);

  if (!sourceFile) {
    throw new Error(`Unable to read TypeScript source file: ${indexFile}`);
  }

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) {
    throw new Error(`Unable to resolve exports from: ${indexFile}`);
  }

  const entries = [];

  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol = getSymbolTarget(exported, checker);
    const declaration =
      symbol.getDeclarations()?.find((candidate) => {
        return (
          ts.isFunctionDeclaration(candidate) ||
          ts.isInterfaceDeclaration(candidate) ||
          ts.isTypeAliasDeclaration(candidate) ||
          ts.isClassDeclaration(candidate) ||
          ts.isEnumDeclaration(candidate)
        );
      }) ?? symbol.getDeclarations()?.[0];

    if (!declaration || !declaration.getSourceFile().fileName.endsWith('.ts')) {
      continue;
    }

    const description = getDescription(symbol, checker);
    entries.push({
      name: symbol.getName(),
      declaration,
      kind: getDeclarationKind(declaration),
      description,
    });
  }

  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

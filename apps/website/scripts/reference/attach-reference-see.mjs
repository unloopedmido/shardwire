/**
 * Appends stable `@see` tags to published reference URLs for every public export
 * (same list as the reference doc generator). Idempotent: safe to re-run.
 *
 * Keeps `packages/shardwire` in sync with `apps/website/scripts/reference/routing.mjs`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { collectPublicExports } from './collect-public-exports.mjs';
import { getReferenceCategoryId, slugify } from './routing.mjs';

/** Published site origin; paths include `/docs/reference/`. */
const REFERENCE_SEE_ORIGIN = 'https://shardwire.js.org';

const GUIDE_SEE_LINE =
  /^\s*\*\s@see\s+https:\/\/shardwire\.js\.org\/(?!docs\/reference)[^\r\n]*\r?\n?/gm;

function referenceUrlForExport(name) {
  const category = getReferenceCategoryId(name);
  const slug = slugify(name);
  return `${REFERENCE_SEE_ORIGIN}/docs/reference/${category}/${slug}/`;
}

function declarationHasCorrectSee(fullText, declaration, url) {
  const ranges = ts.getJSDocCommentRanges(declaration, fullText) ?? [];
  for (const range of ranges) {
    const text = fullText.slice(range.pos, range.end);
    if (text.includes(`@see ${url}`)) {
      return true;
    }
  }
  return false;
}

function patchJSDocBlock(block, url) {
  const trimmed = block.replace(/\r\n/g, '\n');
  if (trimmed.includes(`@see ${url}`)) {
    return null;
  }
  let next = trimmed.replace(GUIDE_SEE_LINE, '');
  const standardClose = /\n \*\/\s*$/.exec(next);
  if (standardClose) {
    const idx = standardClose.index;
    return `${next.slice(0, idx)}\n * @see ${url}${next.slice(idx)}`;
  }
  const close = next.lastIndexOf('*/');
  if (close === -1) {
    return null;
  }
  return `${next.slice(0, close)} * @see ${url}\n${next.slice(close)}`;
}

/**
 * @param {string} fullText
 * @param {import('typescript').SourceFile} sourceFile
 * @param {import('typescript').Node} declaration
 * @param {string} url
 * @returns {{ start: number, end: number, text: string } | null}
 */
function buildEditForDeclaration(fullText, sourceFile, declaration, url) {
  if (declarationHasCorrectSee(fullText, declaration, url)) {
    return null;
  }

  const ranges = ts.getJSDocCommentRanges(declaration, fullText) ?? [];
  if (ranges.length > 0) {
    const last = ranges[ranges.length - 1];
    const original = fullText.slice(last.pos, last.end);
    const patched = patchJSDocBlock(original, url);
    if (patched === null) {
      return null;
    }
    return { start: last.pos, end: last.end, text: patched };
  }

  const start = declaration.getStart();
  const prev = start > 0 ? fullText[start - 1] : '';
  const prefix = prev !== '\n' && prev !== '' ? '\n' : '';
  const insert = `${prefix}/**\n * @see ${url}\n */\n`;
  return { start, end: start, text: insert };
}

export function attachReferenceSeeTags({
  indexFile = path.resolve(process.cwd(), '..', '..', 'packages', 'shardwire', 'src', 'index.ts'),
} = {}) {
  const entries = collectPublicExports(indexFile);
  /** @type {Map<string, Array<{ start: number; end: number; text: string }>>} */
  const editsByFile = new Map();

  for (const entry of entries) {
    const declaration = entry.declaration;
    const sourceFile = declaration.getSourceFile();
    const fileName = sourceFile.fileName;
    const fullText = sourceFile.getFullText();
    const url = referenceUrlForExport(entry.name);
    const edit = buildEditForDeclaration(fullText, sourceFile, declaration, url);
    if (!edit) {
      continue;
    }
    const list = editsByFile.get(fileName) ?? [];
    list.push(edit);
    editsByFile.set(fileName, list);
  }

  let editsApplied = 0;
  for (const [fileName, edits] of editsByFile) {
    edits.sort((a, b) => b.start - a.start);
    let out = readFileSync(fileName, 'utf8');
    const original = out;
    for (const edit of edits) {
      out = `${out.slice(0, edit.start)}${edit.text}${out.slice(edit.end)}`;
      editsApplied += 1;
    }
    if (out !== original) {
      writeFileSync(fileName, out, 'utf8');
    }
  }

  return { filesTouched: editsByFile.size, editsApplied };
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    const { filesTouched, editsApplied } = attachReferenceSeeTags();
    console.log(`attach-reference-see: ${editsApplied} edit(s) across ${filesTouched} file(s).`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

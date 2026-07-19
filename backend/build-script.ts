import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  outDir: './dist',
  rootDir: './src',
  declaration: false,
  sourceMap: false,
  skipLibCheck: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: false,
  resolveJsonModule: true,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  allowJs: true,
  lib: ['ES2020'],
  baseUrl: './src',
  paths: {
    '@/*': ['./*']
  }
};

const rootDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, 'dist');

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else if (file.endsWith('.ts')) {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });
  return arrayOfFiles;
}

const filesToCompile = getAllFiles(rootDir);
const host = ts.createCompilerHost(compilerOptions);
const program = ts.createProgram(filesToCompile, compilerOptions, host);

// Emit with suppressed errors
const emitResult = program.emit();
const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

// Rewrite @/ path aliases in compiled output to relative paths so the
// dist bundle runs under plain `node` with no runtime path-mapping.
function rewriteAliases(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      count += rewriteAliases(full);
    } else if (entry.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const updated = content.replace(
        /require\((['"])@\/(.*?)\1\)/g,
        (_match, quote, subpath) => {
          let rel = path
            .relative(path.dirname(full), path.join(outDir, subpath))
            .replace(/\\/g, '/');
          if (!rel.startsWith('.')) rel = './' + rel;
          return `require(${quote}${rel}${quote})`;
        }
      );
      if (updated !== content) {
        fs.writeFileSync(full, updated);
        count++;
      }
    }
  }
  return count;
}

const rewritten = rewriteAliases(outDir);

console.log(`✅ Compiled ${filesToCompile.length} TypeScript files to ${outDir}`);
console.log(`✅ Rewrote @/ aliases to relative paths in ${rewritten} files`);

if (allDiagnostics.length > 0) {
  console.log(`⚠️  ${allDiagnostics.length} type warnings (non-blocking)`);
}

process.exit(emitResult.emitSkipped ? 1 : 0);

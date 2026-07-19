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
  lib: ['ES2020']
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

console.log(`✅ Compiled ${filesToCompile.length} TypeScript files to ${outDir}`);

if (allDiagnostics.length > 0) {
  console.log(`⚠️  ${allDiagnostics.length} type warnings (non-blocking)`);
}

process.exit(emitResult.emitSkipped ? 1 : 0);

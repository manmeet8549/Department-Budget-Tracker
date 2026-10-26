import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

// Regex patterns for hex colors and rgba()/rgb() calls
// 1. Matches hex colors like #fff, #15803d, #ffffff, #074ce0ff, while excluding template expressions like #${id}
const hexColorRegex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{8}|[0-9a-fA-F]{3,4})\b/g;
// 2. Matches rgba(...) or rgb(...) color function calls
const rgbaColorRegex = /\brgba?\s*\(/gi;

const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.css']);
const violations = [];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;

      // Allow tokens.css to declare base color values
      if (entry.name === 'tokens.css') continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        // Strip line comments
        const cleanLine = line.split('//')[0];

        // Check for rgb / rgba calls
        let match;
        while ((match = rgbaColorRegex.exec(cleanLine)) !== null) {
          violations.push({
            file: path.relative(srcDir, fullPath),
            line: lineIndex + 1,
            match: match[0],
            content: line.trim(),
          });
        }

        // Check for hex colors (skip if part of a template string like `#${id}`)
        while ((match = hexColorRegex.exec(cleanLine)) !== null) {
          const matchIndex = match.index;
          // Check if followed immediately by `{` which indicates template syntax like `#{...}`
          const after = cleanLine.slice(matchIndex, matchIndex + match[0].length + 1);
          if (after.includes('{')) continue;

          violations.push({
            file: path.relative(srcDir, fullPath),
            line: lineIndex + 1,
            match: match[0],
            content: line.trim(),
          });
        }
      });
    }
  }
}

scanDirectory(srcDir);

if (violations.length > 0) {
  console.error('\n❌ HARDCODED COLORS CHECK FAILED:');
  console.error(
    `Found ${violations.length} hardcoded color instance(s) outside tokens.css:\n`
  );
  violations.forEach((v) => {
    console.error(`  ${v.file}:${v.line} -> "${v.match}" in: ${v.content}`);
  });
  console.error(
    '\nAll colors, shadows, and gradients must use CSS custom properties from tokens.css.\n'
  );
  process.exit(1);
} else {
  console.log(
    '✓ All source files pass color check: zero hardcoded hex or rgba() colors outside tokens.css!'
  );
  process.exit(0);
}

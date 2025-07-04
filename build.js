#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Copy TypeScript file as JavaScript (simple transpilation)
const srcFile = path.join(__dirname, 'src', 'index.ts');
const content = fs.readFileSync(srcFile, 'utf8');

// Remove TypeScript-specific syntax (basic transformation)
let jsContent = content
  // Remove type annotations
  .replace(/:\s*\w+(\[\])?(\s*[=;,\)])/g, '$2')
  .replace(/:\s*\{[^}]+\}/g, '')
  .replace(/:\s*Record<[^>]+>/g, '')
  .replace(/:\s*Promise<[^>]+>/g, '')
  .replace(/:\s*any/g, '')
  .replace(/:\s*void/g, '')
  .replace(/:\s*string/g, '')
  .replace(/:\s*number/g, '')
  .replace(/:\s*boolean/g, '')
  .replace(/:\s*null/g, '')
  // Remove interface declarations
  .replace(/export\s+interface\s+\w+\s*\{[^}]+\}/gs, '')
  // Remove type exports
  .replace(/export\s+type\s+[^;]+;/g, '')
  // Remove generic type parameters
  .replace(/<[^>]+>/g, '')
  // Convert export class to module.exports
  .replace(/export\s+class\s+(\w+)/g, 'class $1')
  .replace(/export\s+default\s+(\w+);?/g, 'module.exports = $1;')
  // Add module.exports for the class
  .replace(/class AffiliateSDK \{/, 'class AffiliateSDK {\n}\n\nmodule.exports = AffiliateSDK;\nmodule.exports.AffiliateSDK = AffiliateSDK;\n\nclass AffiliateSDK {');

// Write to dist
fs.writeFileSync(path.join(distDir, 'index.js'), jsContent);

// Also create a simple ES module version
const esmContent = content
  // Keep it mostly as-is for ESM
  .replace(/export\s+interface/g, '// interface')
  .replace(/:\s*\w+(\[\])?(\s*[=;,\)])/g, '$2')
  .replace(/:\s*\{[^}]+\}/g, '')
  .replace(/:\s*Record<[^>]+>/g, '')
  .replace(/:\s*Promise<[^>]+>/g, '')
  .replace(/:\s*any/g, '')
  .replace(/:\s*void/g, '')
  .replace(/:\s*string/g, '')
  .replace(/:\s*number/g, '')
  .replace(/:\s*boolean/g, '')
  .replace(/:\s*null/g, '')
  .replace(/<[^>]+>/g, '');

fs.writeFileSync(path.join(distDir, 'index.esm.js'), esmContent);

// Copy React files
const reactSrcFile = path.join(__dirname, 'src', 'react.tsx');
if (fs.existsSync(reactSrcFile)) {
  const reactContent = fs.readFileSync(reactSrcFile, 'utf8');
  const reactJsContent = reactContent
    .replace(/:\s*\w+(\[\])?(\s*[=;,\)])/g, '$2')
    .replace(/:\s*\{[^}]+\}/g, '')
    .replace(/:\s*React\.\w+/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/:\s*any/g, '')
    .replace(/\.tsx/g, '.js');
  
  fs.writeFileSync(path.join(distDir, 'react.js'), reactJsContent);
}

console.log('Build completed successfully!');
console.log('Files created:');
console.log('- dist/index.js (CommonJS)');
console.log('- dist/index.esm.js (ES Module)');
if (fs.existsSync(path.join(distDir, 'react.js'))) {
  console.log('- dist/react.js');
}
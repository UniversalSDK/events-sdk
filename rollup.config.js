const typescript = require('@rollup/plugin-typescript');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');

module.exports = [
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    },
    external: ['react', 'react-router-dom'],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: false,
        compilerOptions: {
          target: 'es2015',
          module: 'esnext',
          declaration: false,
          removeComments: true,
          esModuleInterop: true,
          skipLibCheck: true
        }
      }),
      terser()
    ]
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    external: ['react', 'react-router-dom'],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: false,
        compilerOptions: {
          target: 'es2015',
          module: 'esnext',
          declaration: false,
          removeComments: true,
          esModuleInterop: true,
          skipLibCheck: true
        }
      }),
      terser()
    ]
  }
];
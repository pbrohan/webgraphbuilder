import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import nodePolyfills from 'rollup-plugin-polyfill-node';

export default {
  input: 'src/index.js', // Entry point of your application
  output: {
    file: 'output/bundle.js', // Output bundle
    format: 'es', // Self-executing function, suitable for browsers
    sourcemap: true,
  },
  plugins: [
    resolve(), // Resolves node_modules imports
    commonjs(), // Converts CommonJS modules to ES6
    terser(), // Minifies the output
    nodePolyfills()
  ],
};
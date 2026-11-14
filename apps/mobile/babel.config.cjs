// The shared Babel config (@ab/mobile-kit/babel: the React Compiler for every caller, Metro and
// jest); app.json `experiments.reactCompiler` is the one switch.
const { expo } = require('./app.json');

module.exports = require('@ab/mobile-kit/babel')(expo.experiments?.reactCompiler);

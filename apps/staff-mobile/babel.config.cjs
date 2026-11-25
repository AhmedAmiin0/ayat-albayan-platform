// The shared Babel config (@ab/config/babel: the React Compiler for every caller, Metro and
// jest); app.json `experiments.reactCompiler` is the one switch.
const { expoBabel } = require('@ab/config/babel');
const { expo } = require('./app.json');

module.exports = expoBabel(__dirname, expo.experiments?.reactCompiler);

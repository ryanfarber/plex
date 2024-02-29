// inspect.js

const util = require("util")
module.exports = (input) => console.log(util.inspect(input, {depth: 10}))
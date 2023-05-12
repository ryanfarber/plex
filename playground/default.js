// default.js


require("dotenv").config({path: "../.env"})
const fs = require("fs")
const fsp = require("fs").promises
const path = require("path")
const Plex = require("../src")
const Logger = require("@ryanforever/logger").v2
const logger = new Logger(__filename, {debug: true})

let plex = new Plex({
	host: "192.168.1.128",
	token: process.env.PLEX_TOKEN,
	// useCachedLibrary: true
})



// plex.getLibrary().then(console.log)
// plex.listLibraries().then(console.log)
// plex.test().then(console.log)

// test3.js

require("dotenv").config({path: "../.env"})
const fs = require("fs")
const fsp = require("fs").promises
const path = require("path")
const Plex = require("../src")
const Logger = require("@ryanforever/logger").v2
const logger = new Logger(__filename, {debug: true})
const inspect = require("@ryanforever/inspect")
const qs = require("querystring")
const Airtable = require("../../airtable")

const airtable = new Airtable({
	key: process.env.AIRTABLE_KEY,
	baseId: "appMgxNYPzgiKM5Fv"
})

const plex = new Plex({
	host: "192.168.1.128",
	token: process.env.PLEX_TOKEN,
	useCachedLibrary: true,
	debug: true
})





// plex.findLibrary("All Movies").then(inspect)
// plex.getLibraries().then(inspect)
// plex.getLibraryCollections(4).then(inspect)
// plex.getCollections().then(inspect)
// plex.getCollectionById(7551).then(inspect)
// plex.findCollection("Balenciaga").then(inspect)
// plex.searchCollections("test").then(inspect)




////////////////////////////////////////////////////////////
// POST DATA
////////////////////////////////////////////////////////////

// plex.search("evangelion", {returnRaw: false}).then(inspect)




// plex.updateCollection(65257, {
// 	name: "azooooopedddddddr",
// 	summary: "hello world 24sssss44",
// 	visibility: {
// 		home: false,
// 		friends: false,
// 		recommended: false
// 	}
// })


// plex.getCollectionVisibility(65257).then(inspect)


plex.setCollectionVisibility(65257, {
	library: true,
	home: true,
	friends: false,
})

// plex.request("/library/collections/65257").then(inspect)
// plex.getCollection(65257).then(inspect)
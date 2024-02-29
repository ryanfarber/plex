

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


let plex = new Plex({
	host: "192.168.1.128",
	token: process.env.PLEX_TOKEN,
	useCachedLibrary: true
})


// plex.createCollection("_test2").then(console.log)

// plex.request("http://192.168.1.128:32400/library/collections/29014/children").then(inspect)

// plex.request("http://192.168.1.128:32400/library/collections/", {
// 	method: "PUT",
// 	params: {
// 		title: "test collection 2",
// 		type: 1,
// 		smart: 0,
// 		sectionId: 4
// 	}
// }).then(inspect)

// getCollection("65257").then(console.log)

// addToCollection("test collection 3", "58804")

// updateCollection("test", {
// 	summary: "test ahelo sdfeh"
// })

// getCollections().then(inspect)
getLibraries().then(inspect)


async function addToCollection(collectionName, ratingKey) {
	let collection = await findCollection(collectionName)
	let collectionId = collection.ratingKey
	let res = await plex.request(`/library/collections/${collectionId}/items`, {
		method: "PUT",
		params: {
			uri: `server://b1f764e31939b8b390796f1e691c4c8b9c680f75/com.plexapp.plugins.library/library/metadata/${ratingKey}`
		}
	})
	
	console.log(res)
}


async function getLibraries() {
	let res = await plex.request("/library/sections")
	console.log(res.MediaContainer.Directory)
}



async function getCollections() {
	logger.debug(`getting collections...`)
	let res = await plex.request("/library/sections/4/collections")
	return res.MediaContainer.Metadata
}


async function getCollection(input) {
	let collectionMeta = await findCollection(input)
	let collectionItems = await getCollectionItems(collectionMeta.ratingKey)
	let obj = {
		...collectionMeta,
		items: collectionItems
	}
	return obj
}

async function updateCollection(collectionName, data = {}) {
	
	let schema = {
		"summary.value": data.summary

	}
	let query = qs.stringify(schema)
	console.log(query)
}

async function getCollectionItems(ratingKey) {
	let res = await plex.request(`/library/collections/${ratingKey}/children`)
	let data = res.MediaContainer.Metadata
	return data
}

async function findCollection(input) {
	logger.debug(`finding collection "${input}"`)
	let collections = await getCollections()
	let match = collections.find(x => {
		let title = x.title.toLowerCase()
		return title == input.toLowerCase() || x.ratingKey == input
	})
	if (!match) throw new Error(`could not find collection "${input}"`)
	else return match
}
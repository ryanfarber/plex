// plex.js

// test.js

require("dotenv").config({path: "../.env"})
const fs = require("fs")
const fsp = require("fs").promises
const path = require("path")
const Plex = require("../src")
const Logger = require("@ryanforever/logger").v2
const logger = new Logger(__filename, {debug: true})


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


plex.createCollection()


// plex.getMovies().then(res => {
// 	res.forEach(console.log)
// })
// plex.getMovies(true).then(async plexItems => {
// 	// plexItems.forEach(x => console.log(x))
// 	plexItems = plexItems.filter(x => x.librarySectionTitle == "All Movies")
// 	let cloudItems = await airtable.get("items")
// 	cloudItems.forEach(cloudItem => {
// 		let match = plexItems.find(x => x.name == cloudItem.data.name)
// 		if (match) {
// 			cloudItem.actions.updateFields({
// 				id: match.id
// 			})
// 		}
// 	})
// 	// console.log(cloudItems[0].actions)
// 	// console.log(res)
// 	// console.log(cloud)

// 	// console.log(res)
// 	// addItems(res)
// 	// let first = res[0]
// 	// addItem(first)
// })


// initItems()
// cacheDatabase()

// syncItems()
// syncRatings()


async function syncRatings() {
	let plexItems = await plex.getMovies(true)
	plexItems = plexItems.filter(x => x.library == "All Movies")
	let cloudItems = await airtable.client.table("items").select({
		fields: ["id", "audienceRating"]
	}).all()
	// console.log(plexItems)


	cloudItems.forEach(cloudItem => {
		let match = plexItems.find(plexItem => plexItem.id == cloudItem.fields.id)
		if (match.audienceRating !== cloudItem?.fields?.audienceRating) {
			let audienceRating = match.audienceRating
			cloudItem.updateFields({
				audienceRating
			}, {
				typecast: true
			}).then(() => {
				console.log(`✅ updated ${cloudItem.fields.name}`)
			}).catch(err => {
				logger.error(err)
			})
		}
	})
}



async function syncItems() {
	let plexItems = await plex.getMovies(true)
	plexItems = plexItems.filter(x => x.library == "All Movies")
	// console.log(plexItems)
	addItems(plexItems)
}



async function initItems() {
	let plexItems = await plex.getMovies(true)
	plexItems = plexItems.filter(x => x.library == "All Movies")
	// console.log(plexItems)
	addItems(plexItems)
}


// async function updateItems() {
// 	let plexItems = await plex.getMovies()
// 	plexItems = plexItems.filter(x => x.librarySectionTitle == "All Movies")
// 	let cloudItems = await airtable.get("items")
// 	cloudItems.forEach(cloudItem => {
// 		let match = plexItems.find(x => x.name == cloudItem.data.name)
// 		if (match) {
// 			cloudItem.actions.updateFields({
// 				id: match.id
// 			})
// 		}
// 	})
// }



async function cacheDatabase() {
	logger.debug("caching database")
	let res = await airtable.client.table("items").select({
		fields: ["name", "id", "modifiedAt", "createdAt"]
	}).all()
	let data = res.map(x => x.fields)

	let obj = {
		updatedAt: new Date(Date.now()),
		numItems: data.length,
		data
	}
	let json = JSON.stringify(obj, null, 2)
	let filename = "cloud-cache.json"
	let filepath = path.join("../cache", filename)
	fs.writeFileSync(filepath, json)
}

async function getCache() {
	logger.debug("getting cache")
	await cacheDatabase()
	let cache = require("../cache/cloud-cache.json")
	return cache.data
}



// airtable.get("items").then(res => {
// 	// console.log(res[1].data.thumbnail)
// })

async function addItems(items = []) {
	let cache = await getCache()
	let added = 0

	let cacheIds = cache.map(x => x.id)

	let itemsToAdd = items.filter(item => !cacheIds.includes(item.id))
	logger.log(`attempting to add ${itemsToAdd.length} item(s)`)


	for (let item of itemsToAdd) {
		if (cacheIds.includes(item.id)) continue
		else {
			added ++
			addItem(item).then(() => {
				console.log(`✅ added ${item.title}`)
			}).catch(err => {
				logger.error(err)
			})
		}
	}

	logger.log(`${added} item(s) added`)
	
}
async function addItem(d = {}) {
	return await airtable.add("items", {
		name: d.title,
		"original title": d.originalTitle,
		year: d.year,
		id: d.id,
		summary: d.summary,
		tagline: d.tagline,
		// thumbnail: (d.art) ? [{url: d.art}] : undefined,
		type: d.type,
		duration_ms: d.duration,
		studio: d.studio,
		actors: d.role,
		rating: d.rating,
		countries: d.country,
		directors: d.director,
		writers: d.writer,
		genres: d.genre
	})
}
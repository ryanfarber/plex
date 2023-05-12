// airtable.js


require("dotenv").config()
const fs = require("fs")
const path = require("path")
const Plex = require("./src")
const Airtable = require("../airtable")
const airtable = new Airtable({
	key: process.env.AIRTABLE_KEY,
	baseId: process.env.AIRTABLE_BASE_ID
})

const Logger = require("@ryanforever/logger").v2
const logger = new Logger(__filename, {debug: true})

let plex = new Plex({
	host: "192.168.1.128",
	token: process.env.PLEX_TOKEN,
	useCachedLibrary: true
})


// plex.listGenres().then(res => {

// 	airtable.add("genres",)
// })
// airtable.add("movies", {
// 	actors: ["brady corbet"]
// })

// syncGenres()
// syncDirectors()
syncItems("actors")
// plex.getLibrary().then(console.log)
// plex.listStudios().then(console.log)






async function syncItems(item) {
	logger.debug(`syncing "${item}"...`)
	if (!item) throw new Error("please choose what you want to sync. i.e. writers, directors, etc")
	let plexData, dbData

	dbData = await airtable.get(item)
	dbData = dbData.map(x => x?.data?.name?.toLowerCase())

	if (item == "directors") plexData = await plex.listDirectors()
	else if (item == "actors") plexData = await plex.listActors()
	else if (item == "genres") plexData = await plex.listGenres()
	else if (item == "writers") plexData = await plex.listWriters()
	else if (item == "studios") plexData = await plex.listStudios()
	else if (item == "countries") plexData = await plex.listCountries()

	let numPlexItems = plexData.length
	let numDbItems = dbData.length
	let numAdded = 0
	let numProcessed = 0
	let numCompleted = 0
	logger.debug(`summary:\n\nfound ${numPlexItems} ${item} in Plex\nfound ${numDbItems} ${item} in DB.\n`)


	for (let x of plexData) {
		let name = x.toLowerCase()
		let displayName = x
		if (!dbData.includes(name)) {
			numAdded++
			airtable.add(item, {name, displayName}).then(() => {
				logger.debug(`added "${name}" to "${item}"`)
				numCompleted++
			})
		}
	}

	if (numAdded == 0) logger.debug(`nothing to sync ✅`)
	else logger.debug(`added ${numAdded} ${item}!`)

}
// nfo-scraper.js




const fs = require("fs")
const fsp = require("fs").promises
const path = require("path")
const convertXML = require('xml-js')
const {XMLParser} = require("fast-xml-parser")
const Logger = require("@ryanforever/logger")
const logger = new Logger(__filename, {debug: false})
const _ = require("underscore")
const MiniSearch = require("minisearch")



function NFOScraper(config = {}) {
	const directories = config.directories


	this.analyze = function() {
		directories.forEach(filepath => {

		})
	}
}




const folder = "/Volumes/movies_A/MOVIES/All/"

let folderList = [
	"/Volumes/movies_A/MOVIES/All/",
	"/Volumes/movies_A/MOVIES/Mockumentaries/",
	"/Volumes/movies_A/MOVIES/Anime/",
	"/Volumes/movies_A/MOVIES/Disney/",
	"/Volumes/movies_A/MOVIES/Short Films/"
]
scrapeFolder(folderList[4]).then(console.log)
// analyzeFolder(folder)
// saveTagData(folder)

// batchProcessTags(folderList)
// 

// searchTags("girl", true)

async function searchTags(query, simple) {
	console.log("searching...\n")
	let scrapeData = require("./output/full-data.json")
	let minisearch = new MiniSearch({
		fields: ["title", "tags", "plot"],
		// processTerm: (term, _fieldName) => stopWords.has(term) ? null : term.toLowerCase(),
		searchOptions: {
			boost: { tags: 2 },
			fuzzy: .02
		}
	})
	let movies = scrapeData.movies.map((x, i) => {
		x = x
		x.id = i + 1
		return x
	})
	minisearch.addAll(movies)

	let res = minisearch.search(query)

	let matches = res.map(x => {
		let match = movies.find(y => y.id == x.id)
		// console.log(match)
		return {
			title: match.title,
			// plot: match.plot,
			// genre: match.genre,
			year: match.year,
			terms: x.terms
		}
	})
	// let output = res.map(x => x.match)
	console.log(matches)
	console.log(`\nfound ${matches.length} movies matching "${query}"`)
	return matches
}



// process multiple folders and save
async function batchProcessTags(folderArray) {
	console.log(`batch processing ${folderArray.length} folders...\n`)
	let collector = []
	
	for (let folder of folderArray) {
		console.log(`scraping ${folder}...`)
		let data = await scrapeFolder(folder)
		data.forEach(x => collector.push(x))
		console.log(`done.`)
	}

	console.log("\nsaving data...\n")

	saveMovieData(collector, {
		folders: folderArray
	})

	console.log()

	saveTagList(collector, {
		folders: folderArray
	})

}


// save full movie data
async function saveMovieData(data, meta = {}) {
	console.log("saving movie data...")
	movieData = data.map(x => {
		x = x
		x.tags = cleanTags(x.tag)
		delete x.tag
		return x
	})
	let metadata = {
		date: new Date(Date.now()),
		numMovies: data.length,
		folders: meta.folders
	}
	let output = {
		meta: metadata,
		movies: movieData
	}
	let json = JSON.stringify(output, null, 2)
	fs.writeFileSync("./output/full-data.json", json)
	console.log("movie data saved 💾")
}

// save list of tags
async function saveTagList(data, meta = {}) {
	console.log("saving tag list...")
	let tagSet = new Set()

	for (let movie of data) {

		if (!movie.tags) continue
		let tags = cleanTags(movie.tags)
		if (!tags) continue
		tags.forEach(tag => {
			tagSet.add(tag)
		})
	}

	let metadata = {
		date: new Date(Date.now()),
		numMovies: data.length,
		numTags: tagSet.size,
		folders: meta.folders
	}

	let output = {
		meta: metadata,
		tags: Array.from(tagSet).sort()
	}

	let json = JSON.stringify(output, null, 2)
	fs.writeFileSync("./output/tag-list.json", json)
	console.log(`tag list saved 💾`)
}


async function scrapeFolder(folder) {
	let items = await fsp.readdir(folder)

	// filter for only movie folders
	let movieFolders = items.filter(x => {
		let ignore = [".deletedByTMM", "Plex Versions"]
		let p = path.join(folder, x)
		let stats = fs.statSync(p)
		let isFolder = stats.isDirectory()
		if (isFolder && !ignore.includes(x)) return true
	})

	let nfoArray = []

	for (let movieFolder of movieFolders) {
		let movieFolderPath = path.join(folder, movieFolder)
		let files = await fsp.readdir(movieFolderPath)
		let nfoFile = files.find(x => path.parse(x).ext == ".nfo")
		if (!nfoFile) {
			console.log(`[no NFO found!] ${path.basename(movieFolderPath)}`)
			continue
		} else {
			let nfoPath = path.join(movieFolderPath, nfoFile)
			let nfoData = await parseNFO(nfoPath)
			nfoArray.push(nfoData)
		}
		
		// movies.push(nfoData)
	}
	// console.log(nfoArray)
	nfoArray = nfoArray.filter(x => x)
	return  nfoArray
}

async function analyzeFolder(folder) {
	console.log(`analyzing "${folder}"...`)
	let items = await fsp.readdir(folder)

	let tagSet = new Set()
	let result = {
		noNFO: [],
		missingTags: [],
		tooFewTags: [],
		tags: []
	}
	
	// filter for only movie folders
	let movieFolders = items.filter(x => {
		let ignore = [".deletedByTMM", "Plex Versions"]
		let p = path.join(folder, x)
		let stats = fs.statSync(p)
		let isFolder = stats.isDirectory()
		if (isFolder && !ignore.includes(x)) return true
	})

	for (let movieFolder of movieFolders) {
		let movieFolderPath = path.join(folder, movieFolder)
		let files = await fsp.readdir(movieFolderPath)
		// let nfoFile = files.find(x => path.parse(x).ext == ".nfo" && !x.startsWith("."))
		let nfoFile = files.find(x => x == "movie.nfo")
		if (!nfoFile) {
			result.noNFO.push(movieFolder)
			continue
		} else {
			// console.log(`${movieFolder} - ${nfoFile}`)

			let nfoPath = path.join(movieFolderPath, nfoFile)
			let movie = await parseNFO(nfoPath)

			if (movie.hasOwnProperty("tag")) {
				if (movie.tag.length <= 2) result.tooFewTags.push(movieFolder)
				let tags = cleanTags(movie.tag)

				tags.forEach(tag => tagSet.add(tag))
			} else result.missingTags.push(movieFolder)
		}
	}
	result.tags = Array.from(tagSet).sort()
	console.log("done.")
	console.log()

	let list = `NO NFO (${result.noNFO.length} movies)\n\t${result.noNFO.join("\n\t")}\n\nMISSING TAGS (${result.missingTags.length} movies)\n\t${result.missingTags.join("\n\t")}\n\nTOO FEW TAGS (${result.tooFewTags.length} movies)\n\t${result.tooFewTags.join("\n\t")}\n\nTAGS\n\t${result.tags.join("\n\t")}`
	console.log(list)
}



function cleanTags(tags) {
	if (!tags) return []
	let array = []
	if (!Array.isArray(tags)) array.push(tags)
	else array = tags
	array = array.map(x => {
		return x.replace(/-/g, " ")
	})
	return array
}


async function parseNFO(nfoPath, movieName) {
	
	let nfo = await fsp.readFile(nfoPath, "utf8")
	let nfoName = path.parse(nfoPath).name

	// match xml only
	let match = nfo.match(/<\?xml.([\s\S]*?)+/gi)
	if (!match) return
	let raw = match[0]
	
	// convert xml

	const parser = new XMLParser()
	let data = parser.parse(raw)
	let movie = data.movie

	return movie
}


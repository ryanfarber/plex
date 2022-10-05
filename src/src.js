
require("dotenv").config()
const Logger = require("@ryanforever/logger").v2
const logger = new Logger("plex", {debug: true})
const axios = require("axios")
const fetch = require("node-fetch")
const convertXML = require('xml-js')
const MiniSearch = require('minisearch')
const fs = require("fs")
const fsp = require("fs").promises

const {humanizeTime} = require("./helpers.js")
let _ = require("underscore")
const getDecade = require('get-decade')

/**
 * Plex
 * @constructor
 * @arg {object} config - plex config
 * @arg {string} config.host - ip address of computer running plex server
 * @arg {string} config.token - plex token
 * @arg {boolean} [config.useCachedLibrary=true] - set to false to always get library from server
 * @example
 * const Plex = require("@ryanforever/plex")
 * const plex = new Plex({
 * 	token: process.env.PLEX_TOKEN,
 * 	host: "192.168.1.128"
 * })
 */
function Plex(config = {}) {

	let token = config.token
	let host = config.host
	let useCachedLibrary = config.useCachedLibrary || false
	let libraryCacheRefreshThreshold = 10 * 60 * 1000
	let stopWords = new Set(["and", "it", "the", "a", "to", "in", "or"])

	if (!token) throw new Error("please input your plex token")
	let plexUrl = `http://${host}:32400/library/all?X-Plex-Token=${token}`
	
	
	/** search all movies
	 * @arg {string} query - your search query
	 * @returns {array} array of movies
	 * @example
	 * plex.searchMovies("adaptation").then(console.log)
	 */
	this.searchMovies = async function(query) {
		let movies = await this.getMovies()
		let minisearch = new MiniSearch({
			fields: ["title"],
			// processTerm: (term, _fieldName) => stopWords.has(term) ? null : term.toLowerCase(),
			searchOptions: {
				// boost: { title: 10 },
				fuzzy: .01
			}
		})
		minisearch.addAll(movies)
		let res = minisearch.search(query)
		// res = res.filter(item => item.score > 5)
		let matches = []
		res.forEach(item => {
			let match = movies.find(x => x.id == item.id)
			match.searchMeta = item
			if (match) matches.push(match)
		})
		return matches
	}

	/** search directors of movies
	 * @arg {string} query - your search query
	 * @returns {array} movies with queried director
	 * @example
	 * plex.searchDirectors("stanley kubrick").then(console.log)
	 */
	this.searchDirectors = async function(query) {
		let movies = await this.getMovies()
		let minisearch = new MiniSearch({
			fields: ["director"],
			processTerm: (term, _fieldName) => stopWords.has(term) ? null : term.toLowerCase(),
			searchOptions: {
				// boost: { title: 10 },
				fuzzy: .01
			}
		})
		minisearch.addAll(movies)
		let res = minisearch.search(query)
		res = res.filter(item => item.score > 5)
		let matches = []
		res.forEach(item => {
			let match = movies.find(x => x.id == item.id)
			match.searchMeta = item
			if (match) matches.push(match)
		})
		return matches
	}


	/** search writers of movies
	 * @arg {string} query - your search query
	 * @returns {array} movies with queried writer
	 * @example
	 * plex.searchWriters("charlie kauffman").then(console.log)
	 */
	this.searchWriters = async function(query, simple) {
		let movies = await this.getMovies()
		let matches = movies.filter(x => {
			if (x.hasOwnProperty("writer") && x.writer.length) {
				let writers = x.writer.map(x => x.toLowerCase())
				return writers.includes(query)
			}
		})

		if (simple) {
			matches = matches.map(x => {
				return {
					title: x.title,
					year: x.year
				}
			})
			matches = _.sortBy(matches, "year")
		}

		let output = {
			writer: query,
			matches
		}
		return output
	}

	/** search arctors in movies
	 * @arg {string} query - your search query
	 * @returns {array} movies with queried actor
	 * @example
	 * plex.searchActors("denzel washington").then(console.log)
	 */
	this.searchActors = async function(query) {
		let movies = await this.getMovies()
		let minisearch = new MiniSearch({
			fields: ["role"],
			processTerm: (term, _fieldName) => stopWords.has(term) ? null : term.toLowerCase(),
			searchOptions: {
				// boost: { title: 10 },
				fuzzy: .01
			}
		})
		minisearch.addAll(movies)
		let res = minisearch.search(query)
		res = res.filter(item => item.score > 5)
		let matches = []
		res.forEach(item => {
			let match = movies.find(x => x.id == item.id)
			match.searchMeta = item
			if (match) matches.push(match)
		})
		return matches
	}

	// SEARCH ERAS //
	// this.searchEras = async function(query) {

	// }

	/** list all directors
	 * @returns {array} directors
	 */
	this.listDirectors = async function() {
		return await this.list("director")
	}

	/** list all writers
	 * @returns {array} writers
	 */
	this.listWriters = async function() {
		return await this.list("writer")
	}

	/** list all actors
	 * @returns {array} actors
	 */
	this.listActors = async function() {
		return await this.list("role")
	}

	/** list all countries
	 * @returns {array} countries
	 */
	this.listCountries = async function() {
		return await this.list("country")
	}

	/** list all genres
	 * @returns {array} genres
	 */
	this.listGenres = async function() {
		return await this.list("genre")
	}


	/** list movies with a given property
	 * @arg {string} prop - property i.e. "director" "writer" "genre" etc
	 * @returns {array} writers
	 */
	this.list = async function(prop) {
		let movies = await this.getMovies()
		let items = []
		movies.forEach(movie => {
			if (movie.hasOwnProperty(prop)) {
				movie[prop].forEach(item => items.push(item))
			}
		})
		items.sort()
		items = new Set(items)
		items = Array.from(items)
		return items
	}
	
	/** get the full plex library
	 * @returns {array} plex items
	 */
	this.getLibrary = async function() {
		logger.debug("getting library...")
		let data
		let cachedLibrary = {}
		if (fs.existsSync("./cache/library.json")) cachedLibrary = require("../cache/library.json")
		else await this.cacheLibrary()
		if (useCachedLibrary) {
			if (!cachedLibrary) await this.cacheLibrary()
			else if (this.shouldRefreshCache()) await this.cacheLibrary()
			return cachedLibrary.data
		} else {
			let res = await axios.get(plexUrl).catch(console.error)
			let data = res?.data?.MediaContainer?.Metadata
			return data
		}
	}

	/** get only movies
	 * @returns {array} movies
	 */
	this.getMovies = async function(simple) {
		let library = await this.getLibrary()
		library = library.filter(item => {
			let section = item.librarySectionTitle.toLowerCase()
			let type = item.type
			if (section == "all" && type == "movie" ) return true
		})

		if (simple) library = library.map(x => {
			let keys = ["title", "year", "studio", "summary", "rating", "duration", "director", "writer", "role", "genre", "country", "contentRating" ]

			let obj = {}
			keys.forEach(key => {
				obj[key] = x[key]
			})
			return obj
		})
		return library
	}


	/** get library from server and save locally
	 */
	this.cacheLibrary = async function() {
		logger.debug("caching library...")
		let res = await axios.get(plexUrl).catch(console.error)
		let data = res?.data?.MediaContainer?.Metadata
		let obj = {
			cacheDate: new Date(Date.now()),
			numItems: data.length,
			data: data
		}
		obj = convertLibrary(obj)
		let json = JSON.stringify(obj, null, 2)

		logger.debug("saving...")
		if (!fs.existsSync("./cache")) fs.mkdirSync("./cache")
		await fsp.writeFile("./cache/library.json", json).catch(console.error)
		logger.debug("done!")
		return
	}

	this.convertLibrary = convertLibrary

	// SHOULD REFRESH CACHE // returns true if last cached date is longer than threshold 
	this.shouldRefreshCache = function() {
		logger.debug("checking cache...")
		// const cachedLibrary = require("../cache/library.json")
		let cachedLibrary = {}
		if (fs.existsSync("./cache/library.json")) {
			cachedLibrary = require("../cache/library.json")
		}
		let now = new Date(Date.now())
		let diff = now - new Date(cachedLibrary.cacheDate)
		let secsSinceLastCache = humanizeTime(diff)
		console.log(`${secsSinceLastCache} since last cache`)
		if (diff > libraryCacheRefreshThreshold) return true
		else if(!diff) return true
		else return false
	}
	
	/** analyze your plex library
	 * @param {object} config
	 * @param {object} config.max=25 - max amount of items to list
	 * @returns {object} an analysis of your plex library
	 */
	this.analyzeMovies = async function(config = {}) {

			let max = config.max || 25
			let movies = await this.getMovies()
			let props = ["director", "role", "genre", "writer", "country"]
		
			let schema = {
				numMovies: movies.length,
				director: [],
				writer: [],
				role: [],
				genre: [],
				studios: [],
				country: [],
				genders: [],
				races: [],
				years: [],
				eras: [],
				ratings: [],
				reviews: [],
				insights: []
			}

			// calculate num movies and percentages for each prop
			props.forEach(prop => {
				let list = _.chain(movies).pluck(prop).flatten().uniq().sort().value()
				list.forEach(item => {
					let matches = movies.filter(movie => {
						if (movie.hasOwnProperty(prop)) {
							if (movie[prop].includes(item)) return true
						}
					})
					let numMovies = _.size(matches)
					schema[prop].push({
						name: item,
						numMovies,
						percent: ((numMovies / schema.numMovies) * 100).toFixed(2)
					})
				})
				schema[prop] = _.chain(schema[prop]).sortBy("numMovies").reverse().value()
			})

			let years = _.chain(movies).pluck("year").flatten().uniq().compact().sort().value()

			years.forEach(year => {
				let matches = movies.filter(movie => movie.year == year)
				let numMovies = _.size(matches)
				schema.years.push({
					year,
					numMovies
				})
			})

			schema.years = _.chain(schema.years).sortBy("numMovies").reverse().value()

			// schema.eras.push(generateEras())
			schema.years.forEach(item => {
				 let year = item.year
			})

			// GET STUDIOS
			schema.studios = getStudios()
			// GET RATINGS
			schema.ratings = getRatings()

			// get eras
			schema.eras = parseEras()
			// get insightes

			// trim to max
			for (let [key, val] of Object.entries(schema)) {
				if (Array.isArray(val)) schema[key] = val.slice(0, max)
			}
			getReviews()
			generateInsights()
			// console.log(schema)


			function generateEras() {
				let eras = []
				let minYear = 1900
				let maxYear = new Date(Date.now()).getFullYear()
				for (let i = minYear; i <= maxYear; i += 10) {
					let century
					let string
					if (i >= 1900 && i <= 1999) century = "20th"
					else century = "21st"

					if (century == "20th") string = (i - 1900).toString() + "s"
					else string = (i - 2000).toString() + "s"
					schema.eras.push({
						century,
						era: i,
						string,
						numMovies: 0
					})
				}
				return eras
			}

			// GET STUDIOS // 
			function getStudios() {
				let studiosMap = new Set(movies.map(x => x.studio))
				let studios = Array.from(studiosMap)
				let studiosFinal = []
				studios.forEach(studio => {
					let numMovies = movies.filter(x => x.hasOwnProperty("studio") && x.studio.includes(studio)).length
					studiosFinal.push({
						name: studio,
						numMovies,
						percent: ((numMovies / schema.numMovies) * 100).toFixed(2)
					})
				})
				studiosFinal = _.sortBy(studiosFinal, "numMovies").reverse()
				return studiosFinal
			}

			// GET RATINGS // 
			function getRatings() {
				let ratingsSet = new Set(movies.map(x => x.contentRating))
				let ratings = Array.from(ratingsSet)
				let ratingsFinal = []
				ratings.forEach(rating => {
					let numMovies = movies.filter(x => x.hasOwnProperty("contentRating") && x.contentRating.includes(rating)).length
					ratingsFinal.push({
						rating: rating,
						numMovies,
						percent: ((numMovies / schema.numMovies) * 100).toFixed(2)
					})
				})
				ratingsFinal = _.sortBy(ratingsFinal, "numMovies").reverse()
				return ratingsFinal
			}

			function getReviews() {
				let ratingType = "rating"
				let reviewSet = new Set(movies.map(x => x[ratingType]))
				reviews = Array.from(reviewSet).map(num => {
					if (typeof num == "number") percent = num * 10
					else percent = "None"
					return {
						rating: percent,
						numMovies: movies.filter(x => x[ratingType] == num).length
					}
				})
				reviews = _.sortBy(reviews, "numMovies").reverse()
				schema.reviews = reviews
			}
			

			function parseEras() {
				let eras = {}
				let output = []
				movies.forEach(m => {
					let y = m.year
					let inc
					let era
					// 1900s
					if (y >= 1900 && y <= 1909) era = "1900"
					else if (y >= 1910 && y <= 1919) era = "1910"
					else if (y >= 1920 && y <= 1929) era = "1920"
					else if (y >= 1930 && y <= 1939) era = "1930"
					else if (y >= 1940 && y <= 1949) era = "1940"
					else if (y >= 1950 && y <= 1959) era = "1950"
					else if (y >= 1960 && y <= 1969) era = "1960"
					else if (y >= 1970 && y <= 1979) era = "1970"
					else if (y >= 1980 && y <= 1989) era = "1980"
					else if (y >= 1990 && y <= 1999) era = "1990"
					// 2000s
					else if (y >= 2000 && y <= 2009) era = "2000"
					else if (y >= 2010 && y <= 2019) era = "2010"
					else if (y >= 2020 && y <= 2029) era = "2020"
					else if (y >= 2030 && y <= 2039) era = "2030"
					else if (y >= 2040 && y <= 2049) era = "2040"
					else if (y >= 2050 && y <= 2059) era = "2050"
					else if (y >= 2060 && y <= 2069) era = "2060"


					if (era) {
						if (!eras[era]) eras[era] = 0
						eras[era] ++
					} 
				})

				for (let [key, val] of Object.entries(eras)) {
						output.push({decade: `${key}s`, numMovies: val})
					}
				return output
			}


			function generateInsights() {
				// get countries
				let countries = schema.country
				let countryString = `${parseInt(countries[0].percent)}% of your movies are from ${countries[0].name}. You seem to also like movies from ${countries[1].name}, ${countries[2].name}, ${countries[3].name}, ${countries[4].name}, and ${countries[5].name}.`
				schema.insights.push({type: "country", summary: countryString})
				// get directors
				let directors = schema.director
				let directorString = `The top director in your library is ${directors[0].name}. You have ${directors[0].numMovies} movies by them.\nYou also seem to like ${directors[1].name}, ${directors[2].name}, ${directors[3].name}, ${directors[4].name}, and ${directors[5].name}.`
				schema.insights.push({type: "director", summary: directorString})
				// get actors
				let actors = schema.role
				let actorString = `Out of all your movies, ${actors[0].name} has starred in ${actors[0].numMovies} of them. The other top actors in your library are ${actors[1].name}, ${actors[2].name}, ${actors[3].name}, ${actors[4].name}, and ${actors[5].name}.`
				schema.insights.push({type: "actor", summary: actorString})
				// get writers
				let writers = schema.writer
				let writerString = `${writers[0].name} has written the most (${writers[0].numMovies} movies) out of all everyone in your library, followed by ${writers[1].name}, ${writers[2].name}, ${writers[3].name}, ${writers[4].name}, and ${writers[5].name}.`
				schema.insights.push({type: "writer", summary: writerString})

				// get eras
				let eras = schema.eras
				eras = _.sortBy(eras, "numMovies").reverse()
				let years = schema.years
				let eraString = `Most of your movies are from the ${eras[0].decade}, followed by the ${eras[1].decade}, the ${eras[2].decade}, and then the ${eras[3].decade}. ${years[0].year} has the most movies of any given year in your library.`
				schema.insights.push({type: "era", summary: eraString})

				// get genres
				let genres = schema.genre
				let genreString = `Your favorite genre seems to be ${genres[0].name}, which makes up about ${parseInt(genres[0].percent)}% of your library. You also like ${genres[1].name}, ${genres[2].name}, ${genres[3].name}, ${genres[4].name}, and ${genres[5].name}s.`
				schema.insights.push({type: "genre", summary: genreString})

				// get studios
				let studios = schema.studios
				let studioString = `Most of your movies come from ${studios[0].name} studios.  They produced ${studios[0].numMovies} movies in your library.  They are followed by ${studios[1].name}, ${studios[2].name}, ${studios[3].name}, ${studios[4].name}, and ${studios[5].name}.`
				schema.insights.push({type: "studio", summary: studioString})
				// get ratings
				let ratings = schema.ratings
				let g = ratings.find(x => x.rating == "G")
				let nc17 = ratings.find(x => x.rating == "NC-17")
				let ratingString = `${parseInt(ratings[0].percent)}% of your movies are rated ${ratings[0].rating}. You have ${g.numMovies} movies rated G, and ${nc17.numMovies} movies rated NC-17. Naughty!`
				schema.insights.push({type: "rating", summary: ratingString})

				// get reviews
				let reviews = schema.reviews
				// console.log(reviews)
				let eighty = reviews.filter(x => x.rating >= 80).map(x => x.numMovies).reduce((a, b) => a + b, 0)
				// console.log(eighty)

				// schema.insights = schema.insights.map(x => `${x.type.toUpperCase()}\n${x.summary}`).join("\n\n")
			}
			return schema
		}

	function convertLibrary(library) {
		libraryData = library.data
		let newLibrary = []
		let selectedKeys = ["Genre", "Director", "Country", "Role", "Writer"]
		libraryData.forEach((item, i) => {
			let newItem = {}
			for (let [key, val] of Object.entries(item)) {
				if (selectedKeys.includes(key)) {
					let tags = []
					val.forEach(x => tags.push(x.tag))
					newItem[key.toLowerCase()] = tags
				} else newItem[key] = val
			}
			newItem.id = i
			// selectedKeys.forEach(x => {
			// 	if (!newItem.hasOwnProperty(x.toLowerCase()) && newItem.type == "movie") newItem[x.toLowerCase()] = []
			// })
			newLibrary.push(newItem)
		})
		library.data = newLibrary
		return library
	}

}

module.exports = Plex



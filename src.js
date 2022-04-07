// src.js

require("dotenv").config()
const Logger = require("@ryanforever/logger")
const logger = new Logger(__filename, {debug: true})
const axios = require("axios")
const fetch = require("node-fetch")
const convertXML = require('xml-js')
const MiniSearch = require('minisearch')
const fs = require("fs")
const fsp = require("fs").promises
const cachedLibrary = require("./data/library.json")
const {humanizeTime} = require("./data/helpers.js")
let _ = require("underscore")
const getDecade = require('get-decade')


function Plex(config = {}) {

	let token = config.token
	let host = config.host
	let useCachedLibrary = config.useCachedLibrary || false
	let libraryCacheRefreshThreshold = 5 * 60 * 1000
	let stopWords = new Set(["and", "it", "the", "a", "to", "in", "or"])

	if (!token) throw new Error("please input your plex token")
	let plexUrl = `http://${host}:32400/library/all?X-Plex-Token=${token}`
	
	
	// SEARCH //
	this.searchMovies = async function(query) {
		let movies = await this.getMovies()
		let minisearch = new MiniSearch({
			fields: ["title"],
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

	// SEARCH DIRECTORS // returns movies with directors by query
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

	// SEARCH ACTORS // returns movies with directors by query
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

	// LIST DIRECTORS //
	this.listDirectors = async function() {
		return await this.list("director")
	}

	// LIST WRITERS //
	this.listWriters = async function() {
		return await this.list("writer")
	}

	// LIST ACTORS //
	this.listActors = async function() {
		return await this.list("role")
	}

	// LIST COUNTRIES //
	this.listCountries = async function() {
		return await this.list("country")
	}

	// LIST GENRES //
	this.listGenres = async function() {
		return await this.list("genre")
	}

	this.analyzeMovies = async function() {
		let movies = await this.getMovies()
		let props = ["director", "role", "genre", "writer", "country"]
	
		let schema = {
			numMovies: movies.length,
			director: [],
			writer: [],
			role: [],
			genre: [],
			country: [],
			genders: [],
			races: [],
			years: [],
			eras: [],
			insights: {
				top: []
			}
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
					percent: ((numMovies / schema.numMovies) * 100).toFixed(3)
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

		schema.years = _.chain(schema.years).sortBy("year").reverse().value()

		// schema.eras.push(generateEras())
		schema.years.forEach(item => {
			 let year = item.year

		})


		console.log(schema)


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
		// let tempEras = []
		// schema.years.forEach(item => {
		// 	let year = item.year
		// 	let century
		// 	let decade

		// 	if (year >= 1900 && year <= 1999) {
		// 		let trim = year - 1900
		// 		century = 20
		// 		// console.log(trim)
		// 		if (trim >= 0 && trim <= 9) decade = 0
		// 		else if (trim >= 10 && trim <= 19) decade = 10
		// 		else if (trim >= 20 && trim <= 29) decade = 20
		// 		else if (trim >= 30 && trim <= 39) decade = 30
		// 		else if (trim >= 40 && trim <= 49) decade = 40
		// 		else if (trim >= 50 && trim <= 59) decade = 50
		// 		else if (trim >= 60 && trim <= 69) decade = 60
		// 		else if (trim >= 70 && trim <= 79) decade = 70
		// 		else if (trim >= 80 && trim <= 89) decade = 80
		// 		else if (trim >= 90 && trim <= 99) decade = 90
		// 	} else {
		// 		let trim = year - 2000
		// 		century = 21
		// 		// console.log(trim)
		// 		if (trim >= 0 && trim <= 9) decade = 0
		// 		else if (trim >= 10 && trim <= 19) decade = 10
		// 		else if (trim >= 20 && trim <= 29) decade = 20
		// 		else if (trim >= 30 && trim <= 39) decade = 30
		// 		else if (trim >= 40 && trim <= 49) decade = 40
		// 		else if (trim >= 50 && trim <= 59) decade = 50
		// 		else if (trim >= 60 && trim <= 69) decade = 60
		// 		else if (trim >= 70 && trim <= 79) decade = 70
		// 		else if (trim >= 80 && trim <= 89) decade = 80
		// 		else if (trim >= 90 && trim <= 99) decade = 90
		// 	}

			
		// 	// item.century = century
		// 	// item.decade = decade
		// 	tempEras.push({century, decade})

		// // console.log(century, decade)
		// 	// let decade = new Date(year.year).getYear()
		// 	// console.log(decade)
		// })

		// // console.log(years)
		// console.log(tempEras)

		// function mergeDecades(tempEras) {
		// 	let newEras = []

		// 	newEras.push
		// 	tempEras.forEach(item => {
		// 		let obj = {
		// 			century: item.century
		// 			decade: undefined
		// 		}
		// 		if (century == 20) {
		// 			let decade = item.decade - 10
		// 			if (decade == 0) obj.century

		// 		}
		// 	})
		// }

	}

	// LIST // returns a list of a given property
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
	
	// GET LIBRARY // get library
	this.getLibrary = async function() {
		logger.debug("getting library...")
		let data

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

	// GET MOVIES // returns only movies
	this.getMovies = async function() {
		let library = await this.getLibrary()
		library = library.filter(item => {
			let section = item.librarySectionTitle.toLowerCase()
			let type = item.type
			if (section == "all" && type == "movie" ) return true
		})
		return library
	}

	// CACHE LIBRARY // get library from server and save locally
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
		await fsp.writeFile("./data/library.json", json).catch(console.error)
		logger.debug("done!")
		return
	}

	this.convertLibrary = convertLibrary

	// SHOULD REFRESH CACHE // returns true if last cached date is longer than threshold 
	this.shouldRefreshCache = function() {
		logger.debug("checking cache...")
		let now = new Date(Date.now())
		let diff = now - new Date(cachedLibrary.cacheDate)
		let secsSinceLastCache = humanizeTime(diff)
		console.log(`${secsSinceLastCache} since last cache`)
		if (diff > libraryCacheRefreshThreshold) return true
		else if(!diff) return true
		else return false
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



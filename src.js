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

	this.searchEras = async function(query) {
		
	}

	// LIST DIRECTORS //
	this.listDirectors = async function() {
		let movies = await this.getMovies()
		let directors = []
		movies.forEach(movie => {
			if (movie.hasOwnProperty("director")) {
				movie.director.forEach(director => directors.push(director))
			}
		})
		directors.sort()
		directors = new Set(directors)
		directors = Array.from(directors)
		return directors
	}

	// LIST ACTORS //
	this.listActors = async function() {
		let movies = await this.getMovies()
		let actors = []
		movies.forEach(movie => {
			if (movie.hasOwnProperty("role")) {
				movie.role.forEach(actor => actors.push(actor))
			}
		})
		actors.sort()
		actors = new Set(actors)
		actors = Array.from(actors)
		return actors
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



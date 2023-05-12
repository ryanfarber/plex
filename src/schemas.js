// schemas.js


const {humanizeTime} = require("./helpers.js")
const path = require("path")


function Item(d = {}, plexHost, token) {
	this.title = d.title
	this.originalTitle = d.originalTitle
	this.year = d.year
	this.id = path.parse(d.guid).name
	this.library = d.librarySectionTitle
	this.summary = d.summary || undefined 
	this.tagline = d.tagline
	this.art = (d.thumb) ? path.join(plexHost, d.thumb, `?X-Plex-Token=${token}`) : undefined
	this.type = d.type
	this.rating = d.contentRating
	this.duration = d.duration
	this.durationString = (d.duration) ? humanizeTime(d.duration) : undefined
	this.studio = d.studio || []
	this.director = d.director || []
	this.writer = d.writer || []
	this.genre = d.genre || []
	this.country = d.country || []
	this.role = d.role || []
	this.raw = undefined
	this.audienceRating = d.audienceRating || undefined
	Object.defineProperty(this, "raw", {
		get() {return d}
	})
}


class Library {
	constructor(d = {}) {
		this.name = d.title
		this.id = d.key
		this.type = d.type
		this.uuid = d.uuid
		this.createdAt = d.createdAt
		this.updatedAt = d.updatedAt
		Library.prototype.raw = d
	}
}






module.exports = {Item, Library}
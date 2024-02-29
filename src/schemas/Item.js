// Item.js

const path = require("path")
const {humanizeTime} = require("../helpers.js")


class Item {
	static plexHost = ""
	static token = ""

	constructor(d = {}) {
		this.name = d.title
		this.originalTitle = d.originalTitle
		this.year = d.year
		this.id = d.ratingKey
		this.guid = (d.guid) ? path.parse(d.guid).name : undefined
		this.libraryName = d.librarySectionTitle
		this.libraryId = d.librarySectionID
		this.summary = d.summary || undefined 
		this.tagline = d.tagline
		this.art = (d.thumb) ? path.join(Item.plexHost, d.thumb, `?X-Plex-Token=${Item.token}`) : undefined
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
			get() {return d},
			enumerable: true
		})
	}
}

module.exports = Item

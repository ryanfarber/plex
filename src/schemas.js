// schemas.js


const {humanizeTime} = require("./helpers.js")


function Item(d = {}) {
	this.title = d.title
	this.originalTitle = d.originalTitle
	this.year = d.year
	this.summary = d.summary
	this.type = d.type
	this.rating = d.contentRating
	this.duration = d.duration
	this.durationString = humanizeTime(d.duration)
	this.studio = d.studio
	this.director = d.director
	this.writer = d.writer
	this.genre = d.genre
	this.country = d.country
	this.role = d.role
	this.id = d.id
	this.raw = undefined
	Object.defineProperty(this, "raw", {
		get() {return d}
	})
}






module.exports = {
	Item
}
// Collection.js

const path = require("path")

class Collection {
	constructor(raw = {}, library = {}) {
		this.name = raw.title || raw.name
		this.sortName = raw.titleSort || raw.sortName
		this.id = raw.ratingKey || raw.id
		this.libraryName = library.name || raw.libraryName || raw.librarySectionTitle
		this.libraryId = library.id || raw.libraryId || raw.librarySectionID
		this.type = raw.type
		this.subtype = raw.subtype
		this.summary = raw.summary
		this.numItems = raw.childCount
		this.smart = (raw.smart == 1) ? true : false
		this.guid = path.parse(raw.guid).base
		this.score = raw.score
		this.createdAt = raw.addedAt
		this.updatedAt = raw.updatedAt
		this.labels = []

		if (raw.Label) this.labels = raw.Label.map(x => x.tag)

		Object.defineProperty(this, "raw", {
			get() {return raw || raw.raw},
			enumerable: true
		})
	}
}




module.exports = Collection
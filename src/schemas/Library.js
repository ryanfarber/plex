// Library.js

class Library {
	constructor(d = {}) {
		this.name = d.title
		this.id = d.key
		this.type = d.type
		this.uuid = d.uuid
		this.agent = d.agent
		this.scanner = d.scanner
		this.createdAt = d.createdAt
		this.updatedAt = d.updatedAt
		this.scannedAt = d.scannedAt

		Object.defineProperty(this, "raw", {
			get() {return d},
			enumerable: true
		})
	}
}


module.exports = Library
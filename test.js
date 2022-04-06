
require("dotenv").config();
const Plex = require("./src.js")
let plex = new Plex({
	host: "192.168.1.128",
	token: process.env.PLEX_TOKEN,
	useCachedLibrary: true
})

plex.getMovies().then(res => {
	console.log(res)
})

// plex.getLibrary()

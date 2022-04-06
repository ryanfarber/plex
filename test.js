// test.js

require("dotenv").config()
const Plex = require("./src.js")


let plex = new Plex({
	host: "192.168.1.128",
	token: process.env.PLEX_TOKEN,
	useCachedLibrary: true
})







// plex.getMovies().then(res => {
// 	console.log(res)
// })

// plex.getLibrary().then(lib => {
// 	console.log(lib)
// })

// plex.cacheLibrary()

// plex.searchMovies("adaptation").then(console.log)

// plex.searchDirectors("coen brothers").then(console.log)
// plex.searchActors("al pacino").then(console.log)
plex.searchEras("90")


// plex.listDirectors().then(console.log)
// plex.listActors().then(console.log)


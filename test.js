// test.js

require("dotenv").config()
const fs = require("fs")
const path = require("path")
const Plex = require("./src.js")


let plex = new Plex({
	host: "192.168.1.128",
	token: process.env.PLEX_TOKEN,
	useCachedLibrary: true
})







// plex.getMovies(false).then(res => {
// 	console.log(res)
// })

// plex.getLibrary().then(lib => {
// 	console.log(lib)
// })

// plex.cacheLibrary()

// plex.searchMovies("adaptation").then(console.log)

// plex.searchDirectors("coen brothers").then(console.log)
// plex.searchActors("al pacino").then(console.log)
// plex.searchEras("90")
// plex.searchWriters("wes anderson", true).then(console.log)



// plex.listDirectors().then(res => {
// 	console.log(res)
// 	res = res.map(x => {
// 		return {
// 			name: x,
// 			gender: "",
// 			country: ""
// 		}
// 	})
// 	write(res, "directors")
// })
// plex.listActors().then(console.log)
// plex.listWriters().then(console.log)
// plex.listCountries().then(console.log)
// plex.listGenres().then(console.log)

plex.analyzeMovies({
	max: 25
	// sortBy: "numMovies"
})



// function write(data, filename) {
// 	if (!fs.existsSync("./output")) fs.mkdirSync("./output")
// 	let json = JSON.stringify(data, null, 2)
// 	let filepath = path.join("./output", filename + ".json")
// 	fs.writeFile(filepath, json, error => {
// 		if (error) console.error("error")
// 		console.log("file saved!")
// 	})
// }


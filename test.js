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

let analysis = plex.analyzeMovies({
	max: 25,
	sortBy: "numMovies"
}).then(res => {
	console.log(res)
	let now = new Date(Date.now()).toLocaleString()
	let insights = res.insights
	let header = `# Plex Analysis\n\ndate: ${now}`
	let body = insights.map(x => `## ${x.type}\n${x.summary}`).join("\n\n")
	let topList = []

	for (let [key, val] of Object.entries(res)) {
		let include = ["director", "writer", "role", "genre", "studios", "country"]
	}
	let directors = res.director.map((x, i) => `${i+1}) **${x.name}** - ${x.numMovies} movies (${x.percent}%)`)
	topList.push({name: "Directors", list: directors})
	let directors = res.director.map((x, i) => `${i+1}) **${x.name}** - ${x.numMovies} movies (${x.percent}%)`)
	topList.push({name: "Directors", list: directors})

	topList = topList.map(x => `## Top ${x.list.length} ${x.name}\n\n${x.list.join("\n")}`)
	let data = header + "\n" + body + "\n\n" +topList
	console.log("\n")
	console.log(data)
	console.log("\n")
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


# plex
A work in progress javascript API for your [Plex](https://www.plex.tv) library 🎬 🎥 🎞

Please read the [documentation](https://ryanfarber.github.io/plex)!

```javascript
const Plex = require("@ryanforever/plex")
const plex = new Plex({
	host: "192.168.1.128",
	token: process.env.PLEX_TOKEN,
	debug: false
})

plex.getMovies().then(console.log)
```
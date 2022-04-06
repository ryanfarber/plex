// original.js

function Plex(config = {}) {
	let token = config.token
	if (!token) throw new Error("please input your plex token")
	let url = `http://192.168.1.36:32400/library/all?X-Plex-Token=${token}`


	// SEARCH MOVIES NLP 
	this.searchMoviesNLP = async function(string) {
		let regex = [
			/(?<=do i have ).+?(?=$)/gi,
			/(?<=the movie ).+?(?=$)/gi
		]
		let filteredName
		regex.forEach(r => {
			let match = string.match(r)
			if (match) filteredName = match[0]
		})
		// search movies by string
		if (!string) return undefined
		let movies = await this.getMovies()
		log("filtering movies by string");
		// log(wink.string.hammingNormalized("hey", "hi"))
		let miniSearch = new MiniSearch({
			fields: ["title"], // fields to index for full-text search
			storeFields: ["title"] // fields to return with search results
		})
		miniSearch.addAll(movies)
		let res = miniSearch.search(filteredName, {
			// filter: (result) => result.score >10
		})
		log(res[0])
		// return filter
	};

	// SEARCH MOVIES BY TITLE
	async function searchMovies(title) {
		// search movies by title
		if (!title) return undefined
		let movies = await this.getMovies()
		log("filtering movies by title...");
		let filter = movies.filter(movie => {
			return movie.title.toLowerCase().includes(title)
		})
		log(`found ${filter.length} result(s) matching "${title}"`)
		return filter
	};

	// SEARCH MOVIES BY DIRECTOR
	this.searchDirectors = async function(name) {
		// search movies by directors
		if (!name) return undefined
		let movies = await this.getMovies()
		log("filtering movies for directors...");
		let filter = movies.filter(movie => {
			let match = movie.directors.some(director => {
				return director.includes(name)
			})
			if (match) return true
			else return false
		})
		log(`found ${filter.length} result(s) matching "${name}"`)
		return filter
	};

	// GET MOVIES
	this.getMovies = async function(logMovies) {
		// let res = await fetch("http://192.168.1.36:32400/library/sections/1/all?X-Plex-Token=oBuaEpAozAhuGxgf9bRE");
		let res = await fetch(url);
		let xml = await res.text();

		let movies = [];

		let json = convertXML.xml2json(xml, {
			compact: true, 
			spaces: 2,
			ignoreAttributes: false,
			attributesKey: "attributes"
		});
		let data = JSON.parse(json);
		let rawMovieData = data.MediaContainer.Video;

		// log(json)
		rawMovieData.forEach(m => {
			let type = m.attributes.type

			m.attributes.id = m.attributes.ratingKey
			if ( type == "movie" || type == "show") movies.push(convert(m))
			// movies.push(convert(m))
		});
		if (logMovies) log(movies)
		return movies;
	};

	// fetch("http://192.168.1.36:32400/library/all?X-Plex-Token=oBuaEpAozAhuGxgf9bRE").then(res => res.text().then(console.log))



	function convert(obj = {}) {
		let info = obj.attributes;
		// let metadata = obj.Media.attributes
		let output = {};
		
		let tags = {
			genre: obj.Genre,
			director: obj.Director,
			writer: obj.Writer,
			country: obj.Country,
			role: obj.Role
		};

		let newTags = {
			genre: [],
			director: [],
			writer: [],
			country: [],
			role: []
		};

		// convert tags
		for (let [key, items] of Object.entries(tags)) {
			// if tag is an array
			if (!items) {}
			else if (Array.isArray(items)) items.forEach(x => newTags[key].push(x.attributes.tag.toLowerCase()));
			// if tag is an object
			else newTags[key].push(items.attributes.tag.toLowerCase());
		};
		
		// merge the object
		Object.assign(output, info);

		// rename tags
		output.genres = newTags.genre;
		output.directors = newTags.director;
		output.writers = newTags.writer;
		output.countries = newTags.country;
		output.actors = newTags.role;
		// output.id = parseInt(output.id)

		return output;

	};

}; // end Plex
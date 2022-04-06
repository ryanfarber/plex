// helpers.js


const humanizeDuration = require("humanize-duration")

function humanizeTime(ms, config = {}) {
	config = {
		round: config.round ?? true,
		conjunction: config.conjunction ?? " and ",
		serialComma: config.serialComma ?? false,
		decimial: config.decimal ?? ".",
		maxDecimalPoints: config.maxDecimalPoints ?? 2,
		spacer: config.spacer ?? " "
	}
	return humanizeDuration(ms, config)
}

module.exports = {
	humanizeTime
}
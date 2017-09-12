var mongoose = require('mongoose');

module.exports = mongoose.model('Log',{
	data: Date,
	log: [String],
	ganho: Number,
	gasto: Number
});
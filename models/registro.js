var mongoose = require('mongoose');

module.exports = mongoose.model('Registro',{
	data: Date,
	estado: [String],
	ocupante: [mongoose.Schema.Types.Mixed],
	ganho: Number,
	gasto: Number,
	log: [String]
});
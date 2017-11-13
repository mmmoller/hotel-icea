var mongoose = require('mongoose');

module.exports = mongoose.model('Log',{
	data: Date,
	log: [String],
	modulo: [String],
	query: [String],
	horario: [String],
	usuario: [String],
	cadastro: [String],
	cadastro_id: [String],
	leito:[String],
	ganho: Number,
	gasto: Number
});
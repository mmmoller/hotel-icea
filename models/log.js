var mongoose = require('mongoose');

module.exports = mongoose.model('Log',{
	data: Date,
	log: [String],
	modulo: [String],
	horario: [String],
	usuario: [String],
	cadastro: [String],
	cadastro_id: [String],
	ganho: Number,
	gasto: Number
});
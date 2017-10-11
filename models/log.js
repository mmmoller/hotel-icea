var mongoose = require('mongoose');

module.exports = mongoose.model('Log',{
	data: Date,
	log: [String],
	modulo: [String],
	acao: [String],
	usuario: [String],
	cadastro: [String],
	ganho: Number,
	gasto: Number
});
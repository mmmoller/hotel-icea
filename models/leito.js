var mongoose = require('mongoose');

module.exports = mongoose.model('Leito',{
	cod_leito: String,
	limpeza: String,
	ocupabilidade: String,
	manutencao: [String],
	ocupante: [mongoose.Schema.Types.Mixed]
});
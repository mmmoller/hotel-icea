var mongoose = require('mongoose');

module.exports = mongoose.model('Estado_leitos',{
	cod_leito: [String],
	limpeza: [String],
	ocupabilidade: [String],
	manutencao: [String],
	ocupante: [mongoose.Schema.Types.Mixed],
});
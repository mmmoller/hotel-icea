var mongoose = require('mongoose');

module.exports = mongoose.model('Leito',{
	cod_leito: String,
	limpeza: String,
	ocupabilidade: String,
	manutencao: [String],
	bloco: String,
	quarto: String,
	vaga: String,
});
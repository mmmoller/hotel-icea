
var mongoose = require('mongoose');

module.exports = mongoose.model('Folha',{
	n_entrega: [Number],
	n_coleta: [Number],
	data_coleta: String,
	data_entrega: String,
	nome_fiscal: String
});

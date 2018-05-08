
var mongoose = require('mongoose');

module.exports = mongoose.model('Financeiro',{
	dic_posto_valor: Object,
	num_registro: Number,
	blacklist: [String],
	pagamento: [String],
	ganho: Number,
	gasto: Number
});
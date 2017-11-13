
var mongoose = require('mongoose');

module.exports = mongoose.model('Financeiro',{
	dic_posto_valor: Object,
	ganho: Number,
	gasto: Number
});
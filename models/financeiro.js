
var mongoose = require('mongoose');

module.exports = mongoose.model('Financeiro',{
	dic_posto_valor: Object,
	num_registro: Number,
	blacklist: [String],
	pagamento: [String],
	tipo_pagamento: [String],
	regra_diaria: Number,
	ganho: Number,
	gasto: Number,
	cobrar_hora: Boolean
});
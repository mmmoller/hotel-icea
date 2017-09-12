
var mongoose = require('mongoose');

module.exports = mongoose.model('Financeiro',{
	ganho: Number,
	gasto: Number
});
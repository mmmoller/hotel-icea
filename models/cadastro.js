
var mongoose = require('mongoose');

module.exports = mongoose.model('Cadastro',{
	name: String,
	email: String,
	cpf: String,
	dateIn: String,
	dateOut: String,
	acompanhante: Number,
});
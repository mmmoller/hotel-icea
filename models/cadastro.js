
var mongoose = require('mongoose');

module.exports = mongoose.model('Cadastro',{
	id: String,
	name: String,
	email: String,
	cpf: String,
	dateIn: String,
	dateOut: String
});
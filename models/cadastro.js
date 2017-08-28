
var mongoose = require('mongoose');

module.exports = mongoose.model('Cadastro',{
	name: String,
	name_guerra: String,
	saram: String,
	identidade: String,
	unidade: String,
	endereco: String,
	telefone: String,
	email: String,
	cpf: String,
	dateIn: String,
	dateOut: String,
	acompanhante: Number,
	posto: String,
	curso: String,
	solicitante: String
});


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
	checkIn: String,
	checkOut: String,
	acompanhante: Number,
	sexo: String,
	posto: String,
	curso: String,
	solicitante: String,
	estado: String,
	leito: String
});

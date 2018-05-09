
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
	dependente: Number,
	info_dependente: String,
	sexo: String,
	posto: String,
	curso: String,
	solicitante: String,
	estado: String,
	leito: String,
	num_registro: String,
	custo_estada: Number,
	valor_pago: Number
});

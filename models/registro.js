var mongoose = require('mongoose');

module.exports = mongoose.model('Registro',{
	data: Date,
	estado: [String],
	cadastro_id: [String]
});
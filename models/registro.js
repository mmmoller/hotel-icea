var mongoose = require('mongoose');

module.exports = mongoose.model('Registro',{
	data: Date,
	//leito: [String],
	estado: [String],
	ocupante: [mongoose.Schema.Types.Mixed],
});
var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Cadastro = require('../models/cadastro');
var Registro = require('../models/registro');
var bCrypt = require('bcrypt-nodejs');

module.exports = function(passport){


	// /'INDEX'
	router.get('/', function(req, res) {
    	// Display the Login page with any flash message, if any
		res.render('index', { message: req.flash('message') });
	});
	
	// /CADASTRO
	
	//  criar get para /cadastro
	router.post('/cadastro', function(req, res){
		Cadastro.findOne({ 'cpf' :  req.param('cpf') }, function(err, cadastro) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err);
			}
			if (cadastro){
				res.send("Esse cadastro já foi realizado");
				return;
			}
			var newCadastro = new Cadastro();
			newCadastro.name = req.param('nome');
            newCadastro.email = req.param('email');
            newCadastro.cpf = req.param('cpf');
            newCadastro.dateIn = req.param('checkin');
            newCadastro.dateOut = req.param('checkout');
			
			newCadastro.save(function (err, updatedCadastro) {
				if (err) return handleError(err);
				
			});
			res.send('Cadastro realizado com sucesso');
        });
		
	});
	
	
	// /LOGIN
	router.get('/login', function(req,res){
		if (req.isAuthenticated()){
			res.redirect('/home')
		}
		res.render('login', { message: req.flash('message') });
	});
	
	router.post('/login', passport.authenticate('login', {
		successRedirect: '/home',
		failureRedirect: '/login',
		failureFlash : true  
	})); 

	
	// /HOME
	router.get('/home', isAuthenticated, function(req, res){
		res.render('home', { user: req.user, dic: dicionario });
	});
	
	// /HOME/LOGOUT
	
	router.get('/home/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	
	
	
	// /HOME/RESERVA
	
	router.get('/home/reserva', isAuthenticated, isReserva, function(req, res){
		Cadastro.find({}, function(err, cadastros) {
			res.render('home_reserva', {cadastros: cadastros});
		});
	});
	
	router.post('/home/reserva', isAuthenticated, isReserva, function(req, res){
		
		Cadastro.findOne({_id: req.param('_id')},function(err, cadastro) {
			req.session.cadastro = cadastro;
		
		
			Registro.find({data: {"$gte": cadastro.dateIn, "$lte": cadastro.dateOut}}, 
			null, {sort: 'data'}, function(err, registros) {
			
				var livre = [];
				for (var i = 0; i < leito.length; ++i){
					livre[i] = true;
				}
				
				for (var i = 0; i < registros.length; ++i){
					for (var j = 0; j < leito.length; ++j){
						if (registros[i].estado[j] != 'livre'){
							livre[j] = false;
						}
					}
				}
				
				var leitos = [];
				var j = 0;
				for (var i = 0; i < leito.length; ++i){
					if (livre[i]){
						leitos[i-j] = leito[i];
					}
					else {
						j++;
					}
				}
				
				res.render('home_reserva_alocacao', {leitos: leitos});
			});
		
		
		});
	});
	
	// /HOME/RESERVA/ALOCACAO
	
	router.get('/home/reserva/alocacao', isAuthenticated, isReserva, function(req, res){
		res.redirect('/home/reserva');
	});
	
	router.post('/home/reserva/alocacao', isAuthenticated, isReserva, function(req, res){
		
		Registro.find({data: {"$gte": req.session.cadastro.dateIn, "$lte": req.session.cadastro.dateOut}}
		, null, {sort: 'data'}, function(err, registros) {
			
			var leito_ = req.body.bizu;
			
			for (var i = 0; i < registros.length; ++i){
				for (var j = 0; j < leito.length; ++j){
					if (leito[j] == leito_){
						registros[i].estado.splice(j, 1, 'reservado');
						registros[i].ocupante.splice(j, 1, req.session.cadastro);
					}
				}
			}
			
			for (var i = 0; i < registros.length; ++i){
				registros[i].save(function (err, updatedRegistros) {
					if (err) return handleError(err);
				});
			}
			
			Cadastro.remove({'_id': req.session.cadastro._id}, function(err) {
				if (err) return handleError(err);
			});
			
			res.redirect('/home/reserva');
		});
	});
	
	
	
	// /HOME/RECEPCAO
	
	router.get('/home/recepcao', isAuthenticated, isRecepcao, function(req,res){
		var today = new Date();
		var tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate()+1);
		
		Registro.findOne({data: {"$gte": today, "$lte": tomorrow}}, null, {sort: '-data'}, function(err, registro) {	
			
			
			var cadastros = [];
			
			console.log(registro);
			
			
			for (var i = 0; i < leito.length; i++){
				if (registro.estado[i] == 'reservado'){
					cadastros[cadastros.length] = registro.ocupante[i];
				}
			}
			
			res.render('home_recepcao', {cadastros: cadastros});
		});
		
		
		//res.send(new Date());
	});
	
	router.post('/home/recepcao', isAuthenticated, isRecepcao, function(req,res){
		
		Registro.find({data: {"$gte": req.param('dateIn'), "$lte": req.param('dateOut')}}
		, null, {sort: 'data'}, function(err, registros) {
			
			
			for (var i = 0; i < registros.length; ++i){
				for (var j = 0; j < leito.length; ++j){
					if (registros[i].ocupante[j]._id == req.param('_id')){
						registros[i].estado.splice(j, 1, 'ocupado');
					}
				}
			}
			
			for (var i = 0; i < registros.length; ++i){
				registros[i].save(function (err, updatedRegistros) {
					if (err) return handleError(err);
				});
			}
			
			res.redirect('/home/recepcao');
		});
		
		
		
		
		
	});
	
	// /HOME/GERENTE
	
	router.get('/home/gerente', isAuthenticated, isGerente, function(req, res){
		res.render('home_gerente', {message: req.flash('message')});
	});
	
	// /HOME/GERENTE/PERMISSAO
	
	router.get('/home/gerente/permissao', isAuthenticated, isGerente, function(req, res){
		User.find({username: {$ne: 'admin'}}, function(err, users) {	
			res.render('home_gerente_permissao', {users: users, dic: dicionario});
		});
	});
	
	router.post('/home/gerente/permissao', isAuthenticated, isGerente, function(req, res){
		
		
		User.findOne({ 'username' :  req.body.bizu }, function(err, user) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err);
			}
			
			user.permissao = [req.body.Recepcao, req.body.Reserva, req.body.Lavanderia, req.body.Manutencao, req.body.Financeiro, req.body.Gerente]
			console.log(user);
			
			
			user.save(function (err, updatedUser) {
				if (err) return handleError(err);
				//res.send(updatedUser);
			});
        });
		
		res.redirect('/home/gerente/permissao');
	});
	
	
	// /HOME/GERENTE/SIGNUP
	
	router.get('/home/gerente/signup', isAuthenticated, isGerente, function(req, res){
		res.render('home_gerente_signup',{message: req.flash('message')});
	});

	router.post('/home/gerente/signup', isAuthenticated, isGerente, function(req, res){
		User.findOne({ 'username' :  req.param('username') }, function(err, user) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err);
			}
			if (user){
				res.send("Já existe usuário com esse nome");
				return;
			}
			var newUser = new User();
			newUser.username = req.param('username');
            newUser.password = createHash(req.param('password'));
            newUser.email = req.param('email');
            newUser.firstName = req.param('firstName');
            newUser.lastName = req.param('lastName');
			newUser.permissao = [true, true, true, true, true, false];
			
			newUser.save(function (err, updatedUser) {
				if (err) return handleError(err);
				
			});
			res.redirect('/home/gerente');
        });
		
	});
	
	
	// /HOME/GERENTE/REGISTRO
	
	router.get('/home/gerente/registro', isAuthenticated, isGerente, function(req,res){
		Registro.find({data: {"$gte": new Date(req.param('dataIn')), "$lte": new Date(req.param('dataOut'))}}, null, {sort: '-data'}, function(err, registros) {	
			res.render('home_gerente_registro', {registros: registros, leito: leito});
		});
	});
	
	// TUDO DAQUI PARA BAIXO É PARA DEBUGAR
	// ADMIN
	router.get('/admin', function(req, res){
		
		User.findOneAndRemove({ 'username' :  'admin' }, function(err, user) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err);
			}
        });
		
		User.findOne({ 'username' :  'admin' }, function(err, user) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err);
			}
			if (user){
				
				return;
			}
			var newUser = new User();
			
			newUser.username = 'admin';
			newUser.password = createHash('admin');;
			newUser.permissao = [true, true, true, true, true, true];
			
			newUser.save(function (err, updatedUser) {
				if (err) return handleError(err);
			});
        });
		res.redirect('/');
		
	});
	
	// DELETE
	router.get('/delete', function(req, res){
		User.remove({}, function(err) { 
			console.log('Users removed')
		});
		Cadastro.remove({}, function(err) { 
			console.log('Cadastros removed')
		});
		Registro.remove({}, function(err) { 
			console.log('Registros removed')
		});
		res.redirect('/');
	});
	
	
	// CRIAR
	router.get('/criar', function(req,res){
		res.render('criar');
	});
	
	router.post('/criar', function(req, res){
		var dataInicial = new Date(req.param('dataIn'));
		var dataFinal = new Date(req.param('dataOut'));
		var proximoDia = new Date(dataInicial);
		
		while (proximoDia < dataFinal){
			var newRegistro = new Registro();
			newRegistro.data = new Date(proximoDia);
			newRegistro.estado = [];
			newRegistro.ocupante = [];
			for (var i = 0; i < leito.length; i++){
				newRegistro.estado[newRegistro.estado.length] = "livre";
				newRegistro.ocupante[newRegistro.ocupante.length] = "";
			}
			newRegistro.save(function (err, updatedRegistro) {
				if (err) return handleError(err);	
			});
			proximoDia.setDate(proximoDia.getDate()+1);
		}
		res.redirect('/');
	});
	
	return router;
}


var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/login');
}

var isRecepcao = function (req, res, next) {
	if (req.user.permissao[0] == true){
		return next();
	}
	res.redirect('/home');
}

var isReserva = function (req, res, next) {
	if (req.user.permissao[1] == true){
		return next();
	}
	res.redirect('/home');
}

var isFinanceiro = function (req, res, next) {
	if (req.user.permissao[4] == true){
		return next();
	}
	res.redirect('/home');
}

var isGerente = function (req, res, next) {
	if (req.user.permissao[5] == true){
		return next();
	}
	res.redirect('/home');
}

var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

var dicionario = {0: "Recepcao", 1: "Reserva", 2: "Lavanderia", 3:"Manutencao",4: "Financeiro",5: "Gerente"};

var leito = ['A1a', 'A1b', 'A2a', 'A2b', 'A3a', 'A3b', 'A4a', 'A4b',
 'A5a', 'A5b', 'A6a', 'A6b', 'A7a', 'A7b', 'A8a', 'A8b'];



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

	
	// /HOME/RESERVA
	
	router.get('/home/reserva', function(req, res){
		Cadastro.find({}, function(err, cadastros) {	
			res.render('home_reserva', {cadastros: cadastros});
		});
	});
	
	router.post('/home/reserva', function(req, res){
		//console.log(req.body.nome);
		//console.log(req.param('nome'));
		//console.log(req.param('checkin'));
		//console.log(new Date(req.param('checkin')));
		//console.log("batatatata");
		//console.log(req.param('cadastro'));
		
		var cadastro = new Cadastro();
		cadastro.name = req.param('nome');
		cadastro.cpf = req.param('cpf');
		cadastro.email = req.param('email');
		cadastro.dateIn = req.param('checkin');
		cadastro.dateOut = req.param('checkout');
		
		console.log(cadastro);
		
		Registro.find({data: {"$gte": req.param('checkin'), "$lte": req.param('checkout')}}, 
		null, {sort: 'data'}, function(err, registros) {
			
			var livre = [];
			for (var i = 0; i < registros[0].leito.length; ++i){
				livre[i] = true;
			}
			
			for (var i = 0; i < registros.length; ++i){
				for (var j = 0; j < registros[0].leito.length; ++j){
					if (registros[i].estado[j] != 'livre'){
						livre[j] = false;
					}
				}
			}
			
			var leitos = [];
			var j = 0;
			for (var i = 0; i < registros[0].leito.length; ++i){
				if (livre[i]){
					leitos[i-j] = registros[0].leito[i];
				}
				else {
					j++;
				}
			}
		//req.session.registros = registros;
		req.session.cadastro = cadastro;
		//req.session.leitos = leitos;
		//res.redirect('/home/reserva/alocacao');
		res.render('home_reserva_alocacao', {registros: registros, cadastro: cadastro, leitos: leitos});
		});
	});
	
	// /HOME/RESERVA/ALOCACAO
	
	router.get('/home/reserva/alocacao', function(req, res){
		res.redirect('/home/reserva');
	});
	
	router.post('/home/reserva/alocacao', function(req, res){
		//res.redirect('/home/reserva');
		console.log(req.session.cadastro);
		Registro.find({data: {"$gte": req.session.cadastro.dateIn, "$lte": req.session.cadastro.dateOut}}, 
		null, {sort: 'data'}, function(err, registros) {
			
			
			var leito = req.body.bizu;
			console.log(req.body.leito);
			console.log(leito);
			var estado = [];
			var ocupante = [];
			var cadastro = req.session.cadastro;
			console.log(cadastro);
			
			for (var i = 0; i < registros.length; ++i){
				for (var j = 0; j < registros[0].leito.length; ++j){
					if (registros[i].leito[j] == leito){
						//registros[i].estado[j] = 'ocupado';
						//registros[i].ocupante[j] = req.session.cadastro;
						registros[i].estado.splice(j, 1, 'ocupado');
						registros[i].ocupante.splice(j, 1, req.session.cadastro);
						console.log("teste");
					}
					//else{
					//	estado[j] = 
					//	ocupante[j] =
					//}
				}
			}
			
			console.log(registros);
			
			
			for (var i = 0; i < registros.length; ++i){
				//registros[i].data = new Date('1000-1-1'); Essa porra funcionou.
				registros[i].save(function (err, updatedRegistros) {
					if (err) return handleError(err);
					//console.log(updatedRegistros);
				});
			}
			
			// deletar cadastro;
			res.redirect('/home/reserva');
		});
	});
	
	// /HOME
	router.get('/home', isAuthenticated, function(req, res){
		res.render('home', { user: req.user, dic: dicionario });
	});
	
	// /HOME/LOGOUT
	
	router.get('/home/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	
	router.get('/recepcao', isAuthenticated, function(req, res){
		/*
		User.findOne({ 'username' :  "moller" }, function(err, user) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err);
			}
			user.email = "email@trocado.com";
			user.save(function (err, updatedUser) {
				if (err) return handleError(err);
				res.send(updatedUser);
			});
        });*/
		next();
		
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
	
	router.get('/home/gerente/signup', isAuthenticated, function(req, res){
		res.render('home_gerente_signup',{message: req.flash('message')});
	});

	router.post('/home/gerente/signup', isAuthenticated, function(req, res){
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
	
	
	// GAMBIARRA
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
	
	
	// TESTE
	
	
	router.get('/teste', function(req,res){
		
		Registro.find({}, null, {sort: '-data'}, function(err, registros) {	
			res.render('teste', {registros: registros});
		});
		/*
		var dataTeste = new Date('2117-04-01');
		var proximoDia = new Date(dataTeste);
		proximoDia.setDate(proximoDia.getDate()+1);
		
		console.log(dataTeste);
		console.log(proximoDia);
		
		//proximoDia.setDate(dataTeste.getDate()+1);
		var dataTeste2 = new Date('2117-04-02');
		console.log(dataTeste2);
		if (proximoDia == dataTeste2){
			console.log("sao o mesmo dia");
		}
		res.send("banana");*/
	});
	
	router.post('/teste', function(req, res){
		var dataInicial = new Date(req.param('dataIn'));
		var dataFinal = new Date(req.param('dataOut'));
		var proximoDia = new Date(dataInicial);
		
		
		var gravar = [new Date(proximoDia)];
		var i = 0;
		
		while (proximoDia < dataFinal){
			console.log(gravar[i]);
			
			var newRegistro = new Registro();
				newRegistro.data = new Date(proximoDia);
				newRegistro.leito = [];
				newRegistro.estado = [];
				newRegistro.ocupante = [];
				for (var i = 0; i < 10; i++){
					newRegistro.leito[newRegistro.leito.length] = "quarto" + i.toString();
					newRegistro.estado[newRegistro.estado.length] = "livre";
					if (i == 5) {
						newRegistro.estado[5] = "ocupado";
						newRegistro.ocupante[5] = "ocupante2";
					}
					
				}
				
				
				
				newRegistro.save(function (err, updatedRegistro) {
					if (err) return handleError(err);
					
				});
			
			/*
			Registro.findOne({ 'data' :  gravar[i] }, function(err, registro) {
				// In case of any error, return using the done method
				if (err){
					return handleError(err);
				}
				if (registro){
					res.send("Data já existe");
					return;
				}
				console.log(gravar[i]);
				var newRegistro = new Registro();
				newRegistro.data = new Date(gravar[i]);
				newRegistro.leito = [];
				newRegistro.estado = [];
				newRegistro.ocupante = [];
				for (var i = 0; i < 10; i++){
					newRegistro.leito[newRegistro.leito.length] = "quarto" + i.toString();
					newRegistro.estado[newRegistro.estado.length] = "livre";
					if (i == 5) {
						newRegistro.estado[5] = "ocupado";
						newRegistro.ocupante[5] = "ocupante2";
					}
					
				}
				
				newRegistro.save(function (err, updatedRegistro) {
					if (err) return handleError(err);
					
				});
				
			});*/
			
			gravar[i] = new Date(proximoDia);
			console.log(proximoDia);
			proximoDia.setDate(proximoDia.getDate()+1);
			i++;
			
		}
		res.redirect('/teste');
		
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
	res.redirect('/');
}

var isReserva = function (req, res, next) {
	if (req.user.permissao[1] == true){
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

//var gravar = [];

/*function preencherGravar(dateIn, dateOut){
	var i = 0;
	while (dateIn < dateOut){
		gravar[i] = dateIn;
		dateIn.setDate(dateIn.getDate()+1);
		i++;
	}
}*/



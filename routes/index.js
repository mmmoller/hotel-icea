var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Cadastro = require('../models/cadastro');
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

	
	// /RESERVA
	
	router.get('/home/reserva', isAuthenticated, isReserva, function(req, res){
		Cadastro.find({}, function(err, cadastros) {	
			res.render('home_reserva', {cadastros: cadastros});
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





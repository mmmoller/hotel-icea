var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Cadastro = require('../models/cadastro');
var Registro = require('../models/registro');
var Leito = require('../models/leito');
var bCrypt = require('bcrypt-nodejs');

module.exports = function(passport){


	// /'INDEX'
	router.get('/', function(req, res) {
		res.render('index', { message: req.flash('message') });
	});
	
	router.post('/', function(req, res){
		var newCadastro = new Cadastro();
		newCadastro.name = req.param('nome');
		newCadastro.email = req.param('email');
		newCadastro.cpf = req.param('cpf');
		newCadastro.dateIn = req.param('checkin');
		newCadastro.dateOut = req.param('checkout');
		
		newCadastro.save(function (err, updatedCadastro) {
			if (err) return handleError(err,req,res);
			
		});
		req.flash('message', "Solicitação de reserva realizado com sucesso, aguarde confirmação por e-mail");
		res.redirect('/');
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
		res.render('home', { user: req.user, message: req.flash('message')});
	});
	
	// /HOME/LOGOUT
	router.get('/home/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	
	
	// /HOME/RECEPCAO/CHECKIN
	router.get('/home/recepcao/checkin', isAuthenticated, isRecepcao, function(req,res){
		var today = new Date();
		var tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate()+1);
		
		Registro.findOne({data: {"$gte": today, "$lte": tomorrow}}, function(err, registro) {	
			if (err) return handleError(err,req,res);
			if (registro){
				
				var cadastros = [];
				
				//console.log(registro);
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						for (var i = 0; i < leitos.length; i++){
							if (registro.estado[i] == 'reservado'){
								cadastros[cadastros.length] = registro.ocupante[i];
							}
						}
						res.render('home_recepcao_checkin', {cadastros: cadastros});
						
					}
					else {
						req.flash('message', 'É necessário criar os Leitos');
						res.redirect('/home');
					}
				});
				
			}
			else {
				req.flash('message', 'É necessário criar o Registro Geral');
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/recepcao/checkin', isAuthenticated, isRecepcao, function(req,res){
		
		Registro.find({data: {"$gte": req.param('dateIn'), "$lte": req.param('dateOut')}}
		, null, {sort: 'data'}, function(err, registros) {
			
			if (err) return handleError(err,req,res);
			if (registros){
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
				
						for (var i = 0; i < registros.length; ++i){
							for (var j = 0; j < leitos.length; ++j){
								if (registros[i].ocupante[j]._id == req.param('_id')){
									registros[i].estado.splice(j, 1, 'ocupado');
								}
							}
						}
						
						for (var i = 0; i < registros.length; ++i){
							registros[i].save(function (err, updatedRegistros) {
								if (err) return handleError(err,req,res);
							});
						}
						
						res.redirect('/home/recepcao/checkin');
					}
					else {
						req.flash('message', 'É necessário criar os Leitos');
						res.redirect('/home');
					}
				});
			}
			else {
				req.flash('message', 'É necessário criar o Registro Geral');
				res.redirect('/home');
			}
		});
		
		
		
		
		
	});
	
	// /HOME/RECEPCAO/CHECKOUT *
	
	// /HOME/RESERVA * Adicionar reserva com acompanhantes.
	router.get('/home/reserva', isAuthenticated, isReserva, function(req, res){
		Cadastro.find({}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				res.render('home_reserva', {cadastros: cadastros});
			}
			else {
				req.flash('message', "Não existem reservas");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/reserva', isAuthenticated, isReserva, function(req, res){
		
		Cadastro.findOne({_id: req.param('_id')},function(err, cadastro) {
			if (err) return handleError(err,req,res);
			if (cadastro){
				
				req.session.cadastro = cadastro;
			
				Registro.find({data: {"$gte": cadastro.dateIn, "$lte": cadastro.dateOut}}, 
				null, {sort: 'data'}, function(err, registros) {
					if (err) return handleError(err,req,res);
					if (registros) {
						Leito.find({}, function(err, leitos) {
							if (err) return handleError(err,req,res);
							if (leitos){
								
								var livre = [];
								for (var i = 0; i < leitos.length; i++){
									livre[i] = true;
								}
								
								for (var i = 0; i < registros.length; i++){
									for (var j = 0; j < leitos.length; j++){
										if (registros[i].estado[j] != 'livre'){
											livre[j] = false;
										}
									}
								}
								
								var leitos_ = [];
								var j = 0;
								for (var i = 0; i < leitos.length; i++){
									if (livre[i]){
										leitos_[i-j] = leitos[i].cod_leito;
									}
									else {
										j++;
									}
								}
								
								res.render('home_reserva_alocacao', {leitos: leitos_});
							}
							else {
								req.flash('message', "É necessário criar os Leitos");
								res.redirect('/home');;
							}
						});
					}
					else {
						req.flash('message', "É necessário criar o Registro Geral");
						res.redirect('/home');
					}
				});
			}
			else {
				req.flash('message', "Cadastro não existente");
				res.redirect('/home');
			}
		
		});
	});
	
	// /HOME/RESERVA/ALOCACAO * Adicionar reserva com acompanhantes. **
	router.get('/home/reserva/alocacao', isAuthenticated, isReserva, function(req, res){
		res.redirect('/home/reserva');
	});
	
	router.post('/home/reserva/alocacao', isAuthenticated, isReserva, function(req, res){
		
		Registro.find({data: {"$gte": req.session.cadastro.dateIn, "$lte": req.session.cadastro.dateOut}}
		, null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err,req,res); 
			if (registros){
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						var leito_ = req.body.bizu;
						
						for (var i = 0; i < registros.length; ++i){
							for (var j = 0; j < leitos.length; ++j){
								if (leitos[j].cod_leito == leito_){
									registros[i].estado.splice(j, 1, 'reservado');
									registros[i].ocupante.splice(j, 1, req.session.cadastro);
								}
							}
						}
						
						for (var i = 0; i < registros.length; ++i){
							registros[i].save(function (err, updatedRegistros) {
								if (err) return handleError(err,req,res);
							});
						}
						
						Cadastro.remove({'_id': req.session.cadastro._id}, function(err) {
							if (err) return handleError(err,req,res);
						});
						
						res.redirect('/home/reserva');
					}
					else{
						req.flash('message', "É necessário criar os Leitos");
						res.redirect('/home');;
					}
				});
			}
			else {
				req.flash('message', "É necessário criar o Registro Geral");
				res.redirect('/home');;
			}
		});
	});
	
	
	// /HOME /LAVANDERIA
	router.get('/home/lavanderia/folha', isAuthenticated, function(req, res){
		res.render('home_lavanderia_folha', {descricoes: desc_itens_lavanderia});
	});
	
	router.get('/home/lavanderia/gerencia', isAuthenticated, function(req, res){
		res.render('home_lavanderia_gerencia');
	});

	
	// /HOME/MANUTENCAO/QUADRO
	router.get('/home/manutencao/quadro', isAuthenticated, isManutencao, function(req, res){
		Leito.find({}, function(err, leitos) {
			if (err) return handleError(err,req,res);
			if (leitos){
				res.render('home_manutencao_quadro', {leitos: leitos});
			}
			else {
				req.flash('message', "Os Leitos ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
	// /HOME/MANUTENCAO/QUADRO/ALTERAR
	router.get('/home/manutencao/quadro/alterar', isAuthenticated, isManutencao, function(req, res){
		console.log("get /HOME/MANUTENCAO/QUADRO/ALTERAR");
		Leito.find({cod_leito: req.param('leito_alterado')}, function(err, leito) {
			if (err) return handleError(err,req,res);
			if (leito){
				res.render('home_manutencao_quadro_alterar', {leito: leito});
			}
			else {
				req.flash('message', "Os Leito procurado não foi encontrado");
				res.redirect('/home/manutencao/quadro');
			}
		});
	});
	// /HOME/MANUTENCAO/QUADRO/ALTERAR
	router.post('/home/manutencao/quadro/alterar', isAuthenticated, isManutencao, function(req, res){
		console.log("post /HOME/MANUTENCAO/QUADRO/ALTERAR");


		Leito.findOne({cod_leito: req.param('leito_alterado')}, function(err, leito) {
			if (err) return handleError(err,req,res);
			if (leito){
				if(req.param('desc_pane_adc') != undefined){
					leito.manutencao.push(req.param('desc_pane_adc'));
					leito.save();
					res.redirect('/home/manutencao/quadro/alterar?leito_alterado='+req.param('leito_alterado'));
					return;
				}
				var newManutencao = [];
				var ok = true;
				for(var i = 0; i < leito.manutencao.length; i++){
					if(req.param('idx_pane_rem_'+i) != '1'){ //manter essa pane
						newManutencao.push(leito.manutencao[i]);
					}
				}
				if(ok){
					leito.manutencao = newManutencao.slice(0); //clonando array
					leito.save();
					res.redirect('/home/manutencao/quadro/alterar?leito_alterado='+req.param('leito_alterado'));
					return;
				}
				
			}
			else {
				req.flash('message', "Os Leito procurado não foi encontrado");
				res.redirect('/home/manutencao/quadro');
			}
		});
	});


	// /HOME/MANUTENCAO/LIMPEZA
	router.get('/home/manutencao/limpeza', isAuthenticated, isManutencao, function(req, res){
		Leito.find({}, function(err, leitos) {
			if (err) return handleError(err,req,res);
			if (leitos){
				res.render('home_manutencao_limpeza', {leitos: leitos});
			}
			else {
				req.flash('message', "Os Leitos ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
	

	// /HOME/GERENTE
	router.get('/home/gerente', isAuthenticated, isGerente, function(req, res){
		res.render('home_gerente', {message: req.flash('message')});
	});
	
	// /HOME/GERENTE/PERMISSAO
	router.get('/home/gerente/permissao', isAuthenticated, isGerente, function(req, res){
		User.find({username: {$ne: 'admin'}}, function(err, users) {
			if (err) return handleError(err,req,res);
			if (users){
				res.render('home_gerente_permissao', {users: users, dic: dicionario});
			}
			else {
				req.flash('message', "Nenhum usuário existente");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/gerente/permissao', isAuthenticated, isGerente, function(req, res){
		
		
		User.findOne({ 'username' :  req.body.bizu }, function(err, user) {
            // In case of any error, return using the done method
			if (err) return handleError(err,req,res);
			
			if (user) {
				user.permissao = [req.body.Recepcao, req.body.Reserva, req.body.Lavanderia, req.body.Manutencao, req.body.Financeiro, req.body.Gerente]
				console.log(user);
				
				
				user.save(function (err, updatedUser) {
					if (err) return handleError(err,req,res);
					//res.send(updatedUser);
				});
			}
			else {
				req.flash('message', "O usuário não existe");
				res.redirect('/home');
			}
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
				return handleError(err,req,res);
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
				if (err) return handleError(err,req,res);
				
			});
			res.redirect('/home/gerente');
        });
		
	});
	
	// /HOME/GERENTE/REGISTRO
	router.get('/home/gerente/registro', isAuthenticated, isGerente, function(req,res){
		Registro.find({data: {"$gte": new Date(req.param('dataIn')), "$lte": new Date(req.param('dataOut'))}}
		, null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err, req, res);
			if (registros){
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						res.render('home_gerente_registro', {registros: registros, leito: leitos});
					}
					else {
						req.flash('message', 'É necessário criar os Leitos');
						res.redirect('/home');
					}
				});
			}
			else {
				req.flash('message', 'É necessário criar o Registro Geral');
				res.redirect('/home');
			}
		});
	});
	
	
	// TUDO DAQUI PARA BAIXO É PARA DEBUGAR
	// ADMIN
	router.get('/admin', function(req, res){
		
		User.findOneAndRemove({ 'username' :  'admin' }, function(err, user) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err,req,res);
			}
        });
		
		User.findOne({ 'username' :  'admin' }, function(err, user) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err,req,res);
			}
			if (user){
				
				return;
			}
			var newUser = new User();
			
			newUser.username = 'admin';
			newUser.password = createHash('admin');;
			newUser.permissao = [true, true, true, true, true, true];
			
			newUser.save(function (err, updatedUser) {
				if (err) return handleError(err,req,res);
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
		Leito.remove({}, function(err) { 
			console.log('Leito removed')
		});
		
		res.redirect('/');
	});
	
	// CRIAR
	router.get('/criar', function(req,res){
		res.redirect('/criar/leitos');
	});

	router.get('/criar/leitos', function(req,res){
		var newLeito;
		//A
		for(var i = 1; i <= 18; i++){
			newLeito = createLeito(("A" + i + "a"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("A" + i + "b"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
		}
		newLeito = createLeito("A19a");
		newLeito.save(function(err, updatedLeito){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("A19b");
		newLeito.save(function(err, updatedLeito){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("A19c");
		newLeito.save(function(err, updatedLeito){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("A20a");
		newLeito.save(function(err, updatedLeito){
			if(err) return handleError(err,req,res);
		});		
		newLeito = createLeito("A21a");
		newLeito.save(function(err, updatedLeito){
			if(err) return handleError(err,req,res);
		});		


		//B
		newLeito = createLeito("B1a");
		newLeito.save(function(err, updatedLeito){
			if(err) return handleError(err,req,res);
		});
		for(var i = 2; i <= 19; i++){
			newLeito = createLeito(("B" + i + "a"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("B" + i + "b"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
		}

		//C
		for(var i = 1; i <= 25; i++){
			newLeito = createLeito(("C" + i + "a"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("C" + i + "b"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("C" + i + "c"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
		}
		for(var i = 26; i <= 35; i++){
			newLeito = createLeito(("C" + i + "a"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("C" + i + "b"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
		}

		//D
		for(var i = 101; i <= 119; i++){
			newLeito = createLeito(("D" + i + "a"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "b"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "c"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "d"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
		}
		newLeito = createLeito(("D200a"));
		newLeito.save(function(err, updatedLeito){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito(("D200b"));
		newLeito.save(function(err, updatedLeito){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito(("D200c"));
		newLeito.save(function(err, updatedLeito){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito(("D200d"));
		newLeito.save(function(err, updatedLeito){
			if(err) return handleErr200		});
		for(var i = 202; i <= 221; i++){
			newLeito = createLeito(("D" + i + "a"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "b"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "c"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "d"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
		}
		for(var i = 222; i <= 223; i++){
			newLeito = createLeito(("D" + i + "a"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "b"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "c"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "d"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "e"));
			newLeito.save(function(err, updatedLeito){
				if(err) return handleError(err,req,res);
			});
		}
		setTimeout(function () {res.redirect('/criar/registro')}, 5000);
	});
	
	router.get('/criar/registro', function(req, res){
		//var dataInicial = new Date(req.param('dataIn'));
		//var dataFinal = new Date(req.param('dataOut'));
		
		Leito.find({}, function(err, leitos) {
			if (err) return handleError(err,req,res);
			if (leitos){
				var dataInicial = new Date('2017-01-01');
				var dataFinal = new Date('2050-01-01');
				var proximoDia = new Date(dataInicial);
				
				while (proximoDia < dataFinal){
					var newRegistro = new Registro();
					newRegistro.data = new Date(proximoDia);
					newRegistro.estado = [];
					newRegistro.ocupante = [];
					for (var i = 0; i < leitos.length; i++){
						newRegistro.estado[newRegistro.estado.length] = "livre";
						newRegistro.ocupante[newRegistro.ocupante.length] = "";
					}
					newRegistro.save(function (err, updatedRegistro) {
						if (err) return handleError(err,req,res);	
					});
					proximoDia.setDate(proximoDia.getDate()+1);
				}
				res.redirect('/');
			}
			else {
				req.flash('message', "Os Leitos ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
	
	return router;
}

function handleError(err,req,res){
	console.log(err);
	res.send(err);
}

function createLeito(cod_leito){
	var ret = new Leito();
	ret.cod_leito = cod_leito;
	ret.limpeza = "limpo";
	ret.ocupabilidade = "normal";
	ret.manutencao = [];
	ret.ocupante = [];
	return ret;
}

// Está sem nenhum autenticação para poder debugar mais fácil.

var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	return next();
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/login');
}

var isRecepcao = function (req, res, next) {
	return next();
	if (req.user.permissao[0] == true){
		return next();
	}
	res.redirect('/home');
}

var isReserva = function (req, res, next) {
	return next();
	if (req.user.permissao[1] == true){
		return next();
	}
	res.redirect('/home');
}

var isManutencao = function (req, res, next) {
	return next();
	if (req.user.permissao[3] == true){
		return next();
	}
	res.redirect('/home');
}

var isFinanceiro = function (req, res, next) {
	return next();
	if (req.user.permissao[4] == true){
		return next();
	}
	res.redirect('/home');
}

var isGerente = function (req, res, next) {
	return next();
	if (req.user.permissao[5] == true){
		return next();
	}
	res.redirect('/home');
}

var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

var dicionario = {0: "Recepcao", 1: "Reserva", 2: "Lavanderia", 3:"Manutencao",4: "Financeiro",5: "Gerente"};
var desc_itens_lavanderia = [
	"",
	"Lençol",
	"Fronha",
	"Colcha",
	"Cobertor",
	"Toalha de banho",
	"Toalha de rosto",
	"Toalha de mesa",
	"Toalha de piso",
	"Travesseiro",
	"Cortina",
	"Capa de travesseiro",
	"Saia cama box solteiro",
	"Capa para união cama box solteiro"];
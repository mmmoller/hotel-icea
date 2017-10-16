var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Cadastro = require('../models/cadastro');
var Registro = require('../models/registro');
var Folha = require('../models/folha');
var Log = require('../models/log');
var Leito = require('../models/leito');
var Financeiro = require('../models/financeiro');
var bCrypt = require('bcrypt-nodejs');
var moment = require('moment');
var mongoose = require('mongoose');

module.exports = function(passport){

	// /'TESTE'
	
	router.get('/teste', function(req,res){
		req.flash('message', "!Solicitação de reserva realizada com sucesso, aguarde confirmação por e-mail");
		res.redirect('/home');
		//res.render("home_modulo", {titulo: "Recepção", endereco: modulo_recepcao_endereco, tag: modulo_recepcao_titulo })
	});		

{ // Index/Login/Logout/Home
	
	// /'INDEX'
	router.get('/', function(req, res) {
		res.render('index', {message: req.flash('message')});
	});
	
	router.post('/', function(req, res){
		// Cria uma variavel cadastro com todos os parametros preenchidos pelo hóspede.

		var newCadastro = new Cadastro();
		newCadastro.name = req.param('nome'); 
		newCadastro.name_guerra = req.param('nome_guerra'); 
		newCadastro.saram = req.param('saram'); 
		newCadastro.identidade = req.param('identidade'); 
		newCadastro.unidade = req.param('unidade'); 
		newCadastro.endereco = req.param('endereco'); 
		newCadastro.telefone = req.param('telefone'); 
		newCadastro.email = req.param('email'); 
		newCadastro.cpf = req.param('cpf'); 
		newCadastro.dateIn = req.param('checkin');
		newCadastro.dateOut = req.param('checkout');
		newCadastro.acompanhante = req.param('acompanhante'); 
		newCadastro.posto = req.param('posto'); 
		newCadastro.curso = req.param('curso'); 
		newCadastro.solicitante = req.param('solicitante'); 
		newCadastro.estado = "solicitacao";
		// Se a data de saida for maior que a data de entrada, é valido (essa validação deveria ser feita no front-end)
		// Ou renderizar a página com os dados já preenchidos
		if (moment(newCadastro.dateIn).isValid() &&
		moment(newCadastro.dateOut).isValid() &&
		moment(newCadastro.dateIn) < moment(newCadastro.dateOut)
		//&& moment(newCadastro.dateIn) > moment().subtract(1, 'days')
		){
			
			newCadastro.dateIn = moment(newCadastro.dateIn).format("YYYY-MM-DD");
			newCadastro.dateOut = moment(newCadastro.dateOut).format("YYYY-MM-DD");
			newCadastro.save(function (err) {
				if (err) return handleError(err,req,res);
			});
			
			Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
				if (err) return handleError(err,req,res);
				if (log){
					/*
					log.log.push("[" + moment().format("HH:mm:ss") + "]" +
					" CADASTRO: " +
					"realizado a SOLITICAÇÃO DE RESERVA do hospede " + newCadastro.name +
					", do dia " + moment(newCadastro.dateIn).format("DD/MM/YY") +
					" ao dia " + moment(newCadastro.dateOut).format("DD/MM/YY"));
					*/
					log.modulo.push("Cadastro");
					log.horario.push(moment().format("HH:mm:ss"));
					log.log.push("Solicitação de reserva. Data de entrada: "
					+ moment(newCadastro.dateIn).format("DD/MM/YY") +
					". Data de saida: " + moment(newCadastro.dateOut).format("DD/MM/YY"));
					log.cadastro.push(newCadastro.name);
					log.cadastro_id.push(newCadastro._id);
					log.usuario.push("");
					log.save(function (err) {
						if (err) return handleError(err,req,res);
					});
				}
				else{
					req.flash('message', '!É necessário criar o Log');
					res.redirect('/home');
					//console.log("não tem log");
				}
			});
			
			
			
			req.flash('message', "Solicitação de reserva realizada com sucesso, aguarde confirmação por e-mail");
			if (req.user){
				res.redirect('/home');
			}
			else{
				res.redirect('/');
			}
			
		}
		else {
			req.flash('message', "!Datas invalidas");
			res.redirect('/');
		}
	});
		
		
	// /LOGIN
	router.get('/login', function(req,res){
		// Se já estiver logado, não precisa logar de novo.
		if (req.isAuthenticated()){
			res.redirect('/home')
		}
		res.render('login', { message: req.flash('message') });
	});
	
	router.post('/login', passport.authenticate('login', {
		// Autenticação pelo passport.
		successRedirect: '/home',
		failureRedirect: '/login',
		failureFlash : true
	})); 

	// /HOME/LOGOUT
	router.get('/home/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	
	// /HOME
	router.get('/home', isAuthenticated, function(req, res){
		//console.log(moment('2017-07-02T12'));
		//console.log(moment());
		if (req.user){
			if (req.user.username == 'visitante'){
				res.redirect('/home/registro');
			}
			else{
				
			}
		}
		else {
			
		}
		res.render('home', { user: req.user, message: req.flash('message')});
		
	});
	
	router.post('/home', isAuthenticated, function(req, res){
		User.findOne({ 'username' :  req.user.username }, function(err, user) {
			if (err) return handleError(err,req,res);
			if (user){
				if (bCrypt.compareSync(req.param("old_password"), user.password)){
					if (req.param("new_password") == req.param("new_password_confirm")){
						user.password = createHash(req.param("new_password"));
						user.save(function (err) {
							if (err) return handleError(err,req,res);
						});
						req.flash('message', 'Senha atualizada com sucesso.');
						res.redirect('/home');
					}
					else {
						req.flash('message', '!Senha nova e confirmação da senha nova não são iguais.');
						res.redirect('/home');
					}
				}
				else {
					req.flash('message', '!Senha antiga incorreta.');
					res.redirect('/home');
				}
			}
			else {
				req.flash('message', '!Usuário não existe.');
				res.redirect('/home');
			}
		});
	});
}
	
{ // RECEPCAO

	router.get('/home/recepcao/checkin', isAuthenticated, isRecepcao, function(req,res){
		Cadastro.find({'estado': "reservado"}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				
				// Para renderizar os dados do cadastros (nome, dataIn, dataOut) que podem fazer check-in hoje.
				var cadastros_ = [];
				// Para dizer se o leito está sujo/limpo.
				var cores = [];
				
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						for (var i = 0; i < cadastros.length; i++){
							if (moment(cadastros[i].dateIn) < moment()/*.add(12, 'hours')*/ 
								&& moment(cadastros[i].dateOut) > moment().subtract(12, 'hours')){
								cadastros_.push(cadastros[i])
								for (var j = 0; j < leitos.length; j++){
									if (cadastros[i].leito == leitos[j].cod_leito){
										//leitos_limpeza[leitos_limpeza.length] = leitos[j].limpeza;
										if (leitos[j].limpeza == "sujo"){
											cores.push("laranja");
										}
										else{
											cores.push("azul");
										}
									}
								}
							}
							
							// DEBUG
							else {
								if (debug){
									cadastros_.push(cadastros[i]);
									cores.push("vermelho");
								}
							}
						}
						
						res.render('home_recepcao_geral', {cadastros: cadastros_
						, titulo: "Realizar Check-In", endereco: "checkin",
						botao: "Check-in", cores: cores, message: req.flash('message')});
						
					}
					else {
						req.flash('message', 'É necessário criar os Leitos');
						res.redirect('/home');
					}
				});		
				
			}
			else {
				req.flash('message', "Não existem reservas");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/recepcao/checkin', isAuthenticated, isRecepcao, function(req,res){
	
		// Procura registros com as datas compreendidas no periodo da reserva dos hospedes.
		Registro.find({data: {"$gte": moment(req.param('dateIn')), "$lt": moment(req.param('dateOut'))}}
		, null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err,req,res);
			if (registros){
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						// index do leito que está sendo alterado no registro.
						var index;
						for (var j = 0; j < leitos.length; ++j){
							if (leitos[j].cod_leito == req.param('cod_leito')){
								index = j;
							}
						}
						
						
						Cadastro.findOne({'_id': req.param('_id')}, function(err, cadastro) {
							if (err) return handleError(err,req,res);
							if (cadastro){
								cadastro.estado = "checkin";
								cadastro.checkIn = moment().format();
								
								for (var i = 0; i < registros.length; ++i){
									registros[i].estado.splice(index, 1, 'ocupado');
									registros[i].ocupante.splice(index, 1, cadastro);
								}
								
								for (var i = 0; i < registros.length; ++i){
									registros[i].save(function (err) {
										if (err) return handleError(err,req,res);
									});
								}
								
								Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
									if (err) return handleError(err,req,res);
									if (log){
										/*
										log.log.push("[" + moment().format("HH:mm:ss") + "]" +
										" RECEPÇÃO: " +
										"realizado o CHECK-IN do hospede " + registros[0].ocupante[index].name +
										", do dia " + moment(registros[0].ocupante[index].dateIn).format("DD/MM/YY") +
										" ao dia " + moment(registros[0].ocupante[index].dateOut).format("DD/MM/YY") +
										" no leito " + leitos[index].cod_leito +
										". Usuário: " + req.user.username);*/
										log.modulo.push("Recepcao");
										log.horario.push(moment().format("HH:mm:ss"));
										log.log.push("Check-in no leito "
										+ leitos[index].cod_leito);
										log.cadastro.push(cadastro.name);
										log.cadastro_id.push(cadastro._id);
										log.usuario.push(req.user.username);
										
										log.save(function (err) {
										if (err) return handleError(err,req,res);
									});
									}
									else{
										req.flash('message', 'É necessário criar o Log');
										res.redirect('/home');
									}
								});
								
								
								cadastro.save(function(err){
									if (err) return handleError(err,req,res);
								});
								
								req.flash('message', 'Check-in realizado com sucesso')
								res.redirect('/home/recepcao/checkin');
								
							}
							else {
								req.flash('message', "Não existe Cadastro");
								res.redirect('/home');
							}
						});
						
						
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
	
	// /HOME/RECEPCAO/CHECKIN/CANCELAR
	router.get('/home/recepcao/checkin/cancelar', isAuthenticated, isRecepcao, function(req,res){
		Cadastro.find({'estado': "reservado"}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				
				// Para dizer se deve cancelar o check-in ou não.
				var cores = [];
				
				
				for (var i = 0; i < cadastros.length; i++){
					if (moment(cadastros[i].dateIn) > moment().subtract(1, 'days')){
						cores[i] = "vermelho";
					}
					else if (moment(cadastros[i].dateOut) < moment()){
						cores[i] = "azul"
					}
					else {	
						cores[i] = "laranja";
					}
					
				}
				
				res.render('home_recepcao_geral', {cadastros: cadastros
				, titulo: "Cancelar Check-In", endereco: "checkin/cancelar",
				botao: "Cancelar", cores: cores, message: req.flash('message')});
						
					
				
			}
			else {
				req.flash('message', "Não existem reservas");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/recepcao/checkin/cancelar', isAuthenticated, isRecepcao, function(req,res){
		
		Registro.find({data: {"$gte": moment(req.param('dateIn')), "$lt": moment(req.param('dateOut'))}}
		, null, {sort: 'data'}, function(err, registros) {
			
			if (err) return handleError(err,req,res);
			if (registros){
				
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						Cadastro.findOne({'_id': req.param('_id')}, function(err, cadastro) {
							if (err) return handleError(err,req,res);
							if (cadastro){
								cadastro.estado = "no show";
								cadastro.save(function(err){
									if (err) return handleError(err,req,res);
								});
								
								
								var index = 0;
								for (var j = 0; j < leitos.length; ++j){
									if (leitos[j].cod_leito == req.param('cod_leito')){
										index = j;
									}
								}
								
								
								for (var i = 0; i < registros.length; ++i){
									if (registros[i].estado[index] == 'reservado'){
										registros[i].estado.splice(index, 1, 'livre');
										registros[i].ocupante.splice(index, 1, '');
									}
								}
								
								for (var i = 0; i < registros.length; ++i){
									registros[i].save(function (err) {
										if (err) return handleError(err,req,res);
									});
								}
								
								Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
									if (err) return handleError(err,req,res);
									if (log){
										/*
										log.log.push("[" + moment().format("HH:mm:ss") + "]" +
										"RECEPÇÃO: " +
										"CANCELADO O CHECK-IN do hospede " + registros[0].ocupante[index].name +
										", do dia " + moment(registros[0].ocupante[index].dateIn).format("DD/MM/YY") +
										" ao dia " + moment(registros[0].ocupante[index].dateOut).format("DD/MM/YY") +
										" no leito " + leitos[index].cod_leito +
										". Usuário: " + req.user.username);*/
										
										log.modulo.push("Recepcao");
										log.horario.push(moment().format("HH:mm:ss"));
										log.log.push("Cancelado o check-in no leito "
										+ leitos[index].cod_leito);
										log.cadastro.push(cadastro.name);
										log.cadastro_id.push(cadastro._id);
										log.usuario.push(req.user.username);
										
										log.save(function (err) {
											if (err) return handleError(err,req,res);
										});
									}
									else{
										req.flash('message', 'É necessário criar o Log');
										res.redirect('/home');
									}
								});
								
								req.flash('message', 'Check-in cancelado com sucesso');
								res.redirect('/home/recepcao/checkin/cancelar');
							}
						
							else {
								req.flash('message', "Não existe Cadastro");
								res.redirect('/home');
							}
						});
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
	
	// /HOME/RECEPCAO/CHECKOUT
	router.get('/home/recepcao/checkout', isAuthenticated, isRecepcao, function(req,res){
		Cadastro.find({'estado': "checkin"}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				
				// Para dizer se deve cancelar o check-in ou não.
				var cores = [];
				
				// Custo.
				var custos = [];
				
				//checkout certo. (AZUL)
				//  					         dateOut(00:00)	
				//                         ontem(-23:59)      hoje(00:01)
				// 						   ocupado            livre
				
				//checkout antecipado. (LARANJA)
				//  					                               dateOut(00:00)	
				//                         ontem(-23:59)      hoje(00:01)
				// 						   ocupado            ocupado
				
				//checkout ruim. (VERMELHO)
				//  					         dateOut(00:00)	
				//                         ontem(-11:59)      hoje(12:01)
				// 						   ocupado            livre
							
				for (var i = 0; i < cadastros.length; i++){
					if (moment(cadastros[i].dateOut) < moment()
						&& moment(cadastros[i].dateOut) > moment().subtract(12, 'hours')){
						cores[i] = "azul";
					}
					else if (moment(cadastros[i].dateOut) > moment()){
						cores[i] = "laranja"
					}
					else {
						cores[i] = "vermelho";
					}
					
					
					var dateIn = moment(cadastros[i].checkIn);
					var dateOut = moment();
					var hours = moment().diff(moment(cadastros[i].checkIn),"hours");
						
					custos[i] = hours*dicionario_posto_valor[cadastros[i].posto]/24;
					
					
				}
				
				req.session.preventf5 = true;
				
				res.render('home_recepcao_geral', {cadastros: cadastros
				, titulo: "Realizar Check-Out", endereco: "checkout",
				botao: "Check-out", cores: cores, custos: custos, message: req.flash('message')});
								
			}
			else {
				req.flash('message', "Não existem reservas");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/recepcao/checkout', isAuthenticated, isRecepcao, function(req,res){
		
		if (req.session.preventf5){
			req.session.preventf5 = false;
			Cadastro.findOne({'_id': req.param('_id')}, function(err, cadastro) {
				if (err) return handleError(err,req,res);
				if (cadastro){
					
					//      12:01
					// 00:00
					
					Registro.find({data: {"$gte": moment().subtract(12, 'hours'), "$lt": cadastro.dateOut}}, function(err, registros) {

						if (err) return handleError(err,req,res);
						if (registros){
							
							Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
								if (err) return handleError(err,req,res);
								if (leitos){
									
									var index = 0;
									
									for (var i = 0; i < leitos.length; i++){
										if (cadastro.leito == leitos[i].cod_leito){
											index = i;
											leitos[i].limpeza = "sujo";
											leitos[i].save(function (err) {
												if (err) return handleError(err,req,res);
											});
										}
									}
									
									for (var i = 0; i < registros.length; i++){
										registros[i].estado.splice(index, 1, "livre");
										registros[i].ocupante.splice(index, 1, "");
										registros[i].save(function (err) {
											if (err) return handleError(err,req,res);
										});
									}
									
									cadastro.estado = "checkOut";
									cadastro.checkOut = moment().format();
									cadastro.save(function(err){
										if (err) return handleError(err,req,res);
									});
									
									
									var custo = Number(req.param("valor"));
									var tipo_pagamento = req.param("tipo_pagamento");
									
									/*
									if (req.param("valor") == ""){
										custo = Number(req.param("valor_previsto"));
									}
									else{
										//custo = Number((req.param("valor").replace(/[^0-9\,-]+/g,"")).replace(",","."));
										custo = Number(req.param("valor"));
									}*/
									
									
									
									
									
									
									Financeiro.findOne({}, function(err, financeiro) {
										if (err) return handleError(err,req,res);
										if (financeiro){
											financeiro.ganho += custo;
											financeiro.save(function (err) {
												if (err) return handleError(err,req,res);
											});
										}
										else {
											req.flash('message', 'É necessário criar o Financeiro');
											res.redirect('/home');
										}
									});
									
									Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
										if (err) return handleError(err,req,res);
										if (log){
											
											log.modulo.push("Recepcao");
											log.horario.push(moment().format("HH:mm:ss"));
											log.log.push("Check-out no leito "
											+ leitos[index].cod_leito);
											log.cadastro.push(cadastro.name);
											log.cadastro_id.push(cadastro._id);
											log.usuario.push(req.user.username);
											
											log.save(function (err) {
												if (err) return handleError(err,req,res);
											});
										}
										else{
											req.flash('message', 'É necessário criar o Log');
											res.redirect('/home');
										}
									});
									
									/*
									req.flash('message', 'Check-out realizado com sucesso.');
									res.redirect('/home/recepcao/checkout');
									*/
									res.render('home_recepcao_checkout', 
									{cadastro: cadastro, custo: custo, tipo_pagamento: tipo_pagamento, 
									checkIn: moment(cadastro.checkIn).format("DD/MM/YYYY HH:mm:ss"),
									checkOut: moment(cadastro.checkOut).format("DD/MM/YYYY HH:mm:ss")
									});
									
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
						}
				
				else {
					req.flash('message', "Cadastro não existe");
					res.redirect('/home');
				}
			});
		}
		else{
			res.redirect('/home/recepcao/checkout');
		}
	});
	
	// /HOME/RECEPCAO/EXTENDER
	router.get('/home/recepcao/extender', isAuthenticated, isRecepcao, function(req,res){
		Cadastro.find({'estado': "checkin"}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				
				// Quais cadastros_ são extendiveis em 1 dia a estadia.
				var cadastros_ = [];
				
				Registro.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}
				, null, {sort: 'data'}, function(err, registro) {
					
					if (err) return handleError(err,req,res);
					if (registro){
					Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
						if (err) return handleError(err,req,res);
						if (leitos){
							
								for (var i = 0; i < cadastros.length; i++){
									
									for (var j = 0; j < leitos.length; j++){
										if (leitos[j].cod_leito == cadastros[i].leito){
											if (registro.estado[j] == "livre"){
												cadastros_.push(cadastros[i]);
											}
										}
									}
									
								}
								
								res.render('home_recepcao_geral', {cadastros: cadastros_
								, titulo: "Extender estadia", endereco: "extender",
								botao: "Extender", message: req.flash('message')});
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
			}
			else {
				req.flash('message', "Não existem reservas");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/recepcao/extender', isAuthenticated, isRecepcao, function(req,res){
		Cadastro.findOne({'_id': req.param('_id')}, function(err, cadastro) {
			if (err) return handleError(err,req,res);
			if (cadastro){
				
				Registro.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}
				, null, {sort: 'data'}, function(err, registro) {
					
					if (err) return handleError(err,req,res);
					if (registro){
					Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
						if (err) return handleError(err,req,res);
						if (leitos){
							
								for (var j = 0; j < leitos.length; j++){
									if (leitos[j].cod_leito == cadastro.leito){
										if (registro.estado[j] == "livre"){
											registro.estado.splice(j, 1, "ocupado");
											registro.ocupante.splice(j, 1, cadastro);
											registro.save(function (err) {
												if (err) return handleError(err,req,res);
											});
										}
									}
								}
								
								cadastro.dateOut = moment(cadastro.dateOut).add(1, 'days').format("YYYY-MM-DD");
								cadastro.save(function (err) {
									if (err) return handleError(err,req,res);
								});
								
								Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
									if (err) return handleError(err,req,res);
									if (log){
										
										log.modulo.push("Recepcao");
										log.horario.push(moment().format("HH:mm:ss"));
										log.log.push("Extendida a estadia no leito "
										+ cadastro.leito);
										log.cadastro.push(cadastro.name);
										log.cadastro_id.push(cadastro._id);
										log.usuario.push(req.user.username);
										
										log.save(function (err) {
											if (err) return handleError(err,req,res);
										});
									}
									else{
										req.flash('message', 'É necessário criar o Log');
										res.redirect('/home');
									}
								});
								
								
								req.flash('message', 'Estadia extendida com sucesso');
								res.redirect('/home/recepcao/extender');
								
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
			}
			else {
				req.flash('message', "Cadastro inexistente");
				res.redirect('/home');
			}
		});
	});
	
	// /HOME/RECEPCAO/MUDANCA
	router.get('/home/recepcao/mudanca', isAuthenticated, isRecepcao, function(req,res){
		Cadastro.find({'estado': "checkin"}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				
				res.render('home_recepcao_geral', {cadastros: cadastros
				, titulo: "Realizar Mudança", endereco: "mudanca",
				botao: "Mudança", message: req.flash('message')});
				
			}
			else {
				req.flash('message', "Não existem reservas");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/recepcao/mudanca', isAuthenticated, isRecepcao, function(req,res){
		
		var today = moment();
		var yesterday = moment().subtract(1, 'days');
		
		Registro.find({data: {"$gte": yesterday, "$lt": moment(req.param("dateOut"))}}, 
		null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err,req,res);
			if (registros) {
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						req.session.cod_leito = req.param("cod_leito");
						req.session.dateOut = req.param("dateOut");
						req.session.cadastro_id = req.param("_id");
						
						var livre = [];
						for (var i = 0; i < leitos.length; i++){
							livre[i] = true;
						}
						
						for (var i = 0; i < registros.length; i++){
							for (var j = 0; j < leitos.length; j++){
								if (registros[i].estado[j] != 'livre' || leitos[j].ocupabilidade == 'inocupavel'){
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
						
						res.render('home_alocacao_geral', {leitos: leitos_,
						num_hospede: 1, endereco: "recepcao/mudanca/alocacao"});
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
	});
	
	// /HOME/RECEPCAO/MUDANCA/ALOCACAO
	router.get('/home/recepcao/mudanca/alocacao', isAuthenticated, isRecepcao, function(req,res){
		res.redirect('/home/recepcao/mudanca');
	});
	
	router.post('/home/recepcao/mudanca/alocacao', isAuthenticated, isRecepcao, function(req,res){
		
		/*
		var today = moment();
		var yesterday = moment().subtract(1, 'days');
		var before_yesterday = moment().subtract(2, 'days');*/
		
		Registro.find({data: {"$gte": moment().subtract(1, 'days'), "$lt": moment(req.session.dateOut)}}
		, null, {sort: 'data'}, function(err, registros) {
			
			if (err) return handleError(err,req,res);
			if (registros){
				
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						var leitos_alocados = 0;
						for (var j = 0; j < leitos.length; ++j){
							if (req.param(leitos[j].cod_leito)){
								leitos_alocados++;
							}
						}
						
						if (leitos_alocados != 1){
							req.flash('message', "É necessário selecionar a quantidade correta de leitos");
							res.redirect('/home');;
						}
						
						else {
							
							var index_leito_antigo;
							var index_leito_novo;
							
							for (var j = 0; j < leitos.length; ++j){
								if (req.param(leitos[j].cod_leito)){
									index_leito_novo = j;
								}
								if (leitos[j].cod_leito == req.session.cod_leito){
									index_leito_antigo = j;
									leitos[j].limpeza = "sujo";
								}
							}
							
							for (var i = 0; i < registros.length; ++i){
								registros[i].estado.splice(index_leito_novo, 1, 'ocupado');
								registros[i].ocupante.splice(index_leito_novo, 1, registros[i].ocupante[index_leito_antigo]);
								registros[i].estado.splice(index_leito_antigo, 1, 'livre');
								registros[i].ocupante.splice(index_leito_antigo, 1, "");
							}
							
							for (var i = 0; i < registros.length; ++i){
								registros[i].save(function (err) {
									if (err) return handleError(err,req,res);
								});
							}
							
							leitos[index_leito_antigo].save(function (err) {
								if (err) return handleError(err,req,res);
							});
							
							Cadastro.findOne({_id: req.session.cadastro_id},function(err, cadastro) {

								if (err) return handleError(err,req,res);
								if (cadastro){
									cadastro.leito = leitos[index_leito_novo].cod_leito;
									cadastro.save(function (err) {
										if (err) return handleError(err,req,res);
									});
								
							
									Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
										if (err) return handleError(err,req,res);
										if (log){
											/*
											log.log.push("[" + moment().format("HH:mm:ss") + "]" +
											" RECEPÇÃO: " +
											"realizada a MUDANÇA do hospede " + registros[0].ocupante[index_leito_novo].name +
											", do leito " + leitos[index_leito_antigo].cod_leito +
											" para o leito " + leitos[index_leito_novo].cod_leito +
											", do dia " + moment().format("DD/MM/YY") +
											" ao dia " + moment(registros[0].ocupante[index_leito_novo].dateOut).format("DD/MM/YY") +
											". Usuário: " + req.user.username);*/
											
											log.modulo.push("Recepcao");
											log.horario.push(moment().format("HH:mm:ss"));
											log.log.push("Mudança do leito "
											+ leitos[index_leito_antigo].cod_leito +
											" para o leito " +
											leitos[index_leito_novo].cod_leito
											);
											log.cadastro.push(cadastro.name);
											log.cadastro_id.push(cadastro._id);
											log.usuario.push(req.user.username);
											
											log.save(function (err) {
											if (err) return handleError(err,req,res);
										});
										}
										else{
											req.flash('message', 'É necessário criar o Log');
											res.redirect('/home');
										}
									});
									
								}
								else {
									req.flash('message', 'Cadastro não existe');
									res.redirect('/home');
								}
							});
							
							req.flash('message', 'Mudança efetuada com sucesso');
							res.redirect('/home/recepcao/mudanca');
						}
						
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

}
	
{ // RESERVA
	// /HOME/RESERVA
	router.get('/home/reserva', isAuthenticated, isReserva, function(req, res){
		Cadastro.find({'estado': "solicitacao"}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				res.render('home_reserva', {cadastros: cadastros, message: req.flash('message')});
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
			
				Registro.find({data: {"$gte": moment(cadastro.dateIn), "$lt": moment(cadastro.dateOut)}}, 
				null, {sort: 'data'}, function(err, registros) {
					if (err) return handleError(err,req,res);
					if (registros) {
						Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
							if (err) return handleError(err,req,res);
							if (leitos){
								
								var livre = [];
								for (var i = 0; i < leitos.length; i++){
									livre[i] = true;
								}
								
								for (var i = 0; i < registros.length; i++){
									for (var j = 0; j < leitos.length; j++){
										if (registros[i].estado[j] != 'livre' || leitos[j].ocupabilidade == 'inocupavel'){
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
								
								res.render('home_alocacao_geral', {leitos: leitos_,
								num_hospede: (cadastro.acompanhante+1), endereco: "reserva/alocacao"});
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
	
	// /HOME/RESERVA/ALOCACAO
	router.get('/home/reserva/alocacao', isAuthenticated, isReserva, function(req, res){
		res.redirect('/home/reserva');
	});
	
	router.post('/home/reserva/alocacao', isAuthenticated, isReserva, function(req, res){
		
		Registro.find({data: {"$gte": moment(req.session.cadastro.dateIn), "$lt": moment(req.session.cadastro.dateOut)}}
		, null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err,req,res); 
			if (registros){
				
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						
						var leitos_alocados = 0;
						for (var j = 0; j < leitos.length; ++j){
							if (req.param(leitos[j].cod_leito)){
								leitos_alocados++;
							}
						}
						
						
						if (leitos_alocados != (req.session.cadastro.acompanhante+1)){
							req.flash('message', "É necessário selecionar a quantidade correta de leitos");
							res.redirect('/home');;
						}
						else {
							
							Cadastro.remove({'_id': req.session.cadastro._id}, function(err) {
								if (err) return handleError(err,req,res);
							
							
								Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
									if (err) return handleError(err,req,res);
									if (log){
										
										var acompanhante = false;
										for (var j = 0; j < leitos.length; j++){
											if (req.param(leitos[j].cod_leito)){
												
												
												var newCadastro = new Cadastro(req.session.cadastro);
												if (acompanhante){
													newCadastro._id = mongoose.Types.ObjectId();
												}
												newCadastro.estado = "reservado";
												newCadastro.leito = leitos[j].cod_leito;
												newCadastro.save(function (err) {
													if (err) return handleError(err,req,res);
												});
												
												
												for (var i = 0; i < registros.length; i++){
													registros[i].estado.splice(j, 1, 'reservado');
													registros[i].ocupante.splice(j, 1, newCadastro);
												}
												
												//console.log(newCadastro);
												// LOG
												
												log.modulo.push("Reserva");
												log.horario.push(moment().format("HH:mm:ss"));
												log.log.push("Aceita a reserva no leito "
												+ leitos[j].cod_leito);
												log.cadastro.push(newCadastro.name);
												log.cadastro_id.push(newCadastro._id);
												log.usuario.push(req.user.username);
												
												acompanhante = true;
											}
										}
										
										
										
										
										for (var i = 0; i < registros.length; i++){
											registros[i].save(function (err) {
												if (err) return handleError(err,req,res);
											});
										}
										
										log.save(function (err) {
											if (err) return handleError(err,req,res);
										});
										
										req.flash('message', 'Reserva realizada com sucesso');
										res.redirect('/home/reserva');
										
									}
									else{
										req.flash('message', 'É necessário criar o Log');
										res.redirect('/home');
									}
								});
							});
							
						}
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

	// /HOME/RESERVA/CANCELAR
	
	router.get('/home/reserva/cancelar', isAuthenticated, isReserva, function(req, res){
		res.redirect('/home/reserva');
	});
	
	router.post('/home/reserva/cancelar', isAuthenticated, isReserva, function(req, res){
		Cadastro.findOne({'_id': req.param('_id')}, function(err, cadastro) {
			if (err) return handleError(err,req,res);
			if (cadastro){
				cadastro.estado = "cancelado";
				cadastro.save(function(err){
					if (err) return handleError(err,req,res);
				});
				
				Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
					if (err) return handleError(err,req,res);
					if (log){
						/*
						log.log.push("[" + moment().format("HH:mm:ss") + "]" +
						"RECEPÇÃO: " +
						"CANCELADO O CHECK-IN do hospede " + registros[0].ocupante[index].name +
						", do dia " + moment(registros[0].ocupante[index].dateIn).format("DD/MM/YY") +
						" ao dia " + moment(registros[0].ocupante[index].dateOut).format("DD/MM/YY") +
						" no leito " + leitos[index].cod_leito +
						". Usuário: " + req.user.username);*/
						
						log.modulo.push("Reserva");
						log.horario.push(moment().format("HH:mm:ss"));
						log.log.push("Cancelada a solicitação de reserva");
						log.cadastro.push(cadastro.name);
						log.cadastro_id.push(cadastro._id);
						log.usuario.push(req.user.username);
						
						log.save(function (err) {
							if (err) return handleError(err,req,res);
						});
					}
					else{
						req.flash('message', 'É necessário criar o Log');
						res.redirect('/home');
					}
				});
				
				
			}
			else {
				req.flash('message', "Não existe Cadastro");
				res.redirect('/home');
			}
		});
		
		req.flash('message', "Solicitação de reserva cancelada");
		res.redirect('/home/reserva');;
	});
	
}
	
{ // LAVANDERIA Adicionar LOG
	// /HOME /LAVANDERIA
	router.get('/home/lavanderia/folha', isAuthenticated, function(req, res){
		res.render('home_lavanderia_folha', {descricoes: desc_itens_lavanderia, inserido: false});
	});
	
	router.post('/home/lavanderia/folha', isAuthenticated, function(req, res){
		var n_entrega = new Array();
		var n_coleta = new Array();

		var newFolha = new Folha();
		newFolha.data_coleta = req.param('dataColeta'); 
		newFolha.data_entrega = req.param('dataEntrega'); 

		for(var i = 0; i < 13; i++){
			n_entrega.push(req.param('folha_entrega_item_'+i));
			n_coleta.push(req.param('folha_coleta_item_'+i));
		}
		newFolha.n_entrega = n_entrega;
		newFolha.n_coleta = n_coleta;
		newFolha.nome_fiscal = req.param('nomeFiscal'); 
		newFolha.save(function (err) {
			if (err){
				return handleError(err,req,res);
			}
		});
		res.render('home_lavanderia_folha', {descricoes: desc_itens_lavanderia, inserido: true});
	});
	
	router.get('/home/lavanderia/gerencia', isAuthenticated, function(req, res){
		res.render('home_lavanderia_gerencia');
	});

	router.get('/home/lavanderia/lista', isAuthenticated, function(req, res){
		Folha.find({}, null, {sort: 'data_coleta'}, function(err, folhas) {
			if (err) return handleError(err,req,res);
			if (folhas){
				res.render('home_lavanderia_lista', {folhas: folhas});
			}
			else {
				req.flash('message', "Ocorreu um erro ao extrair a lista de folhas de lavanderia do banco de dados");
				res.redirect('/home');
			}
		});	
	});

}
	
{ // MANUTENCAO Adicionar LOG
	// /HOME/MANUTENCAO/QUADRO
	router.get('/home/manutencao/quadro', isAuthenticated, isManutencao, function(req, res){
		Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
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
	
	router.post('/home/manutencao/quadro/alterar', isAuthenticated, isManutencao, function(req, res){
		console.log("post /HOME/MANUTENCAO/QUADRO/ALTERAR");

		Leito.findOne({cod_leito: req.param('leito_alterado')}, function(err, leito) {
			if (err) return handleError(err,req,res);
			if (leito){
				if(req.param('desc_pane_adc') != undefined){
					leito.manutencao.push(req.param('desc_pane_adc'));
					leito.save(function (err) {
						if (err){
							return handleError(err,req,res);
						}
					});
					res.redirect('/home/manutencao/quadro/alterar?leito_alterado='+req.param('leito_alterado'));
					return;
				}
				if(req.param('ocup') != undefined){
					leito.ocupabilidade = req.param('ocup');
					leito.save(function (err) {
						if (err){
							return handleError(err,req,res);
						}
					});
					res.redirect('/home/manutencao/quadro/alterar?leito_alterado='+req.param('leito_alterado'));
					return;
				}
				var newManutencao = [];
				for(var i = 0; i < leito.manutencao.length; i++){
					if(req.param('idx_pane_rem_'+i) != '1'){ //manter essa pane
						newManutencao.push(leito.manutencao[i]);
					}
				}
				leito.manutencao = newManutencao.slice(0); //clonando array
				leito.save(function (err) {
					if (err){
						return handleError(err,req,res);
					}
				});
				res.redirect('/home/manutencao/quadro/alterar?leito_alterado='+req.param('leito_alterado'));
				return;
				
			}
			else {
				req.flash('message', "Os Leito procurado não foi encontrado");
				res.redirect('/home/manutencao/quadro');
			}
		});
	});

	// /HOME/MANUTENCAO/LIMPEZA
	router.get('/home/manutencao/limpeza', isAuthenticated, isManutencao, function(req, res){

		Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
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

	router.post('/home/manutencao/limpeza', isAuthenticated, isManutencao, function(req, res){
		Leito.findOne({cod_leito: req.param('leito_alterado')}, function(err, leito) {
			if (err) return handleError(err,req,res);
			if (leito){
				if(req.param('new_value') != undefined){
					leito.limpeza = req.param('new_value');
					leito.save(function (err) {
						if (err){
							return handleError(err,req,res);
						}
					});
				}
			}
			else {
				req.flash('message', "Os Leito procurado não foi encontrado");
			}
			res.redirect('/home/manutencao/limpeza');
		});
	});
}

{ // FINANCEIRO
	// /HOME/FINANCEIRO
	router.get('/home/financeiro', isAuthenticated, isFinanceiro, function(req, res){
		Financeiro.findOne({}, function(err, financeiro) {
			if (err) return handleError(err,req,res);
			if (financeiro){
				res.render('home_financeiro', {financeiro: financeiro});
			}
			else {
				req.flash('message', "O Financeiro ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
}

{ // GERENTE Adicionar LOG

	// /HOME/GERENTE
	router.get('/home/gerente', isAuthenticated, isGerente, function(req, res){
		res.render('home_gerente', {message: req.flash('message')});
	});
	
	// /HOME/GERENTE/LOG
	router.get('/home/gerente/log', isAuthenticated, isGerente, function(req, res){
		var date = moment();
		var dateAux = moment(date).subtract(1, 'days');
		
		
		if (req.param('date') != undefined){
			date = moment(req.param('date'));
			dateAux = moment(date);
		}
		
		Log.findOne({data: {"$gte": dateAux, "$lte": date}}, function(err, log) {
			res.render("home_gerente_log", {log: log});
		});
	});
	
	// /HOME/GERENTE/PERMISSAO
	router.get('/home/gerente/permissao', isAuthenticated, isGerente, function(req, res){
		User.find({username: {$ne: 'admin'}}, function(err, users) {
			if (err) return handleError(err,req,res);
			if (users){
				res.render('home_gerente_permissao', {users: users, dic: dicionario_permissao });
			}
			else {
				req.flash('message', "Nenhum usuário existente");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/gerente/permissao', isAuthenticated, isGerente, function(req, res){
		
		
		User.findOne({ 'username' :  req.body.bizu }, function(err, user) {
			if (err) return handleError(err,req,res);
			
			if (user) {
				user.permissao = [req.body.Recepcao, req.body.Reserva, req.body.Lavanderia, req.body.Manutencao, req.body.Financeiro, req.body.Gerente];
				//console.log(user.permissao);
				user.save(function (err) {
					if (err) return handleError(err,req,res);
				});
				req.flash('message', "Permissão alterada com sucesso");
				res.redirect('/home');
			}
			else {
				req.flash('message', "O usuário não existe");
				res.redirect('/home');
			}
        });
		
		
	});
	
	// /HOME/GERENTE/SIGNUP
	router.get('/home/gerente/signup', isAuthenticated, isGerente, function(req, res){
		res.render('home_gerente_signup',{message: req.flash('message')});
	});

	router.post('/home/gerente/signup', isAuthenticated, isGerente, function(req, res){
		User.findOne({ 'username' :  req.param('username') }, function(err, user) {
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
			
			newUser.save(function (err) {
				if (err) return handleError(err,req,res);
				
			});
			req.flash('message', "Usuário criado com sucesso.");
			res.redirect('/home');
        });
		
	});
	
	// /HOME/REGISTRO
	
	router.get('/home/registro', isAuthenticated, function(req,res){
		var dataIn = moment().subtract(1, 'days');
		var dataOut = moment(dataIn).add(1, 'days');
		if (req.param('dataIn') != undefined){
			dataIn = moment(req.param('dataIn'));
			dataOut = moment(dataIn);
		}
		if (req.param('dataOut') != undefined && req.param('dataOut')){
			dataOut = moment(req.param('dataOut'));
		}
		
		Registro.find({data: {"$gte": dataIn, "$lte": dataOut}}
		, null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err, req, res);
			if (registros){
				
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						var leitos_livres = [];
						var leitos_ocupados = [];
						var leitos_reservados = [];
						var leitos_manutencao = 0;
						var leitos_total = leitos.length;
						
						for (var i = 0; i < registros.length; i++){
							leitos_livres[i] = 0;
							leitos_reservados[i] = 0;
							leitos_ocupados[i] = 0;
						}
						
						for (var i = 0; i < registros.length; i++){
							for (var j = 0; j < leitos.length; j++){
								if (registros[i].estado[j] == 'livre' 
								&& leitos[j].ocupabilidade != 'inocupavel'){
									leitos_livres[i]++;
								}
								if (registros[i].estado[j] == 'ocupado'){
									leitos_ocupados[i]++;
								}
								if (registros[i].estado[j] == 'reservado'){
									leitos_reservados[i]++;
								}
							}
						}
						
						for (var j = 0; j < leitos.length; j++){
							if (leitos[j].ocupabilidade != 'normal'){
								leitos_manutencao++;
							}
						}
						
						res.render('home_registro', 
						{user: req.user, leitos: leitos, manutencao: leitos_manutencao, total: leitos_total,
						registros: registros, livres: leitos_livres, ocupados: leitos_ocupados,
						reservados: leitos_reservados});
						
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

	router.get('/home/registro/cadastro', isAuthenticated, function(req,res){

		if (req.param('_id') == undefined){
			req.flash('message', 'O cadastro procurado não foi encontrado');
			res.redirect('/home');
		}
		
		Cadastro.findOne({_id: req.param('_id')},function(err, cadastro) {
			if (err) return handleError(err,req,res);
			if (cadastro){
				
				res.render('home_registro_cadastro', { cadastro: cadastro });
			}
			else {
				req.flash('message', "Cadastro não existente");
				res.redirect('/home');
			}
		
		});
	});
	
	router.get('/home/registro/lista', isAuthenticated, function(req,res){

		if (req.param('_id') == undefined){
			req.flash('message', 'A folha de lavanderia procurada não foi encontrada');
			res.redirect('/home');
		}
		
		Folha.findOne({_id: req.param('_id')},function(err, folha) {
			if (err) return handleError(err,req,res);
			if (folha){
				res.render('home_registro_lista', { folha: folha, descricoes: desc_itens_lavanderia});
			}
			else {
				req.flash('message', "Folha não existente");
				res.redirect('/home');
			}
		});
	});
	
	router.get('/home/cadastro', isAuthenticated, function(req,res){
		Cadastro.find({}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				res.render('home_cadastro', {cadastros: cadastros});
			}
			else{
				req.flash('message', 'Não há cadastros');
				res.redirect('/home');
			}
		});
	});
}

{ // DEBUG Delete/Criar
	
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
		Financeiro.remove({}, function(err) { 
			console.log('Financeiro removed')
		});
		Log.remove({}, function(err){
			console.log("Log removed");
		});
		
		res.redirect('/');
	});
	
	// CRIAR
	router.get('/criar', function(req,res){
		res.redirect('/criar/admin');
	});

	router.get('/criar/admin', function(req, res){
		
		User.findOne({ 'username' :  'admin' }, function(err, user) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err,req,res);
			}
			if (user){
				user.password = createHash('admin');
				user.save(function(err){
					if (err) return handleError(err,req,res);
				});
				return;
			}
			var newUser = new User();
			
			newUser.username = 'admin';
			newUser.password = createHash('admin');
			newUser.permissao = [true, true, true, true, true, true];
			
			newUser.save(function (err) {
				if (err) return handleError(err,req,res);
			});
        });
		res.redirect('/criar/visitante');
		
	});
	
	router.get('/criar/visitante', function(req, res){
		
		User.findOne({ 'username' :  'visitante' }, function(err, user) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err,req,res);
			}
			if (user){
				user.password = createHash('visitante');
				user.save(function(err){
					if (err) return handleError(err,req,res);
				});
				return;
			}
			var newUser = new User();
			
			newUser.username = 'visitante';
			newUser.password = createHash('visitante');
			newUser.permissao = [false, false, false, false, false, false];
			
			newUser.save(function (err) {
				if (err) return handleError(err,req,res);
			});
        });
		res.redirect('/criar/financeiro');
		
	});
		
	router.get('/criar/financeiro', function(req, res){
		var newFinanceiro = new Financeiro();
		newFinanceiro.gasto = 0;
		newFinanceiro.ganho = 0;
		newFinanceiro.save(function (err) {
			if (err) return handleError(err,req,res);
		});
		res.redirect('/criar/leitos');
		
	});
	
	router.get('/criar/leitos', function(req,res){
		var newLeito;
		//A
		
		for(var i = 1; i <= 9; i++){
			newLeito = createLeito(("A" + '0' + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("A" + '0'+ i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		
		for(var i = 10; i <= 18; i++){
			newLeito = createLeito(("A" + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("A" + i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		
		newLeito = createLeito("A19a");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("A19b");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("A19c");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("A20a");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});		
		newLeito = createLeito("A21a");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});		


		//B

		newLeito = createLeito("B01a");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		for(var i = 2; i <= 9; i++){
			newLeito = createLeito(("B" + '0' + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("B" + '0' + i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		for(var i = 10; i <= 19; i++){
			newLeito = createLeito(("B" + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("B" + i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		
		

		//C

		for(var i = 1; i <= 9; i++){
			newLeito = createLeito(("C" + '0' + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("C" + '0' + i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("C" + '0' + i + "c"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		for(var i = 10; i <= 25; i++){
			newLeito = createLeito(("C" + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("C" + i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("C" + i + "c"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		
		
		for(var i = 26; i <= 35; i++){
			newLeito = createLeito(("C" + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("C" + i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}

		//D
		for(var i = 101; i <= 119; i++){
			newLeito = createLeito(("D" + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "c"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "d"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		newLeito = createLeito(("D200a"));
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito(("D200b"));
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito(("D200c"));
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito(("D200d"));
		newLeito.save(function(err){
			if(err) return handleErr200		});
		for(var i = 202; i <= 221; i++){
			newLeito = createLeito(("D" + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "c"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "d"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		for(var i = 222; i <= 223; i++){
			newLeito = createLeito(("D" + i + "a"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "b"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "c"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "d"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito(("D" + i + "e"));
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		setTimeout(function () {res.redirect('/criar/registro')}, 1000);
	});
	
	router.get('/criar/registro', function(req, res){
		Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
			if (err) return handleError(err,req,res);
			if (leitos){
				var dataInicial = moment('2017-01-01');
				var dataFinal = moment('2018-01-01');
				var proximoDia = moment(dataInicial);
				
				while (proximoDia < dataFinal){
					var newRegistro = new Registro();
					newRegistro.data = moment(proximoDia);
					newRegistro.estado = [];
					newRegistro.ocupante = [];
					newRegistro.log = [];
					newRegistro.ganho = 0;
					newRegistro.gasto = 0;
					for (var i = 0; i < leitos.length; i++){
						newRegistro.estado[newRegistro.estado.length] = "livre";
						newRegistro.ocupante[newRegistro.ocupante.length] = "";
					}
					newRegistro.save(function (err) {
						if (err) return handleError(err,req,res);	
					});
					proximoDia.add(1, 'days')
				}
				res.redirect('/criar/log');
			}
			else {
				req.flash('message', "Os Leitos ainda não foram criados");
				res.redirect('/');
			}
		});
	});
	
	router.get('/criar/log', function(req, res){
		Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
			if (err) return handleError(err,req,res);
			if (leitos){
				var dataInicial = moment('2017-01-01');
				var dataFinal = moment('2018-01-01');
				var proximoDia = moment(dataInicial);
				
				while (proximoDia < dataFinal){
					var newLog = new Log();
					newLog.data = moment(proximoDia);
					newLog.modulo = [];
					newLog.log = [];
					newLog.horario = [];
					newLog.cadastro = [];
					newLog.cadastro_id = [];
					newLog.usuario = [];
					newLog.ganho = 0;
					newLog.gasto = 0;
					newLog.save(function (err) {
						if (err) return handleError(err,req,res);	
					});
					proximoDia.add(1, 'days')
				}
				res.redirect('/');
			}
			else {
				req.flash('message', "Os Leitos ainda não foram criados");
				res.redirect('/');
			}
		});
	});
}
	
	return router;
}

{ // Functions

function createLeito(cod_leito){
	var ret = new Leito();
	ret.cod_leito = cod_leito;
	ret.limpeza = "limpo";
	ret.ocupabilidade = "normal";
	ret.manutencao = [];
	ret.ocupante = [];
	return ret;
}

function handleError(err,req,res){
	console.log(err);
	res.send(err);
}

// Está sem nenhum autenticação para poder debugar mais fácil.

var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	
	//debugar
	
	if (debug){
		req.user = new User();
		req.user.username = "teste";
		return next();
	}
	
	
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/login');
}

var isRecepcao = function (req, res, next) {
	if (debug) return next();
	if (req.user.permissao[0] == true){
		return next();
	}
	res.redirect('/home');
}

var isReserva = function (req, res, next) {
	if (debug) return next();
	if (req.user.permissao[1] == true){
		return next();
	}
	res.redirect('/home');
}

var isManutencao = function (req, res, next) {
	if (debug) return next();
	if (req.user.permissao[3] == true){
		return next();
	}
	res.redirect('/home');
}

var isFinanceiro = function (req, res, next) {
	if (debug) return next();
	if (req.user.permissao[4] == true){
		return next();
	}
	res.redirect('/home');
}

var isGerente = function (req, res, next) {
	if (debug) return next();
	if (req.user.permissao[5] == true){
		return next();
	}
	res.redirect('/home');
}
}

{ // Variables

var createHash = function(password){
	return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

var dicionario_permissao = {0: "Recepcao", 1: "Reserva", 2: "Lavanderia", 3:"Manutencao",4: "Financeiro",5: "Gerente"};

var dicionario_posto_valor = {'Almirante-de-Esquadra': 60,
'General-de-Exército': 60,
'Tenente-Brigadeiro-do-Ar': 60,
'Vice-Almirante': 60,
'General-de-Divisão': 60,
'Major-Brigadeiro-do-Ar': 60,
'Contra-Almirante': 60,
'General-de-Brigada': 60,
'Brigadeiro-do-Ar': 60,
'Capitão-de-Mar-e-Guerra': 60,
'Coronel': 60,
'Capitão-de-Fragata': 60,
'Tenente Coronel': 60,
'Capitão-de-Corveta': 50,
'Major': 50,
'Capitão-Tenente': 40,
'Capitão': 40,
'1o Tenente': 40,
'2o Tenente': 40,
'Guarda-Marinha': 40,
'Aspirante': 40,
'Cadete': 40,
'Suboficial': 40,
'SubTenente': 40,
'1o Sargento': 40,
'2o Sargento': 40,
'3o Sargento': 40,
'Cabo': 30,
'Civil': 50};

var desc_itens_lavanderia = [
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

var debug = false;

}
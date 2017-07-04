var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Cadastro = require('../models/cadastro');
var Registro = require('../models/registro');
var Leito = require('../models/leito');
var Financeiro = require('../models/financeiro');
var bCrypt = require('bcrypt-nodejs');
var moment = require('moment');

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
		newCadastro.acompanhante = req.param('acompanhante');
		newCadastro.posto = req.param('posto');
		if (moment(newCadastro.dateIn) < moment(newCadastro.dateOut)){

			newCadastro.save(function (err, updatedCadastro) {
				if (err) return handleError(err,req,res);
			});
			req.flash('message', "Solicitação de reserva realizado com sucesso, aguarde confirmação por e-mail");
			//res.redirect('/');
			res.redirect('/home');
			
		}
		else {
			req.flash('message', "Data de saida deve ser maior que data de entrada");
			res.redirect('/');
		}
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
		//console.log(moment('2017-07-02T12'));
		//console.log(moment());
		if (req.user){
			if (req.user.username == 'visitante'){
				//redirecionar para a página lá que vê coisas
				res.redirect('/home/gerente/registro/estado');
			}
			else{
				console.log('batata');
			}
		}
		
		res.render('home', { user: req.user, message: req.flash('message')});
	});
	
	
	// /HOME/LOGOUT
	router.get('/home/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	
	
	// /HOME/RECEPCAO/CHECKIN
	router.get('/home/recepcao/checkin', isAuthenticated, isRecepcao, function(req,res){
		var today = moment();
		var yesterday = moment().subtract(1, 'days');
		
		Registro.findOne({data: {"$gte": yesterday, "$lte": today}}, function(err, registro) {	
			if (err) return handleError(err,req,res);
			if (registro){
				
				var cadastros = [];
				var leitos_reservados = [];
				var leitos_limpeza = [];

				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						for (var i = 0; i < leitos.length; i++){
							if (registro.estado[i] == 'reservado'){
								cadastros[cadastros.length] = registro.ocupante[i];
								leitos_reservados[leitos_reservados.length] = leitos[i].cod_leito;
								leitos_limpeza[leitos_limpeza.length] = leitos[i].limpeza;
							} 
						}
						/*
						res.render('home_recepcao_geral', {cadastros: cadastros, leitos: leitos_reservados
						, titulo: "Realizar Check-In", endereco: "checkin", botao: "Check-in"});
						*/
						res.render('home_recepcao_geral', {cadastros: cadastros, leitos: leitos_reservados
						, titulo: "Realizar Check-In", endereco: "checkin", botao: "Check-in", limpeza: leitos_limpeza});
						
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

		Registro.find({data: {"$gte": moment(req.param('dateIn')), "$lt": moment(req.param('dateOut'))}}
		, null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err,req,res);
			if (registros){
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						for (var i = 0; i < registros.length; ++i){
							for (var j = 0; j < leitos.length; ++j){
								if (leitos[j].cod_leito == req.param('cod_leito')){
									registros[i].estado.splice(j, 1, 'ocupado');
									var cadastro = registros[i].ocupante[j];
									cadastro.checkIn = moment().format();
									registros[i].ocupante.splice(j, 1, cadastro);
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
	
	// /HOME/RECEPCAO/CHECKIN/CANCELAR
	
	router.get('/home/recepcao/checkin/cancelar', isAuthenticated, isRecepcao, function(req,res){
		
		var today = moment();
		var yesterday = moment().subtract(1, 'days');
		
		Registro.findOne({data: {"$gte": yesterday, "$lte": today}}, function(err, registro) {	
			if (err) return handleError(err,req,res);
			if (registro){
				
				var cadastros = [];
				var leitos_reservados = [];
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						for (var i = 0; i < leitos.length; i++){
							if (registro.estado[i] == 'reservado'){
								
								var dateIn = moment(registro.ocupante[i].dateIn);
								
								if (dateIn < yesterday){
									cadastros[cadastros.length] = registro.ocupante[i];
									leitos_reservados[leitos_reservados.length] = leitos[i].cod_leito;
								}
								
							}
						}
						res.render('home_recepcao_geral', {cadastros: cadastros, leitos: leitos_reservados,
						titulo: "Cancelar Check-In", endereco: "checkin/cancelar", botao: "Cancelar"});
						
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
	
	router.post('/home/recepcao/checkin/cancelar', isAuthenticated, isRecepcao, function(req,res){
		
		Registro.find({data: {"$gte": moment(req.param('dateIn')), "$lt": moment(req.param('dateOut'))}}
		, null, {sort: 'data'}, function(err, registros) {
			
			if (err) return handleError(err,req,res);
			if (registros){
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						for (var i = 0; i < registros.length; ++i){
							for (var j = 0; j < leitos.length; ++j){
								if (leitos[j].cod_leito == req.param('cod_leito')){
									registros[i].estado.splice(j, 1, 'livre');
								}
							}
						}
						
						for (var i = 0; i < registros.length; ++i){
							registros[i].save(function (err, updatedRegistros) {
								if (err) return handleError(err,req,res);
							});
						}
						
						res.redirect('/home/recepcao/checkin/cancelar');
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
	
	router.get('/home/recepcao/checkout', isAuthenticated, isRecepcao, function(req,res){
		
		var today = moment();
		var yesterday = moment().subtract(1, 'days');
		var before_yesterday = moment().subtract(2, 'days');
		
		Registro.findOne({data: {"$gte": before_yesterday, "$lte": yesterday}}, function(err, registro) {

			if (err) return handleError(err,req,res);
			if (registro){
				
				var cadastros = [];
				var leitos_reservados = [];
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						for (var i = 0; i < leitos.length; i++){
							// *
							if (registro.estado[i] == 'ocupado' /*|| registro.estado[i] == 'reservado'*/){
								
								var dateOut = moment(registro.ocupante[i].dateOut);
								
								if (dateOut < today && dateOut > yesterday){
									cadastros[cadastros.length] = registro.ocupante[i];
									leitos_reservados[leitos_reservados.length] = leitos[i].cod_leito;
								}
							}
						}
						res.render('home_recepcao_geral', {cadastros: cadastros, leitos: leitos_reservados,
						titulo: "Realizar Check-Out", endereco: "checkout", botao: "Check-out"});
						
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
	
	router.post('/home/recepcao/checkout', isAuthenticated, isRecepcao, function(req,res){
		
		var today = moment();
		var yesterday = moment().subtract(1, 'days');
		var before_yesterday = moment().subtract(2, 'days');
		
		Registro.find({data: {"$gte": before_yesterday, "$lte": today}}
		, null, {sort: 'data'}, function(err, registro) {
			
			if (err) return handleError(err,req,res);
			if (registro){
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						Financeiro.findOne({}, function(err, financeiro) {
							if (err) return handleError(err,req,res);
							if (financeiro){
								var index = 0;
								for (var j = 0; j < leitos.length; ++j){
									if (leitos[j].cod_leito == req.param('cod_leito')){
										leitos[j].limpeza = "sujo";
										registro[0].estado.splice(j, 1, 'checkout');
										index = j;
									}
								}
								
								var ocupante = registro[0].ocupante[index];
								ocupante.checkOut = moment().format();
								registro[0].ocupante.splice(index, 1, ocupante);
								
								//console.log("CheckIn : " + registro[0].ocupante[index].checkIn);
								//console.log("CheckOut :" + registro[0].ocupante[index].checkOut);
								
								var dateIn = moment(registro[0].ocupante[index].checkIn);
								var dateOut = moment(registro[0].ocupante[index].checkOut);
								var hours = dateOut.diff(dateIn,"hours");
								custo = hours*registro[0].ocupante[index].posto/24;
								
								
								registro[1].ganho += custo;
								financeiro.ganho += custo;
								
								for (var i = 0; i < registro.length; i++){
									registro[i].save(function (err, updatedRegistros) {
										if (err) return handleError(err,req,res);
									});
								}
								
								leitos[index].save(function (err, updatedLeitos) {
									if (err) return handleError(err,req,res);
								});
								
								financeiro.save(function (err, updatedFinanceiro) {
									if (err) return handleError(err,req,res);
								});
								
								res.render('home_recepcao_checkout_dados', {cadastro: registro[0].ocupante[index], custo: custo, hours: hours%24, days: parseInt(hours/24)});
							}
							else {
								req.flash('message', 'É necessário criar o Financeiro');
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
	
	// /HOME/RECEPCAO/CHECKOUT/ANTECIPADO *
	
	router.get('/home/recepcao/checkout/antecipado', isAuthenticated, isRecepcao, function(req,res){
		
		var today = moment();
		var yesterday = moment().subtract(1, 'days');
		var before_yesterday = moment().subtract(2, 'days');
		
		Registro.findOne({data: {"$gte": yesterday, "$lte": today}}, function(err, registro) {

			if (err) return handleError(err,req,res);
			if (registro){
				
				var cadastros = [];
				var leitos_reservados = [];
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						for (var i = 0; i < leitos.length; i++){
							if (registro.estado[i] == 'ocupado'){
								cadastros[cadastros.length] = registro.ocupante[i];
								leitos_reservados[leitos_reservados.length] = leitos[i].cod_leito;
							}
						}
						res.render('home_recepcao_geral', {cadastros: cadastros, leitos: leitos_reservados,
						titulo: "Realizar Check-Out Antecipado", endereco: "checkout/antecipado", botao: "Check-out antecipado"});
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
	
	router.post('/home/recepcao/checkout/antecipado', isAuthenticated, isRecepcao, function(req,res){
		
		var today = moment();
		var yesterday = moment().subtract(1, 'days');
		var before_yesterday = moment().subtract(2, 'days');
		
		Registro.find({data: {"$gte": before_yesterday, "$lt": moment(req.param('dateOut'))}}
		, null, {sort: 'data'}, function(err, registro) {
			
			if (err) return handleError(err,req,res);
			if (registro){
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						Financeiro.findOne({}, function(err, financeiro) {
							if (err) return handleError(err,req,res);
							if (financeiro){
								var index = 0;
								for (var i = 0; i < registro.length; i++){
									for (var j = 0; j < leitos.length; ++j){
										if (leitos[j].cod_leito == req.param('cod_leito')){
											if (i == 0){
												if (registro[i].estado[j] == 'ocupado'){
													registro[i].estado.splice(j, 1, 'checkout');
												}
												leitos[j].limpeza = "sujo";
												index = j;
											}
											else {
												registro[i].estado.splice(j, 1, 'livre');
											}
										}
									}
								}
								
								var ocupante = registro[1].ocupante[index];
								ocupante.checkOut = moment().format();
								registro[1].ocupante.splice(index, 1, ocupante);
								
								//console.log("CheckIn : " + registro[1].ocupante[index].checkIn);
								//console.log("CheckOut :" + registro[1].ocupante[index].checkOut);
								
								var dateIn = moment(registro[1].ocupante[index].checkIn);
								var dateOut = moment(registro[1].ocupante[index].checkOut);
								var hours = dateOut.diff(dateIn,"hours");
								custo = hours*registro[1].ocupante[index].posto/24;
								
								
								registro[1].ganho += custo;
								financeiro.ganho += custo;
								
								for (var i = 0; i < registro.length; i++){
									registro[i].save(function (err, updatedRegistros) {
										if (err) return handleError(err,req,res);
									});
								}
								
								leitos[index].save(function (err, updatedLeitos) {
									if (err) return handleError(err,req,res);
								});
								
								financeiro.save(function (err, updatedFinanceiro) {
									if (err) return handleError(err,req,res);
								});
								
								res.render('home_recepcao_checkout_dados', {cadastro: registro[1].ocupante[index], custo: custo, hours: hours%24, days: parseInt(hours/24)});
							}
							else {
								req.flash('message', 'É necessário criar o Financeiro');
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
	
	// /HOME/RESERVA
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
			
				Registro.find({data: {"$gte": moment(cadastro.dateIn), "$lt": moment(cadastro.dateOut)}}, 
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
								
								res.render('home_reserva_alocacao', {leitos: leitos_, num_hospede: (cadastro.acompanhante+1)});
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
				
				Leito.find({}, function(err, leitos) {
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
							for (var i = 0; i < registros.length; ++i){
								for (var j = 0; j < leitos.length; ++j){
									if (req.param(leitos[j].cod_leito)){
										registros[i].estado.splice(j, 1, 'reservado');
										req.session.cadastro.tipo = "acompanhante"
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
				if(req.param('ocup') != undefined){
					leito.ocupabilidade = req.param('ocup');
					leito.save();
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
				leito.save();
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

	router.post('/home/manutencao/limpeza', isAuthenticated, isManutencao, function(req, res){
		Leito.findOne({cod_leito: req.param('leito_alterado')}, function(err, leito) {
			if (err) return handleError(err,req,res);
			if (leito){
				if(req.param('new_value') != undefined){
					leito.limpeza = req.param('new_value');
					leito.save();
				}
			}
			else {
				req.flash('message', "Os Leito procurado não foi encontrado");
			}
			res.redirect('/home/manutencao/limpeza');
		});
	});
	

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
			if (err) return handleError(err,req,res);
			
			if (user) {
				user.permissao = [req.body.Recepcao, req.body.Reserva, req.body.Lavanderia, req.body.Manutencao, req.body.Financeiro, req.body.Gerente];
				user.save(function (err, updatedUser) {
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
			
			newUser.save(function (err, updatedUser) {
				if (err) return handleError(err,req,res);
				
			});
			req.flash('message', "Usuário criado com sucesso.");
			res.redirect('/home');
        });
		
	});
	
	// /HOME/GERENTE/REGISTRO/ESTADO
	router.get('/home/gerente/registro/estado', isAuthenticated, isGerente, function(req,res){
		
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
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						res.render('home_gerente_registro_estado', {registros: registros, leito: leitos});
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
	
	// /HOME/GERENTE/REGISTRO/ANALISE
	router.get('/home/gerente/registro/analise', isAuthenticated, isGerente, function(req,res){
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
				
				Leito.find({}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						var vagas = [];
						for (var i = 0; i < registros.length; i++){
							vagas[i] = 0;
						}
						
						for (var i = 0; i < registros.length; i++){
							for (var j = 0; j < leitos.length; j++){
								if (registros[i].estado[j] == 'livre' && leitos[j].ocupabilidade != 'inocupavel'){
									vagas[i]++;
								}
							}
						}
						
						res.render('home_gerente_registro_analise', {registros: registros, vagas: vagas});
						
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
				user.save(function(err, updatedUser){
					if (err) return handleError(err,req,res);
				});
				return;
			}
			var newUser = new User();
			
			newUser.username = 'admin';
			newUser.password = createHash('admin');
			newUser.permissao = [true, true, true, true, true, true];
			
			newUser.save(function (err, updatedUser) {
				if (err) return handleError(err,req,res);
			});
        });
		res.redirect('/criar/financeiro');
		
	});
	
	router.get('/criar/financeiro', function(req, res){
		var newFinanceiro = new Financeiro();
		newFinanceiro.gasto = 0;
		newFinanceiro.ganho = 0;
		newFinanceiro.save(function (err, updatedFinanceiro) {
			if (err) return handleError(err,req,res);
		});
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
		setTimeout(function () {res.redirect('/criar/registro')}, 1000);
	});
	
	router.get('/criar/registro', function(req, res){
		Leito.find({}, function(err, leitos) {
			if (err) return handleError(err,req,res);
			if (leitos){
				var dataInicial = moment('2017-01-01');
				var dataFinal = moment('2050-01-01');
				var proximoDia = moment(dataInicial);
				
				while (proximoDia < dataFinal){
					var newRegistro = new Registro();
					newRegistro.data = moment(proximoDia);
					newRegistro.estado = [];
					newRegistro.ocupante = [];
					newRegistro.ganho = 0;
					newRegistro.gasto = 0;
					for (var i = 0; i < leitos.length; i++){
						newRegistro.estado[newRegistro.estado.length] = "livre";
						newRegistro.ocupante[newRegistro.ocupante.length] = "";
					}
					newRegistro.save(function (err, updatedRegistro) {
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
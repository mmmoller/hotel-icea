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
var nodemailer = require('nodemailer');
var Teste = require('../models/teste');

module.exports = function(passport){

{ // TESTE
	router.get('/teste/cadastro', isAuthenticated, function(req,res){

		if (req.param('_id') == undefined){
			req.flash('message', '!O cadastro procurado não foi encontrado');
			res.redirect('/home');
		}
		else {
			Cadastro.findOne({_id: req.param('_id')},function(err, cadastro) {
				if (err) return handleError(err,req,res);
				if (cadastro){
					
					res.render('teste', { cadastro: cadastro });
				}
				else {
					req.flash('message', "!Cadastro não existente");
					res.redirect('/home');
				}
			
			});
		}
	});
	
	router.get('/teste', function(req,res){
		/*
		var teste = new Teste()
		teste.teste1 = "teste";
		teste.save(function (err) {
			if (err) return handleError(err,req,res);
			else {
				console.log("teste criado com sucesso");
			}
		});
		res.send("teste");
		*/
		res.send('dasdadsasdadsadads');
	});
	
	router.get('/teste2', function(req,res){
		Teste.findOne({}, function(err, teste) {
            // In case of any error, return using the done method
			if (err){
				return handleError(err,req,res);
			}
			if (teste){
				console.log("achou");
			}
			else {
				console.log("ñ achou");
			}
        });
		res.send("teste2")
	});
	
	router.get('/teste3', function(req,res){
		Teste.remove({}, function(err) { 
			console.log('Teste removed')
		});
		res.send("teste3")
	});
	
}

{ // INDEX e LOGIN
	
	// /'INDEX'
	router.get('/', function(req, res) {
		
		
		Financeiro.findOne({}, function(err, financeiro) {
			if (err) return handleError(err,req,res);
			if (financeiro){
				var posto = [];
				for (var key in financeiro.dic_posto_valor) {
					if (financeiro.dic_posto_valor.hasOwnProperty(key)){
						posto.unshift(key);
					}
				}		
				res.render('index', {message: req.flash('message'), _debug: debug, posto: posto});
			}
			else {
				req.flash('message', "!O sistema não está disponível. Problemas no setor Financeiro.");
				res.send('O sistema não está disponível. Problemas com o setor Financeiro.');
			}
		});
		
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
		newCadastro.dependente = req.param('dependente');
		newCadastro.posto = req.param('posto'); 
		newCadastro.curso = req.param('curso'); 
		newCadastro.solicitante = req.param('solicitante'); 
		newCadastro.sexo = req.param('sexo');
		newCadastro.estado = "solicitação de reserva";
		newCadastro.custo_estada = 0;
		newCadastro.valor_pago = 0;
		// Se a data de saida for maior que a data de entrada, é valido (essa validação deveria ser feita no front-end)
		// Ou renderizar a página com os dados já preenchidos
		if (moment(newCadastro.dateIn).isValid() &&
		moment(newCadastro.dateOut).isValid() &&
		moment(newCadastro.dateIn) < moment(newCadastro.dateOut)
		//&& moment(newCadastro.dateIn) > moment().subtract(1, 'days')
		){
			
			newCadastro.dateIn = moment(newCadastro.dateIn).format("YYYY-MM-DD");
			newCadastro.dateOut = moment(newCadastro.dateOut).format("YYYY-MM-DD");
			
			
			Financeiro.findOne({}, function(err, financeiro) {
				if (err) return handleError(err,req,res);
				if (financeiro){
					if (financeiro.blacklist.indexOf(newCadastro.cpf) > -1){
						
						req.flash('message', "!Solicitação de reserva indeferida, entrar em contato com o hotel para resolver a situação");
						res.redirect('/');
					}
					
					else {
						
						
						newCadastro.save(function (err) {
							if (err) return handleError(err,req,res);
						});
						
						var log = "Solicitação de reserva. Data de entrada: "
						+ moment(newCadastro.dateIn).format("DD/MM/YY") +
						". Data de saida: " + moment(newCadastro.dateOut).format("DD/MM/YY");
						createLog("Cadastro", newCadastro.name, newCadastro._id, "", "", log, "cadastrar");
						
						req.flash('message', "Solicitação de reserva realizada com sucesso, aguarde confirmação por e-mail");
						
						if (debug){
							res.redirect('/home');
						}
						else{
							res.redirect('/');
						}
					}
					
				}
				else {
					req.flash('message', "!O sistema não está disponível. Problemas no setor Financeiro.");
					res.send('O sistema não está disponível. Problemas com o setor Financeiro.');
				}
			});
			
			
			
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
						
						var azul = "Leito limpo"
						var laranja = "Leito sujo"
						var vermelho = "Apenas no modo 'Debug'"
						
						res.render('home_recepcao_geral', {cadastros: cadastros_
						, titulo: "Realizar Check-In", endereco: "checkin",
						botao: "Check-in", cores: cores, message: req.flash('message')
						, azul: azul, laranja: laranja, vermelho: vermelho});
						
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
		// *Antes estava moment(req.param('dateIn')), agora vai ser ontem.
		Registro.find({data: {"$gte": moment().subtract(1, 'days'), "$lt": moment(req.param('dateOut'))}}
		, null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err,req,res);
			if (registros){
				
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
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
								
								Financeiro.findOne({}, function(err, financeiro) {
									if (err) return handleError(err,req,res);
									if (financeiro){
										cadastro.estado = "checkIn";
										cadastro.checkIn = moment().format();
										cadastro.num_registro = financeiro.num_registro + '/' + moment().format("YYYY");
										financeiro.num_registro++;
										
										for (var i = 0; i < registros.length; ++i){
											registros[i].estado.splice(index, 1, 'ocupado');
											registros[i].cadastro_id.splice(index, 1, cadastro._id);
										}
										
										for (var i = 0; i < registros.length; ++i){
											registros[i].save(function (err) {
												if (err) return handleError(err,req,res);
											});
										}
										
										createLog("Recepção", cadastro.name, cadastro._id,
										leitos[index].cod_leito, req.user.username, "Check-in.", "check-in");
										
										cadastro.save(function(err){
											if (err) return handleError(err,req,res);
										});
										
										financeiro.save(function(err){
											if (err) return handleError(err,req,res);
										});
										
										req.flash('message', 'Check-in realizado com sucesso')
										res.redirect('/home/recepcao/checkin');
									}
									else {
										req.flash('message', "!O sistema não está disponível. Problemas no setor Financeiro.");
										res.send('O sistema não está disponível. Problemas com o setor Financeiro.');
									}
								});
								
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
				
				var azul = "Deve ser cancelado. Já passou a data de estada e o hospede não compareceu."
				var laranja = "Cancelar apenas se houver demanda. O hóspede já deveria ter realizado check-in."
				var vermelho = "Cancelar apenas por motivos de força maior. O hóspede se encontra em situação regular."
				
				res.render('home_recepcao_geral', {cadastros: cadastros
				, titulo: "Cancelar Check-In", endereco: "checkin/cancelar",
				botao: "Cancelar", cores: cores, message: req.flash('message')
				, azul: azul, laranja: laranja, vermelho: vermelho});
						
					
				
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
								cadastro.estado = "reserva cancelada";
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
										registros[i].cadastro_id.splice(index, 1, '');
									}
								}
								
								for (var i = 0; i < registros.length; ++i){
									registros[i].save(function (err) {
										if (err) return handleError(err,req,res);
									});
								}
								
								var motivo = req.param("motivo_cancelar_checkin");
								
								createLog("Recepção", cadastro.name, cadastro._id,
								leitos[index].cod_leito, req.user.username, "Reserva cancelada. Motivo: " + motivo + ".", "cancelar check-in");
								
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
		Cadastro.find({'estado': "checkIn"}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				
				Financeiro.findOne({}, function(err, financeiro) {
					if (err) return handleError(err,req,res);
					if (financeiro){
				
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
							
							var hours = moment().diff(moment(cadastros[i].checkIn),"hours");
							
							if (hours < 24){
								hours = 24;
							}
								
							custos[i] = hours*financeiro.dic_posto_valor[cadastros[i].posto]/24;
							
							
						}
						
						req.session.preventf5 = true;
						
						var azul = "Hóspede deve realizar o check-out hoje."
						var laranja = "Ainda não é a data de check-out do hóspede, porém ele pode ser realizado antecipadamente."
						var vermelho = "Hóspede já deveria ter realizado o check-out."
						
						res.render('home_recepcao_geral', {cadastros: cadastros
						, titulo: "Realizar Check-Out", endereco: "checkout",
						botao: "Check-out", cores: cores, custos: custos, message: req.flash('message')
						, azul: azul, laranja: laranja, vermelho: vermelho});
					
					}
					else {
						req.flash('message', "!O sistema não está disponível. Problemas no setor Financeiro.");
						res.redirect('/');
					}
				});				
			
			
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
										registros[i].cadastro_id.splice(index, 1, "");
										registros[i].save(function (err) {
											if (err) return handleError(err,req,res);
										});
									}
									
									var custo = Number(req.param("valor"));
									
									if (cadastro.dependente == -1){
										cadastro.estado = "checkOut-pago"
										cadastro.checkOut = moment().format();
										cadastro.save(function(err){
											if (err) return handleError(err,req,res);
										});
										
										Cadastro.findOne({'_id': cadastro.info_dependente}, function(err, responsavel) {
											if (err) return handleError(err,req,res);
											if (responsavel){
												responsavel.custo_estada += custo;
												if (responsavel.valor_pago < responsavel.custo_estada){
													responsavel.estado = "checkOut-deve";
												}
												responsavel.save(function(err){
													if (err) return handleError(err,req,res);
												});
											} else {
												req.flash('message', '!Não foi possível localizar o responsável para realizar a cobrança!');
											}
										});
										
									}
									else {
										if (cadastro.valor_pago >= custo){
											cadastro.estado = "checkOut-pago";
										}
										else {
											cadastro.estado = "checkOut-deve";
										}
										cadastro.checkOut = moment().format();
										cadastro.custo_estada += custo;
										cadastro.save(function(err){
											if (err) return handleError(err,req,res);
										});
									}

									
									Financeiro.findOne({}, function(err, financeiro) {
										if (err) return handleError(err,req,res);
										if (financeiro){
											//financeiro.ganho += custo;
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
											log.modulo.push("Recepção");
											log.horario.push(moment().format("HH:mm:ss"));
											log.log.push("Check-out. Valor cobrado: R$ " + req.param("valor") +
											". Valor previsto: R$" + req.param("custo_previsto") + ". Motivo: "
											+ req.param("motivo_ajuste") + "."
											);
											log.query.push("check-out");
											log.cadastro.push(cadastro.name);
											log.cadastro_id.push(cadastro._id);
											log.leito.push(leitos[index].cod_leito);
											log.usuario.push(req.user.username);
											log.ganho += custo;
											log.save(function (err) {
												if (err) return handleError(err,req,res);
											});
										}
										else{
											req.flash('message', '!É necessário criar o Log');
										}
									});
									
									res.render('home_recepcao_checkout', 
									{cadastro: cadastro, custo: custo, 
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
	
	// /HOME/RECEPCAO/ESTENDER
	router.get('/home/recepcao/estender', isAuthenticated, isRecepcao, function(req,res){
		Cadastro.find({'estado': "checkIn"}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				
				// Quais cadastros_ são extensiveis em 1 dia a estadia.
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
								, titulo: "Estender estada", endereco: "estender",
								botao: "Estender", message: req.flash('message')});
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
	
	router.post('/home/recepcao/estender', isAuthenticated, isRecepcao, function(req,res){
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
											registro.cadastro_id.splice(j, 1, cadastro._id);
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
								
								
								createLog("Recepção", cadastro.name, cadastro._id,
								cadastro.leito, req.user.username, "Estendida a estada.", "estender estada");
								
								
								req.flash('message', 'Estada estendida com sucesso');
								res.redirect('/home/recepcao/estender');
								
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
		Cadastro.find({'estado': "checkIn"}, function(err, cadastros) {
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
							for (var i = 0; i < leitos.length; i++)
								if (livre[i])
									leitos_.push(leitos[i]);
						
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
								registros[i].cadastro_id.splice(index_leito_novo, 1, registros[i].cadastro_id[index_leito_antigo]);
								registros[i].estado.splice(index_leito_antigo, 1, 'livre');
								registros[i].cadastro_id.splice(index_leito_antigo, 1, "");
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
								
								
									
									createLog("Recepção", cadastro.name, cadastro._id,
									leitos[index_leito_novo].cod_leito, req.user.username, 
									"Mudança do leito " + leitos[index_leito_antigo].cod_leito, "mudança");
									
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

	
	// /HOME/RECEPCAO/WALKIN
	router.get('/home/recepcao/walkin', isAuthenticated, isRecepcao, function(req,res){
		res.render('home_recepcao_walkin', {message: req.flash('message')});
	});
	
	router.post('/home/recepcao/walkin', isAuthenticated, isRecepcao, function(req,res){
		
		var today = moment();
		var yesterday = moment().subtract(1, 'days');
		
		Registro.find({data: {"$gte": yesterday, "$lt": moment(req.param("dateOut"))}}, 
		null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err,req,res);
			if (registros) {
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						//req.session.cod_leito = req.param("cod_leito");
						req.session.dateOut = req.param("checkout");
						req.session.dependente = Number(req.param("dependente"))+1;
						console.log(req.session.dateOut);
						console.log(req.session.dependente);
						//req.session.cadastro_id = req.param("_id");
						
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
							for (var i = 0; i < leitos.length; i++)
								if (livre[i])
									leitos_.push(leitos[i]);
						
						res.render('home_alocacao_geral', {leitos: leitos_,
						num_hospede: (req.session.dependente), endereco: "recepcao/walkin/alocacao"});
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
	
	// /HOME/RECEPCAO/WALKIN/ALOCACAO
	router.get('/home/recepcao/walkin/alocacao', isAuthenticated, isRecepcao, function(req,res){
		res.redirect('/home/recepcao/walkin');
	});
	
	router.post('/home/recepcao/walkin/alocacao', isAuthenticated, isRecepcao, function(req,res){
		
		Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
			if (err) return handleError(err,req,res);
			if (leitos){
				
				
				var leitos_alocados = 0;
				req.session.leitos = [];
				
				for (var j = 0; j < leitos.length; ++j){
					if (req.param(leitos[j].cod_leito)){
						
						
						//TESTAR
						req.session.leitos[leitos_alocados] = j;
						
						leitos_alocados++;
						
						
					}
				}
				//TESTAR
				console.log(req.session.leitos);
				console.log(leitos_alocados);
				
				
				if (leitos_alocados != (req.session.dependente)){
					req.flash('message', "!É necessário selecionar a quantidade correta de leitos");
					res.redirect('/home/recepcao/walkin');;
				}
				else {
					
					
					Financeiro.findOne({}, function(err, financeiro) {
						if (err) return handleError(err,req,res);
						if (financeiro){
							var posto = [];
							for (var key in financeiro.dic_posto_valor) {
								if (financeiro.dic_posto_valor.hasOwnProperty(key)){
									posto.unshift(key);
								}
							}		
							res.render('home_recepcao_walkin_cadastrar', {_debug: debug, posto: posto});
						}
						else {
							req.flash('message', "!O sistema não está disponível. Problemas no setor Financeiro.");
							res.send('O sistema não está disponível. Problemas com o setor Financeiro.');
						}
					});
					
					
					
				}
				
			}
			else {
				req.flash('message', "É necessário criar os Leitos");
				res.redirect('/home');;
			}
		});
	});

		// /HOME/RECEPCAO/WALKIN/CADASTRAR
	router.get('/home/recepcao/walkin/cadastrar', isAuthenticated, isRecepcao, function(req,res){
		res.redirect('/home/recepcao/walkin');
	});
	
	router.post('/home/recepcao/walkin/cadastrar', isAuthenticated, isRecepcao, function(req,res){
		var dateIn = moment().format("YYYY-MM-DD");
		var dateOut = moment(req.session.dateOut).format("YYYY-MM-DD");
		console.log(dateIn);
		console.log(dateOut);
		
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
		newCadastro.dateIn = dateIn;
		newCadastro.dateOut = dateOut;
		newCadastro.dependente = req.session.dependente; 
		newCadastro.posto = req.param('posto'); 
		newCadastro.curso = req.param('curso'); 
		newCadastro.solicitante = req.param('solicitante'); 
		newCadastro.sexo = req.param('sexo');
		newCadastro.custo_estada = 0;
		nweCadastro.valor_pago = 0;
		
		// MODIFICAR TUDO DAQUI PARA BAIXO
		Registro.find({data: {"$gte": moment(dateIn), "$lt": moment(newCadastro.dateOut)}}
		, null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err,req,res); 
			if (registros){
				
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos){
					if (err) return handleError(err,req,res);
					if (leitos){
						
						
						var disponivel = true;
						for (var i = 0; i < registros.length; i++){
							
							for (var j = 0; j < req.session.leitos.length; j++){
								if (registros[i].estado[req.session.leitos[j]] != 'livre' || leitos[req.session.leitos[j]].ocupabilidade == 'inocupavel'){
									disponivel = false;
								}
							}
							
						}
						
						
						if (!disponivel){
							req.flash('message', "!Os leitos escolhidos se encontram indisponíveis, tente novamente.");
							res.redirect('/home/recepcao/walkin');;
						}
						else {
							
							Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
								if (err) return handleError(err,req,res);
								if (log){
									
									var dependente = false;
									for (var j = 0; j < req.session.leitos.length; j++){
										

										var _newCadastro = new Cadastro(newCadastro);
										if (dependente){
											_newCadastro._id = mongoose.Types.ObjectId();
											_newCadastro.dependente = -1;
											_newCadastro.info_dependente = newCadastro._id;
										}
										_newCadastro.estado = "checkIn";
										_newCadastro.checkIn = moment().format();
										_newCadastro.leito = leitos[req.session.leitos[j]].cod_leito;
										_newCadastro.save(function (err) {
											if (err) return handleError(err,req,res);
										});
										
										
										for (var i = 0; i < registros.length; i++){
											registros[i].estado.splice(req.session.leitos[j], 1, 'ocupado');
											registros[i].cadastro_id.splice(req.session.leitos[j], 1, _newCadastro._id);
										}
										
										//console.log(newCadastro);
										// LOG
										
										log.modulo.push("Recepção");
										log.horario.push(moment().format("HH:mm:ss"));
										log.log.push("Walk-in efetuado.");
										log.query.push("walkin");
										log.leito.push(leitos[req.session.leitos[j]].cod_leito);
										log.cadastro.push(_newCadastro.name);
										log.cadastro_id.push(_newCadastro._id);
										log.usuario.push(req.user.username);
										
										if (!dependente){
											acceptMail(_newCadastro);
										}
										dependente = true;
											
									}
									
									
									
									
									
									for (var i = 0; i < registros.length; i++){
										registros[i].save(function (err) {
											if (err) return handleError(err,req,res);
										});
									}
									
									log.save(function (err) {
										if (err) return handleError(err,req,res);
									});
									
									req.flash('message', 'Walk-in realizado com sucesso');
									res.redirect('/home/recepcao/walkin');
									
								}
								else{
									req.flash('message', '!É necessário criar o Log');
									res.redirect('/home');
								}
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

	

}
	
{ // RESERVA
	// /HOME/RESERVA
	router.get('/home/reserva', isAuthenticated, isReserva, function(req, res){
		Cadastro.find({'estado': "solicitação de reserva"}, function(err, cadastros) {
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
								for (var i = 0; i < leitos.length; i++)
									if (livre[i])
										leitos_.push(leitos[i]);
								
								
								res.render('home_alocacao_geral', {leitos: leitos_,
								num_hospede: (cadastro.dependente+1), endereco: "reserva/alocacao"});
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
						
						if (leitos_alocados != (req.session.cadastro.dependente+1)){
							req.flash('message', "É necessário selecionar a quantidade correta de leitos");
							res.redirect('/home');;
						}
						else {
							
							Cadastro.remove({'_id': req.session.cadastro._id}, function(err) {
								if (err) return handleError(err,req,res);
							
							
								Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
									if (err) return handleError(err,req,res);
									if (log){
										
										var dependente = false;
										for (var j = 0; j < leitos.length; j++){
											if (req.param(leitos[j].cod_leito)){
												
												
												var newCadastro = new Cadastro(req.session.cadastro);
												if (dependente){
													newCadastro._id = mongoose.Types.ObjectId();
													newCadastro.dependente = -1;
													newCadastro.info_dependente = req.session.cadastro._id;
												}
												newCadastro.estado = "reservado";
												newCadastro.leito = leitos[j].cod_leito;
												newCadastro.save(function (err) {
													if (err) return handleError(err,req,res);
												});
												
												
												for (var i = 0; i < registros.length; i++){
													registros[i].estado.splice(j, 1, 'reservado');
													console.log(newCadastro._id)
													registros[i].cadastro_id.splice(j, 1, newCadastro._id);
												}
												
												//console.log(newCadastro);
												// LOG
												
												log.modulo.push("Reserva");
												log.horario.push(moment().format("HH:mm:ss"));
												log.log.push("Reserva efetuada.");
												log.query.push("reservar");
												log.leito.push(leitos[j].cod_leito);
												log.cadastro.push(newCadastro.name);
												log.cadastro_id.push(newCadastro._id);
												log.usuario.push(req.user.username);
												
												if (!dependente){
													acceptMail(newCadastro);
												}
												dependente = true;
												
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
										req.flash('message', '!É necessário criar o Log');
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
				cadastro.estado = "solicitação cancelada";
				cadastro.save(function(err){
					if (err) return handleError(err,req,res);
				});
				
				var motivo = req.param("motivo_cancelar_reserva");
				
				rejectMail(cadastro, motivo);
				
				createLog("Reserva", cadastro.name, cadastro._id,
				"", req.user.username, "Solicitação cancelada. Motivo: " + motivo + ".", "cancelar solicitação");
				
				
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
	
{ // LAVANDERIA
	// /HOME /LAVANDERIA
	router.get('/home/lavanderia/folha', isAuthenticated, isLavanderia, function(req, res){
		res.render('home_lavanderia_folha', {descricoes: desc_itens_lavanderia,
		message: req.flash('message')});
	});
	
	router.post('/home/lavanderia/folha', isAuthenticated, isLavanderia, function(req, res){
		
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
		
		createLog("Lavanderia", "", newFolha._id,
		"", req.user.username, 
		"Folha inserida. " + "Data de coleta: " +
		moment(newFolha.data_coleta).format("DD/MM/YY") +
		". Data de entrega: " + moment(newFolha.data_entrega).format("DD/MM/YY") +
		". Fiscal: " + newFolha.nome_fiscal, "inserir folha");
		
		req.flash('message', 'Folha inserida com sucesso')
		res.redirect("/home/lavanderia/folha");
		//res.render('home_lavanderia_folha', {descricoes: desc_itens_lavanderia, inserido: true});
	});
	
	router.get('/home/lavanderia/gerencia', isAuthenticated, isLavanderia, function(req, res){
		res.render('home_lavanderia_gerencia');
	});

	router.get('/home/lavanderia/lista', isAuthenticated, isLavanderia, function(req, res){
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
	
{ // MANUTENCAO
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
		Leito.find({cod_leito: req.param('leito_alterado')}, function(err, leito) {
			if (err) return handleError(err,req,res);
			if (leito){
				res.render('home_manutencao_quadro_alterar', {leito: leito, message: req.flash('message')});
			}
			else {
				req.flash('message', "Os Leito procurado não foi encontrado");
				res.redirect('/home/manutencao/quadro');
			}
		});
	});
	
	router.post('/home/manutencao/quadro/alterar', isAuthenticated, isManutencao, function(req, res){

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
					
					createLog("Manutenção", "", "", leito.cod_leito, req.user.username, 
					"Pane inserida: " + req.param('desc_pane_adc'), "inserir pane");
					req.flash('message', "Pane inserida com sucesso");
					res.redirect('/home/manutencao/quadro/alterar?leito_alterado='+req.param('leito_alterado'));
					return;
				}
				else if(req.param('ocup') != undefined){
					leito.ocupabilidade = req.param('ocup');
					leito.save(function (err) {
						if (err){
							return handleError(err,req,res);
						}
					});
					
					createLog("Manutenção", "", "", leito.cod_leito, req.user.username, 
					"Ocupabilidade alterada para " + req.param('ocup'), "ocupabilidade");
					
					req.flash('message', "Ocupabilidade alterada com sucesso");
					res.redirect('/home/manutencao/quadro/alterar?leito_alterado='+req.param('leito_alterado'));
					return;
				}
				else {
					var newManutencao = [];
					var paneRemovida = [];
					for(var i = 0; i < leito.manutencao.length; i++){
						if(req.param('idx_pane_rem_'+i) != '1'){ //manter essa pane
							newManutencao.push(leito.manutencao[i]);
						}
						else{
							paneRemovida.push(leito.manutencao[i]);
						}
						
					}
					leito.manutencao = newManutencao.slice(0); //clonando array
					leito.save(function (err) {
						if (err){
							return handleError(err,req,res);
						}
					});
					
					for (var i = 0; i < paneRemovida.length; i++){
						createLog("Manutenção", "", "", leito.cod_leito, req.user.username, 
						"Pane removida: " + paneRemovida[i], "remover pane");
					}
					
					req.flash('message', "Pane removida com sucesso");
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

	// /HOME/MANUTENCAO/LIMPEZA Adicionar Log, pensar na usabilidade.
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
	
	// /HOME/FINANCEIRO/INSERIR
	router.get('/home/financeiro/inserir', isAuthenticated, isFinanceiro, function(req, res){
		res.render('home_financeiro_inserir', {message: req.flash('message')});
	});
	
	router.post('/home/financeiro/inserir', isAuthenticated, isFinanceiro, function(req, res){
		Financeiro.findOne({}, function(err, financeiro) {
			if (err) return handleError(err,req,res);
			if (financeiro){
				Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
					if (err) return handleError(err,req,res);
					if (log){
						
						
						var _log = req.param("tipo") + " inserida. " +
						"Valor: R$ " + req.param("valor") +
						". Motivo: " + req.param("motivo_financeiro");
						
						if (req.param("tipo") == "Ganho"){
							financeiro.ganho = req.param("valor");
							log.ganho = req.param("valor");
						}
						else {
							financeiro.gasto = req.param("valor");
							log.gasto = req.param("valor");
						}
						
						log.modulo.push("Financeiro");
						log.horario.push(moment().format("HH:mm:ss"));
						log.log.push(_log);
						log.query.push("inserir financeiro")
						log.cadastro.push("");
						log.cadastro_id.push("");
						log.leito.push("");
						log.usuario.push(req.user.username);
						log.save(function (err) {
							if (err) return handleError(err,req,res);
						});
						
						
						req.flash('message', 'Inserção realizada com sucesso.');
						
						
					}
					else{
						req.flash('message', '!É necessário criar o Log');
					}
					
					res.redirect('/home/financeiro/inserir');
				});
			}
			else {
				req.flash('message', "O Financeiro ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
	
	// /HOME/FINANCEIRO/ALTERAR
	router.get('/home/financeiro/alterar', isAuthenticated, isFinanceiro, function(req, res){
		Financeiro.findOne({}, function(err, financeiro) {
			if (err) return handleError(err,req,res);
			if (financeiro){
				var posto = [];
				var valor = [];
				for (var key in financeiro.dic_posto_valor) {
					if (financeiro.dic_posto_valor.hasOwnProperty(key)){
						posto.unshift(key);
						valor.unshift(financeiro.dic_posto_valor[key]);
					}
				}		
				res.render('home_financeiro_alterar', {message: req.flash('message'), posto: posto, valor: valor});
			}
			else {
				req.flash('message', "O Financeiro ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/financeiro/alterar', isAuthenticated, isFinanceiro, function(req, res){
		Financeiro.findOne({}, function(err, financeiro) {
			if (err) return handleError(err,req,res);
			if (financeiro){
				Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
					if (err) return handleError(err,req,res);
					if (log){

						var aux_dic = {};
						var _log = "";
						
						for (var i = 0; i < req.body._posto.length; i++){
							aux_dic[req.body._posto[i]] = Number(req.body._valor[i]);
							
							if (financeiro.dic_posto_valor[req.body._posto[i]] != req.body._valor[i]){
								_log = _log + " " + String(req.body._posto[i]) 
								+ ": de R$ " + String(financeiro.dic_posto_valor[req.body._posto[i]])
								+ " para R$ " + String(req.body._valor[i]) + ".";
							}
						}
						
						financeiro.dic_posto_valor = aux_dic;
						
						financeiro.save(function (err) {
							if (err) return handleError(err,req,res);
						});
						
						//console.log(aux_dic)
						
						createLog("Financeiro", "", "",
						"", req.user.username, "Valor(es) de diária(s) alterada(s)." + _log, "alterar diária");
						
						
						req.flash('message', 'Valores de diárias alteradas com sucesso');
						
					}
					else{
						req.flash('message', '!É necessário criar o Log');
					}
					
					res.redirect('/home/financeiro/alterar');
				});
			}
			else {
				req.flash('message', "O Financeiro ainda não foram criados");
				res.redirect('/home');
			}
		});
	});

	// /HOME/FINANCEIRO/BLACKLIST
	router.get('/home/financeiro/blacklist', isAuthenticated, isFinanceiro, function(req, res){
		Financeiro.findOne({}, function(err, financeiro) {
			if (err) return handleError(err,req,res);
			if (financeiro){
				res.render('home_financeiro_blacklist', {blacklist: financeiro.blacklist, message: req.flash("message")})
			}
			else {
				req.flash('message', "O Financeiro ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
	
	// ADD LOG
	router.post('/home/financeiro/blacklist', isAuthenticated, isFinanceiro, function(req, res){
		Financeiro.findOne({}, function(err, financeiro) {
			if (err) return handleError(err,req,res);
			if (financeiro){
				if (req.param("tipo") == "adicionar"){
					if (financeiro.blacklist.indexOf(req.param("cpf")) > -1){
						req.flash('message', "!Hospede já se encontra na blacklist");
						res.redirect('/home');
					}
					else {
						financeiro.blacklist.push(req.param("cpf"));
						financeiro.blacklist.push(req.param("name"));
						financeiro.blacklist.push(req.param("_id"));
						financeiro.blacklist.push(req.param("motivo"));
						financeiro.save(function (err) {
							if (err) return handleError(err,req,res);
						});
						req.flash('message', "Hospede foi adicionado a blacklist");
						res.redirect('/home/financeiro/blacklist');
					}
				}
				else {
					financeiro.blacklist.splice(financeiro.blacklist.indexOf(req.param("cpf")), 4);
					financeiro.save(function (err) {
						if (err) return handleError(err,req,res);
					});
					req.flash('message', "Hospede foi removido da blacklist");
					res.redirect('/home/financeiro/blacklist');
				}
			}
			
			else {
				req.flash('message', "O Financeiro ainda não foram criados");
				res.redirect('/home');
			}
		});
	});

	// /HOME/FINANCEIRO/PAGAMENTO
	router.get('/home/financeiro/pagamento', isAuthenticated, isFinanceiro, function(req, res){
		Financeiro.findOne({}, function(err, financeiro) {
			if (err) return handleError(err,req,res);
			if (financeiro){
				res.render('home_financeiro_pagamento', {pagamento: financeiro.pagamento, message: req.flash("message")})
			}
			else {
				req.flash('message', "O Financeiro ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
	
	// ADD LOG
	router.post('/home/financeiro/pagamento', isAuthenticated, isFinanceiro, function(req, res){
		Financeiro.findOne({}, function(err, financeiro) {
			if (err) return handleError(err,req,res);
			if (financeiro){
				if (req.param("tipo") == "adicionar"){
					
					if (financeiro.pagamento.indexOf(req.param("cpf")) > -1){
						req.flash('message', "!Hospede já se encontra com pagamento em análise");
						res.redirect('/home');
					}
					else {
						financeiro.pagamento.push(req.param("cpf"));
						financeiro.pagamento.push(req.param("name"));
						financeiro.pagamento.push(req.param("_id"));
						financeiro.pagamento.push(req.param("tipo_pagamento"));
						financeiro.pagamento.push(req.param("valor"));
						financeiro.pagamento.push(req.param("documento"));
						financeiro.save(function (err) {
							if (err) return handleError(err,req,res);
						});
						req.flash('message', "Pagamento foi adicionado e encaminhado para análise");
						res.redirect('/home/financeiro/pagamento');
					}
				}
				else {
					
					if (req.param("tipo") == "validar"){
						Cadastro.findOne({_id: req.param('_id')},function(err, cadastro) {
							if (err) return handleError(err,req,res);
							if (cadastro){
								cadastro.valor_pago += Number(req.param("valor"));
								if (cadastro.valor_pago >= cadastro.custo_estada && cadastro.estado == "checkOut-deve"){
									cadastro.estado = "checkOut-pago"
								}
								cadastro.save(function (err) {
									if (err) return handleError(err,req,res);
								});
								
								financeiro.pagamento.splice(financeiro.pagamento.indexOf(req.param("cpf")), 6);
								financeiro.ganho += Number(req.param("valor"));
								financeiro.save(function (err) {
									if (err) return handleError(err,req,res);
								});
								req.flash('message', "Pagamento foi aceito");
								res.redirect('/home/financeiro/pagamento');
								
							}
							else {
								req.flash('message', "!Cadastro não existente");
								res.redirect('/home');
							}
						
						});
					}
					else {
						financeiro.pagamento.splice(financeiro.pagamento.indexOf(req.param("cpf")), 6);
						financeiro.save(function (err) {
							if (err) return handleError(err,req,res);
						});
						req.flash('message', "Pagamento foi recusado");
						res.redirect('/home/financeiro/pagamento');
					}
					
				}
			}
			
			else {
				req.flash('message', "O Financeiro ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
	
}

{ // GERENTE

	// /HOME/GERENTE/PERMISSAO
	router.get('/home/gerente/permissao', isAuthenticated, isGerente, function(req, res){
		User.find({username: {$ne: 'admin'}}, function(err, users) {
			if (err) return handleError(err,req,res);
			if (users){
				res.render('home_gerente_permissao', {users: users, dic: dicionario_permissao, 
				message: req.flash('message')});
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
				user.save(function (err) {
					if (err) return handleError(err,req,res);
				});
				
				createLog("Gerência", user.username, user._id,
				"", req.user.username, "Permissões de acesso alteradas.", "alterar permissão");
				
				req.flash('message', "Permissões alteradas com sucesso");
				res.redirect('/home/gerente/permissao');
			}
			else {
				req.flash('message', "O usuário não existe");
				res.redirect('/home');
			}
        });
		
		
	});
	
	// /HOME/GERENTE/REGISTRAR/USUARIO
	router.get('/home/gerente/registrar/usuario', isAuthenticated, isGerente, function(req, res){
		res.render('home_gerente_registrar_usuario',{message: req.flash('message')});
	});

	router.post('/home/gerente/registrar/usuario', isAuthenticated, isGerente, function(req, res){
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
            newUser.name = req.param('name');
			newUser.permissao = [true, true, true, true, true, false];
			
			newUser.save(function (err) {
				if (err) return handleError(err,req,res);
			});
			
			createLog("Gerência", newUser.username, newUser._id,
			"", req.user.username, "Usuário criado.", "criar usuário");
			
			req.flash('message', "Usuário criado com sucesso.");
			res.redirect('/home/gerente/registrar/usuario');
        });
		
	});
	
	// /HOME/GERENTE/REMOVER/USUARIO
	
	router.get('/home/gerente/remover/usuario', isAuthenticated, isGerente, function(req, res){
		User.find({username: {$ne: 'admin'}}, function(err, users) {
			if (err) return handleError(err,req,res);
			if (users){
				res.render('home_gerente_remover_usuario', {users: users,
				message: req.flash('message')});
			}
			else {
				req.flash('message', "Nenhum usuário existente");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/gerente/remover/usuario', isAuthenticated, isGerente, function(req, res){
		
		User.remove({ 'username' :  req.body.bizu }, function(err) {
			if (err) return handleError(err,req,res);
			
			createLog("Gerência", "", "",
			"", req.user.username, "Usuário " + req.body.bizu + " removido.", "remover usuário");
			
			req.flash('message', "Usuário removido com sucesso");
			res.redirect('/home/gerente/remover/usuario');
			
        });
		
		
	});
	
	// /HOME/GERENTE/ALTERAR/LEITO
	router.get('/home/gerente/alterar/leito', isAuthenticated, isGerente, function(req, res){
		Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
			if (err) return handleError(err,req,res);
			if (leitos){
				
				res.render("home_gerente_alterar_leito", {leitos: leitos, message: req.flash("message")});
				
			}
			else {
				req.flash('message', "!Os Leitos ainda não foram criados");
				res.redirect('/home');
			}
		});
	});
	
	router.post('/home/gerente/alterar/leito', isAuthenticated, isGerente, function(req, res){
		Registro.find({data: {"$gte": data_inicial_rg, "$lte": data_final_rg}}
		, null, {sort: 'data'}, function(err, registros) {
			if (err) return handleError(err, req, res);
			if (registros){
				Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
					if (err) return handleError(err,req,res);
					if (leitos){
						
						console.log(req.param("tipo"));
						if (req.param("tipo") == "remover"){
							for (var i = 0; i < leitos.length; i++){
								if (req.param(leitos[i].cod_leito)){
									
									
									for (var j = 0; j < registros.length; j++){
										registros[j].estado.splice(i,1);
										registros[j].cadastro_id.splice(i,1);
										registros[j].save(function (err) {
											if (err) return handleError(err,req,res);
										});
									}
									
									createLog("Gerência", "", "", leitos[i].cod_leito, req.user.username,
									 "Leito " + leitos[i].cod_leito + " removido.", "remover leito");
									
									Leito.remove({'_id': leitos[i]._id}, function(err) {
										if (err) return handleError(err,req,res);
									});
									
									leitos.splice(i, 1);
									i--;
									
								}
							}
							req.flash('message', "Os leitos foram removidos com sucesso.");
							res.redirect("/home/gerente/alterar/leito");
						}
						else {
							
							var newLeito;
							
							newLeito = createLeito(req.param("bloco"),
							req.param("quarto"), req.param("vaga"));
							
							
							// ADICIONAR NOVO LEITO E ATUALIZAR O REGISTRO DE MANEIRA CORRETA, na posição certa
							
							for (var i = 0; i < leitos.length; i++){
								if (newLeito.cod_leito < leitos[i].cod_leito){
									console.log(leitos[i].cod_leito)
									leitos.splice(i, 0, newLeito);
									
									for (var j = 0; j < registros.length; j++){
										registros[j].estado.splice(i, 0, "livre");
										registros[j].cadastro_id.splice(i, 0, "");
									}
									
									req.flash('message', "O leito foi adicionado com sucesso.");
									
									createLog("Gerência", "", "", newLeito.cod_leito, req.user.username, 
									"Leito " + newLeito.cod_leito + " adicionado.", "adicionar leito");
									
									i = leitos.length;
								}
								else if (newLeito.cod_leito == leitos[i].cod_leito){
									req.flash('message', "!O leito já existe.");
									i = leitos.length;
								}
							}
							
							for (var i = 0; i < leitos.length; i++){
								leitos[i].save(function (err) {
									if (err) return handleError(err,req,res);
								});
							}
							
							for (var j = 0; j < registros.length; j++){
								registros[j].save(function (err) {
									if (err) return handleError(err,req,res);
								});
							}
							
							/*
							newLeito.save(function (err) {
								if (err) return handleError(err,req,res);
							});
							
							
							*/
							
							
							
							res.redirect("/home/gerente/alterar/leito");
						}
						
						
						
					}
					else {
						req.flash('message', "!Os Leitos ainda não foram criados");
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

{ // INFORMAÇÃO
	
	
	// /HOME/INFORMACAO/RELATORIO
	router.get('/home/informacao/relatorio', isAuthenticated, isGerente, function(req, res){
		res.render('home_informacao_relatorio', {message: req.flash('message')});
	});
	
	// /HOME/INFORMACAO/LOG
	router.get('/home/informacao/log', isAuthenticated, isGerente, function(req, res){
		
		var dateIn = moment().subtract(1, 'days');
		var dateOut = moment(dateIn).add(1, 'days');
		if (req.param('dateIn') != undefined && req.param('dateIn')){
			dateIn = moment(req.param('dateIn'));
			dateOut = moment(dateIn);
		}
		if (req.param('dateOut') != undefined && req.param('dateOut')){
			dateOut = moment(req.param('dateOut'));
		}
		
		/*
		var modulo = "";
		var query = "";
		if (req.param("modulo") != undefined){
			modulo = req.param("modulo");
		}
		if (req.param("query") != undefined){
			query = req.param("query");
		}*/
		
		
		Log.find({data: {"$gte": dateIn, "$lte": dateOut}}, function(err, log) {
			
			if (err) return handleError(err,req,res);
			if (log){
				
				res.render("home_informacao_log", {log: log});
			}
			else {
				req.flash('message', "!Log não existente");
				res.redirect('/home');
			}
			
		});
	});
	
	
	// /HOME/INFORMACAO/CADASTRO
	router.get('/home/informacao/cadastro', isAuthenticated, function(req,res){
		Cadastro.find({}, function(err, cadastros) {
			if (err) return handleError(err,req,res);
			if (cadastros){
				res.render('home_informacao_cadastro', {cadastros: cadastros});
			}
			else{
				req.flash('message', 'Não há cadastros');
				res.redirect('/home');
			}
		});
	});
	

	// /HOME/INFORMACAO/REGISTRO_GERAL
	router.get('/home/informacao/registro_geral', isAuthenticated, function(req,res){
		var dateIn = moment().subtract(1, 'days');
		var dateOut = moment(dateIn).add(1, 'days');
		if (req.param('dateIn') != undefined){
			dateIn = moment(req.param('dateIn'));
			dateOut = moment(dateIn);
		}
		if (req.param('dateOut') != undefined && req.param('dateOut')){
			dateOut = moment(req.param('dateOut'));
		}
		
		Registro.find({data: {"$gte": dateIn, "$lte": dateOut}}
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
						
						res.render('home_informacao_registro_geral', 
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

}

{ // FICHA e DADOS


	// /HOME/INFORMACAO/CADASTRO/FICHA
	router.get('/home/ficha/cadastro', isAuthenticated, function(req,res){

		if (req.param('_id') == undefined){
			req.flash('message', '!O cadastro procurado não foi encontrado');
			res.redirect('/home');
		}
		else {
			Cadastro.findOne({_id: req.param('_id')},function(err, cadastro) {
				if (err) return handleError(err,req,res);
				if (cadastro){
					
					res.render('home_ficha_cadastro', { cadastro: cadastro });
				}
				else {
					req.flash('message', "!Cadastro não existente");
					res.redirect('/home');
				}
			
			});
		}
	});
	
	// /HOME/INFORMACAO/CADASTRO/DADOS
	router.get('/home/dados/cadastro', isAuthenticated, function(req,res){

		if (req.param('_id') == undefined){
			req.flash('message', 'O cadastro procurado não foi encontrado');
			res.redirect('/home');
		}
		else {
			Cadastro.findOne({_id: req.param('_id')},function(err, cadastro) {
				if (err) return handleError(err,req,res);
				if (cadastro){
					
					Financeiro.findOne({}, function(err, financeiro) {
						if (err) return handleError(err,req,res);
						if (financeiro){
							
							
							var dateIn;
							var dateOut;
							
							if (cadastro.checkIn){
								dateIn = moment(cadastro.checkIn);
							} else {
								dateIn = moment(cadastro.dateIn).hour(12);
							}
							
							if (cadastro.checkOut){
								dateOut = moment(cadastro.checkOut);
							} else {
								dateOut = moment(cadastro.dateOut).hour(12);
							}
							
							
							
							var hours = dateOut.diff(dateIn,"hours");
							
							console.log(dateIn)
							console.log(dateOut)
							console.log(hours)
							
							
							if (hours < 24){
								hours = 24;
							}
							
							var custo = hours*financeiro.dic_posto_valor[cadastro.posto]/24;
							
							
							res.render('home_dados_cadastro', { cadastro: cadastro, custo: custo, message: req.flash("message")});
						}
						else {
							req.flash('message', "!O sistema não está disponível. Problemas no setor Financeiro.");
							res.redirect('/');
						}
					});		
					
					
					
				}
				else {
					req.flash('message', "Cadastro não existente");
					res.redirect('/home');
				}
			
			});
		}
	});
	
	// /HOME/INFORMACAO/CADASTRO/DADOS/EDITAR
	router.get('/home/dados/cadastro/editar', isAuthenticated, function(req,res){

		if (req.param('_id') == undefined){
			req.flash('message', 'O cadastro procurado não foi encontrado');
			res.redirect('/home');
		}
		else {
		
			Cadastro.findOne({_id: req.param('_id')},function(err, cadastro) {
				if (err) return handleError(err,req,res);
				if (cadastro){
					
					res.render('home_dados_cadastro_editar', { cadastro: cadastro, message: req.flash("message") });
				}
				else {
					req.flash('message', "Cadastro não existente");
					res.redirect('/home');
				}
			
			});
		}
	});
	
	// ADD LOG
	router.post('/home/dados/cadastro/editar', isAuthenticated, function(req,res){

		if (req.param('_id') == undefined){
			req.flash('message', 'O cadastro procurado não foi encontrado');
			res.redirect('/home');
		}
		
		Cadastro.findOne({_id: req.param('_id')},function(err, cadastro) {
			if (err) return handleError(err,req,res);
			if (cadastro){
				cadastro.name = req.param("name");
				cadastro.nome_guerra = req.param("name_guerra");
				cadastro.saram = req.param("saram");
				cadastro.identidade = req.param("identidade");
				cadastro.unidade = req.param("unidade");
				cadastro.endereco = req.param("endereco");
				cadastro.telefone = req.param("telefone");
				cadastro.email = req.param("email");
				cadastro.cpf = req.param("cpf");
				
				cadastro.save(function (err) {
					if (err) return handleError(err,req,res);
				});
				
				//ADD LOG
				req.flash('message', "Cadastro editado com sucesso");
				res.redirect('/home/dados/cadastro?_id='+cadastro._id);
			}
			else {
				req.flash('message', "Cadastro não existente");
				res.redirect('/home');
			}
		
		});
	});
	
	
	// /HOME/INFORMACAO/LAVANDERIA/FICHA
	router.get('/home/ficha/lavanderia', isAuthenticated, function(req,res){

		if (req.param('_id') == undefined){
			req.flash('message', 'A folha de lavanderia procurada não foi encontrada');
			res.redirect('/home');
		}
		
		Folha.findOne({_id: req.param('_id')},function(err, folha) {
			if (err) return handleError(err,req,res);
			if (folha){
				res.render('home_ficha_lavanderia', { folha: folha, descricoes: desc_itens_lavanderia});
			}
			else {
				req.flash('message', "Folha não existente");
				res.redirect('/home');
			}
		});
	});
	
	// /HOME/INFORMACAO/USUARIO/DADOS
	router.get('/home/dados/usuario', isAuthenticated, function(req,res){

		if (req.param('_id') == undefined){
			req.flash('message', 'O usuário procurado não foi encontrado');
			res.redirect('/home');
		}
		
		User.findOne({_id: req.param('_id')},function(err, user) {
			if (err) return handleError(err,req,res);
			if (user){
				
				res.render('home_dados_usuario', { user: user, dic: dicionario_permissao });
			}
			else {
				req.flash('message', "Usuário não existente");
				res.redirect('/home');
			}
		
		});
	});
	
	
	
}

{ // INICIO
	
	// /HOME
	router.get('/home', isAuthenticated, function(req, res){
		res.render('home', { user: req.user, message: req.flash('message')});
	});
	
	// /HOME/LOGOUT
	router.get('/home/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	
	// /HOME/SENHA
	router.get('/home/senha', isAuthenticated, function(req, res){
		res.render('home_senha', { user: req.user, message: req.flash('message')});
	});
	
	router.post('/home/senha', isAuthenticated, function(req, res){
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
						res.redirect('/home/senha');
					}
				}
				else {
					req.flash('message', '!Senha antiga incorreta.');
					res.redirect('/home/senha');
				}
			}
			else {
				req.flash('message', '!Usuário não existe.');
				res.redirect('/home');
			}
		});
	});

}

{ // Criar/Delete/Debug ** Alterar data de registro/log para até 2020
	
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
		Folha.remove({}, function(err){
			console.log("Folha removed");
		});
		
		res.send("criar");
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
		res.redirect('/criar/financeiro');
		
	});
	
	router.get('/criar/financeiro', function(req, res){
		var newFinanceiro = new Financeiro();
		newFinanceiro.gasto = 0;
		newFinanceiro.ganho = 0;
		newFinanceiro.num_registro = 0;
		newFinanceiro.dic_posto_valor = dicionario_posto_valor;
		newFinanceiro.blacklist = [];
		newFinanceiro.save(function (err) {
			if (err) return handleError(err,req,res);
		});
		res.redirect('/criar/leitos');
		
	});
	
	/*
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
	*/
	
	router.get('/criar/leitos', function(req,res){
		var newLeito;
		//A
		
		for(var i = 1; i <= 9; i++){
			newLeito = createLeito("A" , '0' + i , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("A" , '0'+ i , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		
		for(var i = 10; i <= 18; i++){
			newLeito = createLeito("A" , i , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("A" , i , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		
		newLeito = createLeito("A" , "19" , "a");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("A", "19", "b");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("A", "19" , "c");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("A", "20", "a");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});		
		newLeito = createLeito("A", "21", "a");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});		


		//B

		newLeito = createLeito("B", "01", "a");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		for(var i = 2; i <= 9; i++){
			newLeito = createLeito("B" , '0' + i.toString() , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("B" , '0' + i.toString() , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		for(var i = 10; i <= 19; i++){
			newLeito = createLeito("B" , i , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("B" , i  , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		
		

		//C

		for(var i = 1; i <= 9; i++){
			newLeito = createLeito("C" , '0' + i , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("C" , '0' + i , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("C" , '0' + i , "c");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		for(var i = 10; i <= 25; i++){
			newLeito = createLeito("C" , i , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("C" , i , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("C" , i , "c");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		
		
		for(var i = 26; i <= 35; i++){
			newLeito = createLeito("C" , i , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("C" , i , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}

		//D
		for(var i = 101; i <= 119; i++){
			newLeito = createLeito("D" , i , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "c");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "d");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		newLeito = createLeito("D" , "200", "a");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("D", "200", "b");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("D", "200", "c");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		newLeito = createLeito("D", "200", "d");
		newLeito.save(function(err){
			if(err) return handleError(err,req,res);
		});
		for(var i = 202; i <= 221; i++){
			newLeito = createLeito("D" , i , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "c");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "d");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		for(var i = 222; i <= 223; i++){
			newLeito = createLeito("D" , i , "a");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "b");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "c");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "d");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
			newLeito = createLeito("D" , i , "e");
			newLeito.save(function(err){
				if(err) return handleError(err,req,res);
			});
		}
		setTimeout(function () {res.redirect('/criar/registro')}, 2000);
	});
	
	router.get('/criar/registro', function(req, res){
		Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
			if (err) return handleError(err,req,res);
			if (leitos){
				var dataInicial = data_inicial_rg;
				var dataFinal = data_final_rg;
				var proximoDia = moment(dataInicial);
				
				while (proximoDia < dataFinal){
					var newRegistro = new Registro();
					newRegistro.data = moment(proximoDia);
					newRegistro.estado = [];
					newRegistro.cadastro_id = [];
					//newRegistro.log = [];
					//newRegistro.ganho = 0;
					//newRegistro.gasto = 0;
					for (var i = 0; i < leitos.length; i++){
						newRegistro.estado[newRegistro.estado.length] = "livre";
						newRegistro.cadastro_id[newRegistro.cadastro_id.length] = "";
					}
					newRegistro.save(function (err) {
						if (err) return handleError(err,req,res);	
					});
					proximoDia.add(1, 'days')
					proximoDia.hour(0);
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
				var dataInicial = moment('2018-01-01');
				var dataFinal = moment('2019-01-01');
				var proximoDia = moment(dataInicial);
				
				while (proximoDia < dataFinal){
					var newLog = new Log();
					newLog.data = moment(proximoDia);
					newLog.modulo = [];
					newLog.log = [];
					newLog.query = [];
					newLog.horario = [];
					newLog.cadastro = [];
					newLog.cadastro_id = [];
					newLog.usuario = [];
					newLog.leito = [];
					newLog.ganho = 0;
					newLog.gasto = 0;
					newLog.save(function (err) {
						if (err) return handleError(err,req,res);	
					});
					proximoDia.add(1, 'days')
					proximoDia.hour(0);
				}
				res.redirect('/populate');
			}
			else {
				req.flash('message', "Os Leitos ainda não foram criados");
				res.redirect('/');
			}
		});
	});

	router.get('/populate', function(req, res){
		for (var i = 1; i < 10; i++){
			createCadastro( "hospede"+i, "guerra"+i, 1111111*i, 111111*i,
			"unidade"+i, "endereço"+i, 
			"("+i+i+")"+" "+i+i+i+i+i+"-"+i+i+i+i, 
			i + "email@email.com", ""+i+i+i+"."+i+i+i+"."+i+i+i+"-"+i+i,
			moment().format("YYYY-MM-DD"),
			moment().add(i+1, "days").format("YYYY-MM-DD"),
			0, "1o Tenente", "curso"+i, "Aluno", "M"
			);
		}
		res.redirect('/');
	});
	
	// DEBUG
	router.get('/debug', function(req, res){
		if (debug){
			req.flash('message', 'Debug desabilitado');
			debug = false;
		}
		else {
			req.flash('message', 'Debug habilitado');
			debug = true;
		}
		
		res.redirect('/home');
	});
	
	router.get('/financeiro', function(req, res){
		
		Financeiro.remove({}, function(err) { 
			console.log('Financeiro removed')
		});
		
		setTimeout(function () {
			var newFinanceiro = new Financeiro();
			newFinanceiro.gasto = 0;
			newFinanceiro.ganho = 0;
			newFinanceiro.dic_posto_valor = dicionario_posto_valor;
			newFinanceiro.save(function (err) {
				if (err) return handleError(err,req,res);
			});
			res.redirect('/');
		}, 1000);
	});

	router.get('/log', function(req, res){
		
		Log.remove({}, function(err) { 
			console.log('Financeiro removed')
		});
		
		setTimeout(function () {
			Leito.find({}, null, {sort: 'cod_leito'}, function(err, leitos) {
				if (err) return handleError(err,req,res);
				if (leitos){
					var dataInicial = moment('2018-01-01');
					var dataFinal = moment('2019-01-01');
					var proximoDia = moment(dataInicial);
					
					while (proximoDia < dataFinal){
						var newLog = new Log();
						newLog.data = moment(proximoDia);
						newLog.modulo = [];
						newLog.log = [];
						newLog.query = [];
						newLog.horario = [];
						newLog.cadastro = [];
						newLog.cadastro_id = [];
						newLog.usuario = [];
						newLog.leito = [];
						newLog.ganho = 0;
						newLog.gasto = 0;
						newLog.save(function (err) {
							if (err) return handleError(err,req,res);	
						});
						proximoDia.add(1, 'days')
						proximoDia.hour(0);
					}
					res.redirect('/');
				}
				else {
					req.flash('message', "Os Leitos ainda não foram criados");
					res.redirect('/');
				}
			});
		}, 1000);
	});
	
	
}
	
	return router;
}

{ // Functions

function createLog(modulo, cadastro, cadastro_id, leito, username, log_, query){
	Log.findOne({data: {"$gte": moment().subtract(1, 'days'), "$lte": moment()}}, function(err, log) {
		if (err) return handleError(err,req,res);
		if (log){
			log.modulo.push(modulo);
			log.horario.push(moment().format("HH:mm:ss"));
			log.log.push(log_);
			log.cadastro.push(cadastro);
			log.cadastro_id.push(cadastro_id);
			log.leito.push(leito);
			log.usuario.push(username);
			log.query.push(query);
			log.save(function (err) {
				if (err) return handleError(err,req,res);
			});
		}
		else{
			req.flash('message', '!É necessário criar o Log');
		}
	});
}

function createLeito(bloco,quarto,vaga){
	var ret = new Leito();
	//ret.cod_leito = cod_leito;
	ret.limpeza = "limpo";
	ret.ocupabilidade = "normal";
	ret.manutencao = [];
	ret.bloco = bloco;
	ret.quarto = quarto;
	ret.vaga = vaga;
	ret.cod_leito = bloco + "" + quarto + "" + vaga;
	return ret;
}

function createCadastro(name, guerra, saram, identidade, unidade, endereco,
telefone, email, cpf, dateIn, dateOut, dependente, posto, curso, solicitante, sexo){
	var newCadastro = new Cadastro();
	newCadastro.name = name;
	newCadastro.name_guerra = guerra;
	newCadastro.saram = saram;
	newCadastro.identidade = identidade;
	newCadastro.unidade = unidade;
	newCadastro.endereco = endereco;
	newCadastro.telefone = telefone;
	newCadastro.email = email;
	newCadastro.cpf = cpf;
	newCadastro.dateIn = moment(dateIn).format("YYYY-MM-DD");
	newCadastro.dateOut = moment(dateOut).format("YYYY-MM-DD");
	newCadastro.dependente = dependente;
	newCadastro.posto = posto;
	newCadastro.curso = curso; 
	newCadastro.solicitante = solicitante;
	newCadastro.sexo = sexo;
	newCadastro.estado = "solicitação de reserva";
	newCadastro.custo_estada = 0;
	newCadastro.valor_pago = 0;
	newCadastro.save(function (err) {
		if (err) return handleError(err,req,res);
	});
}

function acceptMail(cadastro){
	
	var text = 'A solicitação de reserva do ' + cadastro.posto
	+ " " + cadastro.name_guerra + " foi realizada com sucesso." + 
	" A hospedagem será no leito " + cadastro.leito + " do dia " +
	moment(cadastro.dateIn).format("DD/MM/YYYY") + " ao dia " +
	moment(cadastro.dateOut).format("DD/MM/YYYY") + "." +
	"\n\n\nEssa mensagem é gerada automaticamente pelo sistema. O sistema ainda está em fase de teste.";
	
	var mailOptions = {
		from: 'hotel.icea@gmail.com',
		to: cadastro.email,
		subject: 'Solicitação de reserva confirmada',
		text: text
	};

	transporter.sendMail(mailOptions, function(error, info){
		if (error) {
			console.log(error);
		} else {
			console.log('Email sent: ' + info.response);
		}
	});
}

function rejectMail(cadastro, motivo){
	
	var text = 'A solicitação de reserva do ' + cadastro.posto + " " + cadastro.name_guerra +
	" foi rejeitada pelo seguinte motivo: " + motivo + "." + 
	"\n\n\nEssa mensagem é gerada automaticamente pelo sistema. O sistema ainda está em fase de teste.";
	
	var mailOptions = {
		from: 'hotel.icea@gmail.com',
		to: cadastro.email,
		subject: 'Solicitação de reserva rejeitada',
		text: text
	};

	transporter.sendMail(mailOptions, function(error, info){
		if (error) {
			console.log(error);
		} else {
			console.log('Email sent: ' + info.response);
		}
	});
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

var isLavanderia = function (req, res, next) {
	if (debug) return next();
	if (req.user.permissao[2] == true){
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

var dicionario_query = {
'/': "cadastrar",
'/home/recepcao/checkin': "check-in",
'/home/recepcao/checkin/cancelar': "cancelar check-in",
'/home/recepcao/checkout': "check-out",
'/home/recepcao/estender': "estender estada",
'/home/recepcao/mudanca': "mudança",
'/home/reserva': "reservar",
'/home/reserva/cancelar': 'cancelar solicitação',
'/home/lavanderia/folha': 'inserir folha',
'/home/manutencao/quadro/alterar': 'inserir pane',
'/home/manutencao/quadro/alterar_': 'ocupabilidade',
'/home/manutencao/quadro/alterar__': 'remover pane',
'/home/financeiro/inserir': 'inserir financeiro',
'/home/financeiro/alterar': 'alterar diária',
'/home/gerente/permissao': 'alterar permissão',
'/home/gerente/signup': 'criar usuário',
'/home/gerente/remover/usuario': 'remover usuário'
};

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

var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'hotel.icea@gmail.com',
		pass: 'Senha123'
	}
});
	

var debug = true;
	
var data_inicial_rg = moment('2018-01-01');
var data_final_rg = moment('2019-01-01');
	


}
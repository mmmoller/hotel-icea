var express = require('express');
var router = express.Router();


	
	router.get('/teste', function(req,res){
		/*
		var teste = new Teste()
		teste.teste1 = "teste";
		teste.save(function (err) {
			if (err) return handleError(err,req,res);
			else {
				console.log("teste criado com sucesso");
			}
		});*/
		res.send("teste");
	});
	
	router.get('/teste2', function(req,res){
		/*
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
        });*/
		res.send("teste2")
	});
	
	router.get('/teste3', function(req,res){
		/*
		Teste.remove({}, function(err) { 
			console.log('Teste removed')
		});*/
		res.send("teste3")
	});
	
module.exports = router;
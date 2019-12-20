 /**
  * Este código presenta una forma web para subir contenido a un bucket de 
  * IBM Cloud Object Storate. Utiliza frameworks de node como express, ibm-cos-sdk, fs, express-fileupload
  * para presentar una pantalla web con una forma para recibir un archivo del filesystem de un cliente 
  * para luego enviarlo al bucket seleccionado. 
  * 
  * La configuración se debe pasar como variables de entorno (ver sección de constantes para adecuar los valores). Los 
  * valores se deben tomar de la pantalla de "Service Credentials" dentro de IBM Cloud Object Storage habilitadas para el bucket seleccionado.
  * 
  * autoría: Gerardo Pichardo - gapichardo@mx1.ibm.com, joseluisrg@mx1.ibm.com
  * 
  * Basado en código de conexión a IBM Cloud COS - cloud.ibm.com
  * 
  */


var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fileUpload = require('express-fileupload');

var baseRouter = require('./routes/base');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

app.use('/', baseRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.error(err)
  res.render('error');
});

module.exports = app;
//To be deleted after app set (not for prod, only dev)
//app.listen(3000)

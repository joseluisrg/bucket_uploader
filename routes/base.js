 /**
  * Este código presenta una forma web para subur contenido a un bucket de 
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

 const express = require('express');
 router = express.Router();
 const RP = require('request-promise');
 const IBM_ICOS = require('ibm-cos-sdk');

 // Constantes de conexión para IBM COS values desde variables de entorno. Obtenerlos en la sección de credenciales en "See credentials" de tu bucket.
 // Aparecen en JSON
const COS_API_KEY = process.env.COS_API_KEY; 
const COS_ENDPOINTS = process.env.COS_ENDPOINTS ; 
const COS_IAM_APIKEY_DESC = process.env.COS_IAM_APIKEY_DESC;
const COS_IAM_APIKEY_NAME = process.env.COS_IAM_APIKEY_NAME;
const COS_IAM_ROLE_CRN = process.env.COS_IAM_ROLE_CRN;
const COS_IAM_SERVICE_ID_CRN = process.env.COS_IAM_SERVICE_ID_CRN;
const COS_IAM_RESOURCE_INSTANCE_ID = process.env.COS_IAM_RESOURCE_INSTANCE_ID;
const COS_TARGET_BUCKET_NAME = COS_IAM_APIKEY_NAME; //Es el mismo de hecho que el key name. Se abstrae así para entender mejor el código

//Conexión por defecto. Obtener en la sección Public Endpoints en la pantalla de "Configuration" dentro de "Buckets" de IBM Cloud Object Storage
const COS_DEFAULT_ENDPOINT = 's3.us.cloud-object-storage.appdomain.cloud';

//Configuration formulation
var CONFIG = {
  useHmac: false,
  bucketName: COS_TARGET_BUCKET_NAME,
  serviceCredential: {
      "apikey": COS_API_KEY,
      "endpoints": COS_ENDPOINTS,
      "iam_apikey_description": COS_IAM_APIKEY_DESC,
      "iam_apikey_name": COS_IAM_APIKEY_NAME, //Este de hecho es el nombre del bucket!
      "iam_role_crn": COS_IAM_ROLE_CRN,
      "iam_serviceid_crn": COS_IAM_SERVICE_ID_CRN,
      "resource_instance_id": COS_IAM_RESOURCE_INSTANCE_ID
    }
};

//console.debug("Configuración cargada %j", CONFIG) //Eliminar línea para producción.

/**
* Dado que el servicio de ICOS es multiregión, se obtiene la lista de endpoints posibles para
* el upload
*/
const getEndpoints = async (endpointsUrl) => {
  console.info('======= Getting Endpoints =========');

  const options = {
      url: endpointsUrl,
      method: 'GET'
  };
  const response = await RP(options);
  return JSON.parse(response);
};

  /*
  * Con los urls de los endpoints url se extrae uno basado en el atrubuto de LocationConstraint
  */
const findBucketEndpoint = (bucket, endpoints) => {
  const region = bucket.region || bucket.LocationConstraint.substring(0, bucket.LocationConstraint.lastIndexOf('-'));
  const serviceEndpoints = endpoints['service-endpoints'];
  const regionUrls = serviceEndpoints['cross-region'][region]
  || serviceEndpoints.regional[region]
  || serviceEndpoints['single-site'][region];

  if (!regionUrls.public || Object.keys(regionUrls.public).length === 0) {
    return '';
  }
  return Object.values(regionUrls.public)[0];
};

/**
 * 
 * Con el endpoint seleccionado se construye el objeto del SDK que tiene la lógica para interactuar con la API de ICOS, basada en el protocolo S3
 * junto con las credenciales.
 */
const getS3 = async (endpoint, serviceCredential) => {
  let s3Options;

  if (serviceCredential.apikey) {
    /* Para este ejemplo no usaremos HMAC como metodo de acceso sino IAM con la API key */
    s3Options = {
      apiKeyId: serviceCredential.apikey,
      serviceInstanceId: serviceCredential.resource_instance_id,
      region: 'ibm',
      endpoint: new IBM_ICOS.Endpoint(endpoint),
    };
  } else {
    throw new Error('Se requere una API key para construir el cliente de S3 para ICOS');
  }

  console.info(' ===  Opciones usadas para el cliente S3 de ICOS\n', s3Options);
  return new IBM_ICOS.S3(s3Options);
};

 /**
  * Cada bucket tiene una ubicación posible, esta función obtiene los endpoints para cada bucket.
  */
  const listBuckets = async (s3, bucketName) => {
    const params = {
      Prefix: bucketName
    };
    console.error('\n Fetching extended bucket list to get Location');
    const data = await s3.listBucketsExtended(params).promise();
    console.info(' Response: \n', JSON.stringify(data, null, 2));
  
    return data;
  };

/**
 * Esta es la función principal para subir contenido a ICOS. Su naturaleza es asíncrona. tiene que estar dentro de un bloque try-cath
 */
const upload = async (fileBuffer, res) => {
  /* Extrae las credenciales y el Bucketname del json de configuración  */
  const { serviceCredential } = CONFIG;
  const { bucketName } = CONFIG;

  /* Dependiendo de si se usa HMAC o no, se configura el cliente de S3 para ICOS. 
  * este cliente está disponible como paquete de node en  https://www.npmjs.com/package/ibm-cos-sdk */
  let s3;
  if (!CONFIG.useHmac) {
    s3 = await getS3(COS_DEFAULT_ENDPOINT, serviceCredential);
  } else {
    s3 = await getS3Hmac(COS_DEFAULT_ENDPOINT, serviceCredential);
  }
  /* Extraemos la lista de buckets y sus ubicaciones*/
  const data = await listBuckets(s3, bucketName);
  const bucket = data.Buckets[0];
  /* Extraemos los endpoints válidos para el bucketName elegido*/
  const endpoints = await getEndpoints(serviceCredential.endpoints);
  s3.endpoint = findBucketEndpoint(bucket, endpoints);
  
  /* hacer la operación PUT en el Bucket */
  await putOnBucket(s3, bucketName, fileBuffer, res);
} 

/** Esta es la función interna de S3 que se construye con un Buffer con datos binarios con Base 64 */
const putOnBucket = async (s3, bucketName, fileBuffer, res) => {
  try {
    console.log('Creating new item: ', fileBuffer.name);
    var base64Filedata = Buffer.from(fileBuffer.data); 
    const objeto = {
      Bucket: bucketName,
      Key: fileBuffer.name,
      Body: base64Filedata,
      Metadata: {
        fileType: 'test'
      }
    };
    console.info(' Subiendo objeto \n', objeto);

    const data = await Promise.all([
      s3.putObject(objeto).promise()
    ]);
    console.info(' Respuesta: \n', JSON.stringify(data, null, 2));
    res.status(200);
    console.log("Archivo almacenado exitosamente.")
    res.status(200).send("Archivo almacenado en bucket exitosamente.");
    return true;
  } catch (err) {
    console.error('Error de S3');
    console.error('statusCode: ', err.statusCode);
    console.error('mensaje: ', err.message);
    console.error('stack: ', err.stack);
    res.status(500).send("Error al subir el archivo.");
    process.exit(1);
  }
}
/* Hace el render del home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

/* Esta función es la que recibe el archivo del cliente web */
router.post('/upload', function(req, res, next) {

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No se recibieron archivos.');
  } else {
    let sampleFileBuffer = req.files.file;
    upload(sampleFileBuffer, res);
  }
});

module.exports = router;







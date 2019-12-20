 # Bucket Uploader
 ### Preparado para IBM Cloud Object Storage

 Este código presenta una forma web para subur contenido a un bucket de  IBM Cloud Object Storate. Utiliza frameworks de node como express, ibm-cos-sdk, fs, express-fileupload para presentar una pantalla web con una forma para recibir un archivo del filesystem de un cliente para luego enviarlo al bucket seleccionado. 
 
 La configuración se debe pasar como variables de entorno (ver sección de constantes para adecuar los valores). Los valores se deben tomar de la pantalla de "Service Credentials" dentro de IBM Cloud Object Storage habilitadas para el bucket seleccionado.

autoría: Gerardo Pichardo - gapichardo@mx1.ibm.com, joseluisrg@mx1.ibm.com
 
Basado en código de conexión a IBM Cloud COS - cloud.ibm.com

Para poder ejecutar el servicio en localmente o en un runtime de node (kubernetes, cloudfoundry, etc.):

´´´
npm build
npm start
´´´
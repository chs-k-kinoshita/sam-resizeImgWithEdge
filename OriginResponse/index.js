'use strict';

const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const ssm = new AWS.SSM({region: 'us-east-1'});
const Sharp = require('sharp');

const SSMParameterName = 'Sample-OriginResponseFunction-Params';

/**
 * OriginResponseFunction.
 */
exports.handler = async (event, context, callback) => {
  let response = event.Records[0].cf.response;

  console.log('Response status code :%s', response.status);
  // check if image is not present
  if (response.status != '404') {
    callback(null, response);
    return;
  }

  let request = event.Records[0].cf.request;
  let path = request.uri;
  // read the S3 key from the path variable. Ex: path variable /images/w100/image.jpg
  let key = path.substring(1);

  const keyParts = key.split('/');
  const fileName = keyParts[keyParts.length - 1];
  const fileNameParts = fileName.split('.');
  const extention = fileNameParts[fileNameParts.length - 1];

  // correction for jpg required for 'Sharp'
  const requiredFormat = extention === 'jpg' ? 'jpeg' : extention;

  if (!(requiredFormat === 'jpeg' || requiredFormat === 'png')) {
    // support only jpeg or png.
    callback(null, response);
    return;
  }

  // get width. Ex: images/w100/image.jpg → 100
  let width;
  const widthPart = keyParts[keyParts.length - 2];
  try {
    width = parseInt(widthPart.substring(1), 10);
  } catch (err) {
    console.log('cannot get width from widthPart: %s', widthPart);
    callback(null, response);
    return;
  }

  // remove width part. Ex: images/w100/image.jpg → images/image.jpg
  keyParts.splice(keyParts.length - 2, 1);
  const originalKey = keyParts.join('/');
  
  const ssmReq = {
    Name: SSMParameterName
  };
  // get parameters from SSM Parameterstore.
  const ssmRes = await ssm.getParameter(ssmReq).promise();
  console.log('ssmResValue:', ssmRes.Parameter.Value);
  const envParams = JSON.parse(ssmRes.Parameter.Value);
  const originBucket = envParams['bucketName'];
  const cacheControl = envParams['cacheControl']; // ex) 'max-age=31536000'

  // get the source image file
  console.log('getObject originalKey:', originalKey);
  let s3Data;
  try {
    s3Data = await s3.getObject({ Bucket: originBucket, Key: originalKey }).promise();
  } catch (err) {
    console.log('Err getObject', err);
    callback(null, response);
    return;
  }

  // perform the resize operation
  const sharpedBuff = await Sharp(s3Data.Body).resize(width).toBuffer();

  // save the resized object to S3 bucket with appropriate object key.
  try {
    await s3.putObject({
      Body: sharpedBuff,
      Bucket: originBucket,
      ContentType: 'image/' + requiredFormat,
      CacheControl: cacheControl,
      Key: key,
      StorageClass: 'STANDARD'
    }).promise();
  } catch (err) {
    console.log('Exception while writing resized image to bucket', err);
    callback(null, response);
    return;
  }
  console.log('resized:', originalKey);

  // generate a binary response with resized image
  response.status = '200';
  response.body = sharpedBuff.toString('base64');
  response.bodyEncoding = 'base64';
  response.headers['content-type'] = [{ key: 'Content-Type', value: 'image/' + requiredFormat }];
  response.headers['cache-control'] = [{ key: 'Cache-Control', value: cacheControl }];
  response.headers['etag'] = [{ key: 'etag', value: s3Data.ETag }];
  response.headers['last-modified'] = [{ key: 'Last-Modified', value: s3Data.LastModified }];
  
  callback(null, response);
};
#!/usr/bin/env node// Author: Gross Corporation, https://github.com/grosscorporation/ecs-environment-variables

const { SecretsManager } = require('@aws-sdk/client-secrets-manager');
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3")
const fs = require('fs')

try {
	if (process.env.NODE_ENV === 'development') {
		require('dotenv').config({ path: process.cwd() + '/.env' })
	}
} catch (e) { }

require('dotenv').config({ path: process.cwd() + '/.env' })

// const IS_GITHUB_ACTION = !!process.env.GITHUB_ACTIONS

const appName = process.argv.splice(2)[0] || process.env.INPUT_SLUG || 'ecs-environment-variables'
const region = process.env.INPUT_REGION || process.env.AWS_REGION || 'us-east-1'

const secretName = process.env.INPUT_SECRET_NAME || process.env.SECRET_NAME
const secretFileName = process.env.INPUT_SECRET_FILE_NAME || process.env.SECRET_FILE_NAME
const bucketName = process.env.INPUT_BUCKET_NAME || process.env.BUCKET_NAME

console.log('###############################################################')
console.log('APP_SLUG ENV ~ ', appName)
console.log('###############################################################')

console.log('###############################################################')
console.log('REGION ~ ', region)
console.log('###############################################################')

console.log('###############################################################')
console.log('SECRET NAME ~ ', secretName)
console.log('###############################################################')

const awsConfig = {
	region,
	accessKeyId: process.env.INPUT_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.INPUT_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY
}

const client = new SecretsManager(awsConfig)

const s3Client = new S3Client({
	region,
	credentials: {
		accessKeyId: process.env.INPUT_AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.INPUT_AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY
	},
})

const uploadFileToS3 = async (filePath) => {
	const fileStream = fs.createReadStream(filePath)
	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: secretFileName,
		Body: fileStream
	  })
	
	  try {
		const response = await s3Client.send(command)
		console.log(response)
	  } catch (err) {
		console.error(err)
	  }
}

client.getSecretValue({ SecretId: secretName }, (err, data) => {
	if (err) {
		throw err
	} else if ('SecretString' in data) {
		const secrets = JSON.parse(data.SecretString)
		let envFile = ''
		for (const key of Object.keys(secrets)) {
			envFile += `${key}=${secrets[key]}\n`
		}

		fs.writeFileSync(`./${secretFileName}`, envFile)
		uploadFileToS3(`./${secretFileName}`).catch(console.trace)
	}
})

setTimeout(() => { }, 5000)

return 'done'

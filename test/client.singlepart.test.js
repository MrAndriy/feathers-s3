
import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import feathersClient from '@feathersjs/client'
import feathersSocketio from '@feathersjs/socketio'
import io from 'socket.io-client'
import { Service, getClientService } from '../lib/index.js'
import fs from 'fs'
import { Blob } from 'buffer'

let serverApp, expressServer, clientApp, s3Service, s3ClientService

const options = {
  s3Client: {
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    signatureVersion: 'v4'
  },
  bucket: process.env.S3_BUCKET,
  prefix: 'feathers-s3'
}

let transport

const textFileId = 'text.txt'
const imageFileId = 'image.png'
const archiveFileId = 'archive.zip'

describe('feathers-s3-client-singlepart', () => {
  before(async () => {
    chailint(chai, util)
    serverApp = express(feathers())
    serverApp.configure(feathersSocketio())
    expressServer = await serverApp.listen(3000)
    clientApp = feathersClient()
    const socket = io('http://localhost:3000')
    transport = feathersClient.socketio(socket)
    clientApp.configure(transport)
  })
  it('is ES module compatible', () => {
    expect(typeof Service).to.equal('function')
    expect(typeof getClientService).to.equal('function')
  })
  it('create s3Service', () => {
    serverApp.use('s3', new Service(options), {
      methods: ['create', 'get', 'remove', 'createMultipartUpload', 'completeMultipartUpload', 'uploadPart', 'putObject']
    })
    s3Service = serverApp.service('s3')
    expect(s3Service).toExist()
  })
  it('create s3ClientService', () => {
    s3ClientService = getClientService(clientApp, { servicePath: 's3', transport, useProxy: true })   
    expect(s3ClientService).toExist()
    expect(s3ClientService.createMultipartUpload).toExist()
    expect(s3ClientService.completeMultipartUpload).toExist()
    expect(s3ClientService.uploadPart).toExist()
    expect(s3ClientService.putObject).toExist()
    expect(s3ClientService.upload).toExist()
    expect(s3ClientService.download).toExist()
  })
  it('upload text file', async () => {
    const blob = new Blob([fs.readFileSync('test/data/text.txt')], { type: 'text/plain' })
    const response = await s3ClientService.upload(textFileId, blob, { expiresIn: 30 })
    expect(response.ok).toExist()
    expect(response.status).to.equal(200)
    expect(response.ETag).toExist()
  })
  it('upload image file', async () => {
    const blob = new Blob([fs.readFileSync('test/data/image.png')], { type: 'image/png' })
    const response = await s3ClientService.upload(imageFileId, blob, { expiresIn: 30 })
    expect(response.ok).toExist()
    expect(response.status).to.equal(200)
    expect(response.ETag).toExist()
  })
  it('upload zip file', async () => {
    const blob = new Blob([fs.readFileSync('test/data/archive.zip')], { type: 'application/zip' })
    const response = await s3ClientService.upload(archiveFileId, blob, { expiresIn: 30 })
    expect(response.status).to.equal(200)
    expect(response.ETag).toExist()
  })
  it('download text file', async () => {
    const filePath = 'test/data/downloaded-text.txt'
    const response = await s3ClientService.download(textFileId, { expiresIn: 30 })
    expect(response.ok).toExist()
    expect(response.status).to.equal(200)
    expect(response.type).to.equal('text/plain')
    expect(response.buffer).toExist()
    fs.writeFileSync(filePath, Buffer.from(response.buffer))
    expect(fs.existsSync(filePath)).beTrue()
    fs.unlinkSync(filePath)
  })
  it('download image file', async () => {
    const filePath = 'test/data/downloaded-image.png'
    const response = await s3ClientService.download(imageFileId, { expiresIn: 30 })
    expect(response.ok).toExist()
    expect(response.status).to.equal(200)
    expect(response.type).to.equal('image/png')
    expect(response.buffer).toExist()
    fs.writeFileSync(filePath, Buffer.from(response.buffer))
    expect(fs.existsSync(filePath)).beTrue()
    fs.unlinkSync(filePath)
  })
  it('download zip file', async () => {
    const filePath = 'test/data/downloaded-archive.zip'
    const response = await s3ClientService.download(archiveFileId, { expiresIn: 30 })
    expect(response.ok).toExist()
    expect(response.status).to.equal(200)
    expect(response.type).to.equal('application/zip')
    expect(response.buffer).toExist()
    fs.writeFileSync(filePath, Buffer.from(response.buffer))
    expect(fs.existsSync(filePath)).beTrue()
    fs.unlinkSync(filePath)
  })
  it('delete text file', async () => {
    const response = await s3ClientService.remove(textFileId, { expiresIn: 30 })
    expect(response.ok).toExist()
    expect(response.status).to.equal(200)
  })
  it('delete image file', async () => {
    const response = await s3ClientService.remove(imageFileId, { expiresIn: 30 })
    expect(response.ok).toExist()
    expect(response.status).to.equal(200)
  })
  it('delete archive file', async () => {
    const response = await s3ClientService.remove(archiveFileId, { expiresIn: 30 })
    expect(response.ok).toExist()
    expect(response.status).to.equal(200)
  })
  after(async () => {
    await expressServer.close()
  })
})
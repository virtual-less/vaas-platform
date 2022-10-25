import * as Minio from 'minio'

export class S3 {
    minio:Minio.Client
    bucket:string
    constructor({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey,
        bucket,
    }) {
        this.minio = new Minio.Client({
            endPoint,
            port,
            useSSL,
            accessKey,
            secretKey
        });
        this.bucket = bucket
    }
    async presignedPutObject({key,expiry}) {
        const presignedUrl = await this.minio.presignedPutObject(this.bucket, key, expiry)
        return presignedUrl
    }

    async presignedGetObject({key,expiry}) {
        const presignedUrl = await this.minio.presignedGetObject(this.bucket, key, expiry)
        return presignedUrl
    }

    async fGetObject({key,filePath}) {
        return await this.minio.fGetObject(this.bucket, key, filePath)
    }

    async fPutObject({key, filePath, metaData={}}) {
        return await this.minio.fPutObject(this.bucket, key, filePath, metaData)
    }

    async removeObject({key}) {
        return await this.minio.removeObject(this.bucket, key)
    }
}
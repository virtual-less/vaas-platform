export default{
    configServer:{
        // your etcd v3 config
        etcd:{
            endpoints:['127.0.0.1:2379'],
            username:'root',
            password:'123456'
        },
    },
    storageServer:{
        // your minio(s3) config
        minio:{
            endPoint: '127.0.0.1',
            port: 9000,
            useSSL:false,
            accessKey: 'minio-root-user',
            secretKey: 'minio-root-password',
            bucket: 'my-bucket'
        }
    }
    
}
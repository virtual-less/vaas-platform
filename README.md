# vaas-platform
Virtual as a Service Platform

# Structure
![Structure](https://raw.githubusercontent.com/virtual-less/assets/main/vaas-platform.png)


# Quick Start
1. install app dependencies & main dependencies
    ```sh
    cd src/apps/platform
    npm install
    cd ../../..
    npm install
    ```

2. launch your etcd & s3/minio
    * [etcd](https://github.com/etcd-io/etcd)
    * [minio](https://github.com/minio/minio)


3. change secret config file
    ```ts
    // src/apps/platform/config/index.ts
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
    ```
4. start
    ```sh
    npm run start
    ```
5. open platform ui（todo）
    ```sh
    open http://127.0.0.1:9080/platform/
    ```
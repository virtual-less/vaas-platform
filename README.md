# vaas-platform
Virtual as a Service Platform

# Structure
![Structure](https://raw.githubusercontent.com/virtual-less/assets/main/vaas-platform.png)


# Get Code
```sh
git clone --recursive git@github.com:virtual-less/vaas-platform.git
git submodule update --remote
git submodule foreach git checkout main
```

# Quick Start
1. install main dependencies && app dependencies
    ```sh
    npm install # install main dependencies
    git submodule foreach npm install # install app dependencies
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
5. open platform ui
    ```sh
    open http://127.0.0.1:9080/
    ```
6. init your vaas project
    ```sh
    cd ..
    npm init vaas
    ```
7. deploy in your vaas project
    ```sh
    npm run deploy
    ```
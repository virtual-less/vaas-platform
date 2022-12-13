import { 
    isAppNameRegistered, setDeployKeyByAppName,
    getByPassDataByAppName, setByPassByAppName
} from '../config/dynamicConfig'


export async function deploy({appName, version, appBuildS3Key}) {
    if(!(await isAppNameRegistered({appName}))) {
        throw new Error(`appName[${appName}] not Registered!`)
    }
    const deployVersionRes =  await setDeployKeyByAppName({appName, version, appBuildS3Key})
    const byPassData  = await getByPassDataByAppName({appName})
    let byPassDataEffectRes;
    if(!byPassData || byPassData.value.type==='latest') {
        byPassDataEffectRes = await setByPassByAppName({
            appName, 
            strategy:{
                type:'latest',
                latest:{version}
                
            }
        })
    }
    return {
        deployVersionRes,
        byPassDataEffectRes
    }
}


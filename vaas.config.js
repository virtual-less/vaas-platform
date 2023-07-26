// @ts-check
const path = require("path");
const config = require("./build/apps/platform/config/app.js")
const { util } = require("vaas-framework");
module.exports = util.validVaasConfig({
    appsDir:path.join(__dirname,'build','apps'), 
    port:9080,
    showErrorStack:true,
    // @ts-ignore 由于是编译后的文件，所以类型不相同
    getAppNameByRequest: config.getAppNameByRequest,
    getAppConfigByAppName:config.getAppConfigByAppName,
    // @ts-ignore 由于是编译后的文件，所以类型不相同
    getByPassFlowVersion:config.getByPassFlowVersion
})
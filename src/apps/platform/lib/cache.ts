export class CacheServer {
    private cacheMap:Map<string, {
        expireTime:number
        timerId:NodeJS.Timeout,
        value:any
    }> = new Map()

    hasCache(key:string) {
        return this.cacheMap.has(key)
    }
    getCache(key:string) {
        const cache = this.cacheMap.get(key)
        return cache?.value
    }
    setCache(key:string, value:any, expireMs:number=10000) {
        const cache = this.cacheMap.get(key)
        if(cache?.timerId){
            clearTimeout(cache.timerId)
        }
        const timerId = setTimeout(() => {
            this.cacheMap.delete(key)
        }, expireMs+1)
        return this.cacheMap.set(key, {
            timerId,
            expireTime:Date.now()+expireMs,
            value,
        })
    }
    

}
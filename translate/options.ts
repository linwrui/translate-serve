export interface TranslateOptions {
    fromKey: string
    toKey: string
    strList: string[]
    useProxy?: boolean
    useCache?: boolean
    engine?: string
    dict?: Record<string, string | Record<string, string>>
}
import { INodeParams, INodeCredential } from '../src/Interface'

class NanoBananaApi implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]

    constructor() {
        this.label = 'Nano Banana API'
        this.name = 'nanoBananaApi'
        this.version = 1.0
        this.inputs = [
            {
                label: 'Nano Banana API Key',
                name: 'nanoBananaApiKey',
                type: 'password',
                description: 'API key for Google Nano Banana. Get your API key from https://www.nanobananai.com'
            }
        ]
    }
}

module.exports = { credClass: NanoBananaApi }


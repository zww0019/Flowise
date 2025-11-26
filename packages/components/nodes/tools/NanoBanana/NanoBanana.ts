import { ICommonObject, INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { NanoBananaTool, NanoBananaConfig } from './core'

class NanoBanana_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'Nano Banana'
        this.name = 'nanoBanana'
        this.version = 1.0
        this.type = 'NanoBanana'
        this.icon = 'nanobanana.svg'
        this.category = 'Tools'
        this.description = 'Generate images using Google Nano Banana API. Supports text-to-image and image-to-image generation with Nano Banana 2 and 3.'
        this.baseClasses = [this.type, ...getBaseClasses(NanoBananaTool), 'Tool']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['nanoBananaApi']
        }
        this.inputs = [
            {
                label: 'Mode',
                name: 'mode',
                type: 'options',
                options: [
                    {
                        label: 'Text to Image',
                        name: 'text-to-image'
                    },
                    {
                        label: 'Image to Image',
                        name: 'image-to-image'
                    }
                ],
                default: 'text-to-image',
                description: 'Generation mode: text-to-image or image-to-image'
            },
            {
                label: 'Model Version',
                name: 'modelVersion',
                type: 'options',
                options: [
                    {
                        label: 'Nano Banana 2',
                        name: '2'
                    },
                    {
                        label: 'Nano Banana 3',
                        name: '3'
                    }
                ],
                default: '2',
                description: 'Nano Banana model version to use'
            },
            {
                label: 'Default Aspect Ratio',
                name: 'aspectRatio',
                type: 'options',
                options: [
                    {
                        label: '1:1 (Square)',
                        name: '1:1'
                    },
                    {
                        label: '16:9 (Landscape)',
                        name: '16:9'
                    },
                    {
                        label: '9:16 (Portrait)',
                        name: '9:16'
                    },
                    {
                        label: '4:3',
                        name: '4:3'
                    },
                    {
                        label: '3:4',
                        name: '3:4'
                    }
                ],
                default: '1:1',
                optional: true,
                description: 'Default aspect ratio for generated images. Can be overridden in tool call.'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                default: 1.0,
                optional: true,
                description: 'Controls randomness in generation. Range: 0.0-2.0'
            },
            {
                label: 'Max Output Tokens',
                name: 'maxOutputTokens',
                type: 'number',
                optional: true,
                description: 'Maximum number of tokens to generate'
            },
            {
                label: 'Top P',
                name: 'topP',
                type: 'number',
                optional: true,
                description: 'Nucleus sampling parameter. Range: 0.0-1.0'
            },
            {
                label: 'Top K',
                name: 'topK',
                type: 'number',
                optional: true,
                description: 'Top-K sampling parameter'
            },
            {
                label: 'Seed',
                name: 'seed',
                type: 'number',
                optional: true,
                description: 'Random seed for reproducible generation'
            },
            {
                label: 'Stop Sequences',
                name: 'stopSequences',
                type: 'string',
                rows: 2,
                optional: true,
                description: 'Stop sequences (one per line)',
                placeholder: 'stop1\nstop2'
            },
            {
                label: 'Response MIME Type',
                name: 'responseMimeType',
                type: 'string',
                optional: true,
                description: 'MIME type for the response'
            },
            {
                label: 'Safety Settings',
                name: 'safetySettings',
                type: 'code',
                optional: true,
                description: 'Safety settings as JSON array. Example: [{"category":"HARM_CATEGORY_HARASSMENT","threshold":"BLOCK_MEDIUM_AND_ABOVE"}]',
                placeholder: `[
  {
    "category": "HARM_CATEGORY_HARASSMENT",
    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
  }
]`
            },
            {
                label: 'Custom Generation Config',
                name: 'customGenerationConfig',
                type: 'code',
                optional: true,
                description: 'Custom generation config as JSON to override default settings',
                placeholder: `{
  "temperature": 0.9,
  "maxOutputTokens": 2048
}`
            },
            {
                label: 'Tool Name',
                name: 'toolName',
                type: 'string',
                default: 'nano_banana_image_generator',
                optional: true,
                additionalParams: true,
                description: 'Name of the tool'
            },
            {
                label: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                rows: 3,
                optional: true,
                additionalParams: true,
                description: 'Description of when to use this tool',
                placeholder: 'Use this tool to generate images from text prompts or transform existing images'
            }
        ]
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const apiKey = getCredentialParam('nanoBananaApiKey', credentialData, nodeData)

        if (!apiKey) {
            throw new Error('Nano Banana API Key is required')
        }

        const mode = (nodeData.inputs?.mode as string) || 'text-to-image'
        const modelVersion = (nodeData.inputs?.modelVersion as string) || '2'
        const aspectRatio = nodeData.inputs?.aspectRatio as string
        const temperature = nodeData.inputs?.temperature ? parseFloat(nodeData.inputs.temperature as string) : undefined
        const maxOutputTokens = nodeData.inputs?.maxOutputTokens ? parseInt(nodeData.inputs.maxOutputTokens as string, 10) : undefined
        const topP = nodeData.inputs?.topP ? parseFloat(nodeData.inputs.topP as string) : undefined
        const topK = nodeData.inputs?.topK ? parseInt(nodeData.inputs.topK as string, 10) : undefined
        const seed = nodeData.inputs?.seed ? parseInt(nodeData.inputs.seed as string, 10) : undefined
        const stopSequencesStr = nodeData.inputs?.stopSequences as string
        const responseMimeType = nodeData.inputs?.responseMimeType as string
        const safetySettingsStr = nodeData.inputs?.safetySettings as string
        const customGenerationConfig = nodeData.inputs?.customGenerationConfig as string

        // Parse stop sequences
        let stopSequences: string[] | undefined
        if (stopSequencesStr) {
            stopSequences = stopSequencesStr.split('\n').filter(s => s.trim().length > 0)
        }

        // Parse safety settings
        let safetySettings: any[] | undefined
        if (safetySettingsStr) {
            try {
                safetySettings = JSON.parse(safetySettingsStr)
            } catch (e) {
                console.warn('Failed to parse safety settings:', e)
            }
        }

        const config: NanoBananaConfig = {
            apiKey,
            modelVersion: modelVersion as '2' | '3',
            aspectRatio,
            temperature,
            maxOutputTokens,
            topP,
            topK,
            seed,
            stopSequences,
            responseMimeType,
            safetySettings,
            customGenerationConfig
        }

        const tool = new NanoBananaTool(config, mode as 'text-to-image' | 'image-to-image')

        // Override name and description if provided
        const toolName = nodeData.inputs?.toolName as string
        const toolDescription = nodeData.inputs?.toolDescription as string

        if (toolName) {
            tool.name = toolName.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_-]/g, '')
        }

        if (toolDescription) {
            tool.description = toolDescription
        }

        return tool
    }
}

module.exports = { nodeClass: NanoBanana_Tools }


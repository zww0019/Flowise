import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { secureFetch } from '../../../src/httpSecurity'

export interface NanoBananaConfig {
    apiKey: string
    modelVersion: '2' | '3'
    aspectRatio?: string
    safetySettings?: any[]
    temperature?: number
    maxOutputTokens?: number
    topP?: number
    topK?: number
    seed?: number
    stopSequences?: string[]
    responseMimeType?: string
    customGenerationConfig?: string
}

// Schema for text-to-image
const textToImageSchema = z.object({
    prompt: z.string().describe('Text prompt for image generation'),
    aspectRatio: z.string().optional().describe('Aspect ratio of the generated image (e.g., "1:1", "16:9", "9:16")'),
    customConfig: z.string().optional().describe('Custom generation config as JSON string to override default settings')
})

// Schema for image-to-image
const imageToImageSchema = z.object({
    prompt: z.string().describe('Text prompt describing the desired transformation or modification'),
    image: z.string().describe('Base64 encoded image data (data:image/xxx;base64,...) or image URL'),
    aspectRatio: z.string().optional().describe('Aspect ratio of the generated image (e.g., "1:1", "16:9", "9:16")'),
    customConfig: z.string().optional().describe('Custom generation config as JSON string to override default settings')
})

export class NanoBananaTool extends StructuredTool {
    name: string
    description: string
    config: NanoBananaConfig
    mode: 'text-to-image' | 'image-to-image'
    schema: z.ZodObject<any>

    constructor(config: NanoBananaConfig, mode: 'text-to-image' | 'image-to-image' = 'text-to-image') {
        const schema = mode === 'text-to-image' ? textToImageSchema : imageToImageSchema
        super()
        this.name = mode === 'text-to-image' ? 'nano_banana_text_to_image' : 'nano_banana_image_to_image'
        this.description = mode === 'text-to-image' 
            ? 'Generate an image from a text prompt using Google Nano Banana'
            : 'Generate an image from a text prompt and an input image using Google Nano Banana'
        this.config = config
        this.mode = mode
        this.schema = schema
    }

    /** @ignore */
    async _call(arg: any): Promise<string> {
        try {
            const { prompt, image, aspectRatio, customConfig } = arg

            // Validate required input
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                throw new Error('Prompt is required and must be a non-empty string')
            }

            // Determine model name based on version
            // According to Google Gemini API docs:
            // - gemini-2.5-flash-image (Nano Banana)
            // - gemini-3-pro-image-preview (Nano Banana Pro preview)
            const modelName = this.config.modelVersion === '3' 
                ? 'gemini-3-pro-image-preview' 
                : 'gemini-2.5-flash-image'

            // Build API URL - using official Google API endpoint
            // According to docs: https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`

            // Prepare contents array
            const parts: any[] = []

            // Add image if provided (image-to-image mode)
            if (this.mode === 'image-to-image' && image) {
                let imageData = image
                let mimeType = 'image/png'

                // Handle different image input formats
                if (image.startsWith('data:')) {
                    // Base64 data URL
                    const matches = image.match(/^data:([^;]+);base64,(.+)$/)
                    if (matches) {
                        mimeType = matches[1]
                        imageData = matches[2]
                    } else {
                        // Fallback: try to extract base64
                        const base64Match = image.match(/base64,(.+)$/)
                        if (base64Match) {
                            imageData = base64Match[1]
                        }
                    }
                } else if (image.startsWith('http://') || image.startsWith('https://')) {
                    // URL - fetch and convert to base64
                    const response = await secureFetch(image)
                    if (!response.ok) {
                        throw new Error(`Failed to fetch image from URL: ${response.statusText}`)
                    }
                    const arrayBuffer = await response.arrayBuffer()
                    const buffer = Buffer.from(arrayBuffer)
                    imageData = buffer.toString('base64')
                    // Try to detect mime type from response headers
                    const contentType = response.headers.get('content-type')
                    if (contentType) {
                        mimeType = contentType
                    }
                }
                // Note: For stored file references, the image should be provided as base64 data URL

                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: imageData
                    }
                })
            }

            // Add text prompt
            parts.push({ text: prompt })

            // Build generation config
            let generationConfig: any = {
                responseModalities: ['IMAGE']
            }

            // Add image config
            if (aspectRatio || this.config.aspectRatio) {
                generationConfig.imageConfig = {
                    aspectRatio: aspectRatio || this.config.aspectRatio
                }
            }

            // Add other config options
            if (this.config.temperature !== undefined) {
                generationConfig.temperature = this.config.temperature
            }
            if (this.config.maxOutputTokens !== undefined) {
                generationConfig.maxOutputTokens = this.config.maxOutputTokens
            }
            if (this.config.topP !== undefined) {
                generationConfig.topP = this.config.topP
            }
            if (this.config.topK !== undefined) {
                generationConfig.topK = this.config.topK
            }
            if (this.config.seed !== undefined) {
                generationConfig.seed = this.config.seed
            }
            if (this.config.stopSequences && this.config.stopSequences.length > 0) {
                generationConfig.stopSequences = this.config.stopSequences
            }
            if (this.config.responseMimeType) {
                generationConfig.responseMimeType = this.config.responseMimeType
            }

            // Override with custom config if provided
            if (customConfig) {
                try {
                    const custom = JSON.parse(customConfig)
                    generationConfig = { ...generationConfig, ...custom }
                } catch (e) {
                    console.warn('Failed to parse custom config, using default:', e)
                }
            }

            // Override with node-level custom config if provided
            if (this.config.customGenerationConfig) {
                try {
                    const custom = JSON.parse(this.config.customGenerationConfig)
                    generationConfig = { ...generationConfig, ...custom }
                } catch (e) {
                    console.warn('Failed to parse node-level custom config, using default:', e)
                }
            }

            // Build request body
            const requestBody: any = {
                contents: [
                    {
                        parts: parts
                    }
                ],
                generationConfig: generationConfig
            }

            // Add safety settings if provided
            if (this.config.safetySettings && this.config.safetySettings.length > 0) {
                requestBody.safetySettings = this.config.safetySettings
            }

            // Make API request
            // According to docs, API key should be passed via header: x-goog-api-key
            const response = await secureFetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.config.apiKey
                },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Nano Banana API Error ${response.status}: ${errorText}`)
            }

            const result = await response.json()

            // Extract image data from response
            // REST API returns inline_data (snake_case), SDK returns inlineData (camelCase)
            // Only process the first candidate to avoid unnecessary processing
            if (result.candidates && result.candidates.length > 0) {
                const candidate = result.candidates[0]
                if (candidate.content && candidate.content.parts) {
                    // Find the first image part and return immediately to avoid unnecessary iteration
                    for (const part of candidate.content.parts) {
                        // Support both REST API format (inline_data) and SDK format (inlineData)
                        const inlineData = part.inline_data || part.inlineData
                        if (inlineData && inlineData.data) {
                            const mimeType = inlineData.mime_type || inlineData.mimeType || 'image/png'
                            const data = inlineData.data
                            // Return immediately after finding the first image to avoid further processing
                            return `data:${mimeType};base64,${data}`
                        }
                    }
                }
            }

            // If no image found, return the full response as JSON
            return JSON.stringify(result, null, 2)
        } catch (error) {
            throw new Error(`Failed to generate image with Nano Banana: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}


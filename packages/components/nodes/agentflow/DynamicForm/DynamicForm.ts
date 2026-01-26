import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import {
    ICommonObject,
    ICondition,
    IDynamicForm,
    IFormSchema,
    INode,
    INodeData,
    INodeOptionsValue,
    INodeParams
} from '../../../src/Interface'
import { BaseMessageLike } from '@langchain/core/messages'
import { DEFAULT_DYNAMIC_FORM_COLLECTION_PROMPT } from '../prompt'

class DynamicForm_Agentflow implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    color: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Dynamic Form'
        this.name = 'dynamicFormAgentflow'
        this.version = 1.0
        this.type = 'DynamicForm'
        this.category = 'Agent Flows'
        this.description = 'AI-driven dynamic form generator using Function Calling'
        this.color = '#FF6B6B'
        this.baseClasses = [this.type]
        this.inputs = [
            {
                label: 'Model',
                name: 'dynamicFormModel',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                loadConfig: true
            },
            {
                label: 'System Prompt',
                name: 'dynamicFormPrompt',
                type: 'string',
                default: DEFAULT_DYNAMIC_FORM_COLLECTION_PROMPT,
                optional: true,
                rows: 4,
                description: 'System prompt for form generation (advanced users only)'
            },
            {
                label: 'User Prompt',
                name: 'dynamicFormUserPrompt',
                type: 'string',
                description: 'Specify what information to collect (e.g., "Collect customer contact info")',
                placeholder: 'e.g., Collect customer feedback about our service',
                acceptVariable: true,
                rows: 2
            },
            {
                label: 'Enable Feedback',
                name: 'dynamicFormEnableFeedback',
                type: 'boolean',
                default: true,
                optional: true
            }
        ]
    }

    //@ts-ignore
    loadMethods = {
        async listModels(_: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> {
            const componentNodes = options.componentNodes as { [key: string]: INode }
            const returnOptions: INodeOptionsValue[] = []
            for (const nodeName in componentNodes) {
                const componentNode = componentNodes[nodeName]
                if (componentNode.category === 'Chat Models') {
                    if (componentNode.tags?.includes('LlamaIndex')) {
                        continue
                    }
                    returnOptions.push({
                        label: componentNode.label,
                        name: nodeName,
                        imageSrc: componentNode.icon
                    })
                }
            }
            return returnOptions
        }
    }

    async run(nodeData: INodeData, input: string, options: ICommonObject): Promise<any> {
        const _dynamicForm = nodeData.inputs?.dynamicForm
        const dynamicForm: IDynamicForm = typeof _dynamicForm === 'string' ? JSON.parse(_dynamicForm) : _dynamicForm

        const state = options.agentflowRuntime?.state as ICommonObject
        const pastChatHistory = (options.pastChatHistory as BaseMessageLike[]) ?? []
        const runtimeChatHistory = (options.agentflowRuntime?.chatHistory as BaseMessageLike[]) ?? []

        // Second run: Handle form submission
        if (dynamicForm) {
            return this.handleFormSubmission(nodeData, dynamicForm, state, pastChatHistory, runtimeChatHistory, options)
        }

        // First run: Generate form schema
        return this.generateFormSchema(nodeData, input, state, pastChatHistory, runtimeChatHistory, options)
    }

    // First run: Generate form schema using LLM
    private async generateFormSchema(
        nodeData: INodeData,
        input: string,
        state: ICommonObject,
        pastChatHistory: BaseMessageLike[],
        runtimeChatHistory: BaseMessageLike[],
        options: ICommonObject
    ): Promise<any> {
        const model = nodeData.inputs?.dynamicFormModel as string
        const modelConfig = nodeData.inputs?.dynamicFormModelConfig as ICommonObject
        const systemPrompt = nodeData.inputs?.dynamicFormPrompt as string || DEFAULT_DYNAMIC_FORM_COLLECTION_PROMPT
        const userPrompt = nodeData.inputs?.dynamicFormUserPrompt as string || ''

        if (!model || !modelConfig) {
            throw new Error('Model is required for Dynamic Form')
        }

        // Dynamically load model (reuse LLM node pattern)
        const nodeInstanceFilePath = options.componentNodes[model].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newNodeInstance = new nodeModule.nodeClass()
        const newNodeData = {
            ...nodeData,
            credential: modelConfig['FLOWISE_CREDENTIAL_ID'],
            inputs: {
                ...nodeData.inputs,
                ...modelConfig
            }
        }
        const llmNodeInstance = (await newNodeInstance.init(newNodeData, '', options)) as BaseChatModel

        // Check if model supports bindTools
        if (llmNodeInstance.bindTools === undefined) {
            throw new Error('Selected model does not support Function Calling. Please use a model that supports bindTools() method.')
        }

        // Create tool and bind to model
        const formTool = this.createFormGenerationTool()
        const modelWithTools = llmNodeInstance.bindTools([formTool])

        // 从聊天历史中提取上下文（核心依据）
        const allMessages = [...pastChatHistory, ...runtimeChatHistory]
        const conversationContext = allMessages.length > 0
            ? allMessages.slice(-5).map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')
            : ''

        // 构建完整提示词（优先级：系统提示词 > 对话上下文[核心] > 用户提示[辅助]）
        let fullPrompt = systemPrompt

        // 添加对话上下文（核心依据 - 根据对话内容生成收集表）
        if (conversationContext) {
            fullPrompt += `\n\n## Conversation Context (Core - Generate form based on this)\n${conversationContext}`
        }

        // 添加用户提示（辅助指令 - 帮助指定收集表类型）
        if (userPrompt) {
            fullPrompt += `\n\n## User Prompt (Auxiliary - Form type guidance)\n${userPrompt}`
        }

        // 构建用户消息内容
        let userMessageContent = ''
        if (allMessages.length > 0) {
            const lastMessage = (allMessages[allMessages.length - 1] as any).content || ''
            userMessageContent = lastMessage || input || 'Please generate an information collection form based on the conversation context.'
        } else {
            userMessageContent = input || 'Please generate an information collection form.'
        }

        // 构建消息
        const messages = [
            { role: 'system', content: fullPrompt },
            { role: 'user', content: userMessageContent }
        ]

        // Invoke LLM with tools bound
        const response = await modelWithTools.invoke(messages)

        // Debug: Log LLM response
        console.log('[DynamicForm] LLM Response:', JSON.stringify({
            hasToolCalls: !!(response.tool_calls && response.tool_calls.length > 0),
            toolCallsCount: response.tool_calls?.length || 0,
            toolCalls: response.tool_calls,
            contentType: typeof response.content,
            contentPreview: typeof response.content === 'string'
                ? response.content.substring(0, 500)
                : JSON.stringify(response.content).substring(0, 500)
        }, null, 2))

        // Parse tool calls
        let formSchema: IFormSchema | null = null
        if (response.tool_calls && response.tool_calls.length > 0) {
            const toolCall = response.tool_calls[0]
            console.log('[DynamicForm] Tool call found:', toolCall.name)
            if (toolCall.name === 'generateDynamicForm') {
                formSchema = toolCall.args as IFormSchema
                console.log('[DynamicForm] Form schema from tool call:', JSON.stringify(formSchema, null, 2))
            }
        }

        // Fallback: Extract JSON from content
        if (!formSchema && response.content) {
            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
            console.log('[DynamicForm] Trying fallback JSON extraction from content')
            const jsonMatch = content.match(/\{[\s\S]*"fields"[\s\S]*\}/)
            if (jsonMatch) {
                try {
                    formSchema = JSON.parse(jsonMatch[0])
                    console.log('[DynamicForm] Form schema from fallback:', JSON.stringify(formSchema, null, 2))
                } catch (e) {
                    console.log('[DynamicForm] Fallback JSON parse error:', e)
                }
            }
        }

        if (!formSchema) {
            console.error('[DynamicForm] Failed to generate form schema. Full response:', JSON.stringify(response, null, 2))
            throw new Error('Failed to generate valid form schema from LLM response')
        }

        // Validate schema structure
        if (!formSchema.title || !formSchema.fields || !Array.isArray(formSchema.fields)) {
            throw new Error('Invalid form schema: missing title or fields')
        }

        const output = {
            formSchema,
            content: `Please fill out: ${formSchema.title}`
        }

        return {
            id: nodeData.id,
            name: this.name,
            input: { messages: [...pastChatHistory, ...runtimeChatHistory] },
            output,
            state,
            chatHistory: [{ role: 'assistant', content: output.content }]
        }
    }

    // Second run: Handle form submission
    private async handleFormSubmission(
        nodeData: INodeData,
        dynamicForm: IDynamicForm,
        state: ICommonObject,
        pastChatHistory: BaseMessageLike[],
        runtimeChatHistory: BaseMessageLike[],
        options: ICommonObject
    ): Promise<any> {
        const formSchema = nodeData.inputs?.formSchema as IFormSchema
        const dynamicFormEnableFeedback = nodeData.inputs?.dynamicFormEnableFeedback as boolean

        let validatedFormData: Record<string, any> = {}

        if (dynamicForm.type === 'proceed' && formSchema) {
            const formData = dynamicForm.formData ?? {}
            validatedFormData = this.validateFormData(formData, formSchema)
        }

        // Use same pattern as HumanInput node for outcomes
        const outcomes: Array<Partial<ICondition> & Partial<IDynamicForm>> = [
            {
                type: 'proceed',
                startNodeId: dynamicForm.startNodeId,
                feedback: dynamicFormEnableFeedback && dynamicForm.feedback ? dynamicForm.feedback : undefined,
                isFulfilled: false
            },
            {
                type: 'reject',
                startNodeId: dynamicForm.startNodeId,
                feedback: dynamicFormEnableFeedback && dynamicForm.feedback ? dynamicForm.feedback : undefined,
                isFulfilled: false
            }
        ]

        // Only one outcome can be fulfilled at a time
        switch (dynamicForm.type) {
            case 'proceed':
                outcomes[0].isFulfilled = true
                break
            case 'reject':
                outcomes[1].isFulfilled = true
                break
        }

        const messages = [
            ...pastChatHistory,
            ...runtimeChatHistory
        ]

        if (dynamicForm.feedback) {
            messages.push({
                role: 'user',
                content: dynamicForm.feedback
            })
        }

        const input = { messages, formData: dynamicForm.formData }
        const output = {
            conditions: outcomes,
            formData: validatedFormData
        }

        const nodeOutput: any = {
            id: nodeData.id,
            name: this.name,
            input,
            output,
            state
        }

        if (dynamicForm.feedback && dynamicFormEnableFeedback) {
            nodeOutput.chatHistory = [{ role: 'user', content: dynamicForm.feedback }]
        }

        return nodeOutput
    }

    // Validate form data
    private validateFormData(formData: Record<string, any>, formSchema: IFormSchema): Record<string, any> {
        if (!formData) {
            throw new Error('Form data is required')
        }

        const validated: Record<string, any> = {}

        for (const field of formSchema.fields) {
            const value = formData[field.name]

            // Required validation
            if (field.required && (value === undefined || value === null || value === '')) {
                throw new Error(`Field '${field.label}' is required`)
            }

            // Skip validation if value is empty and not required
            if (!value) {
                continue
            }

            // Type-specific validation
            switch (field.type) {
                case 'email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (!emailRegex.test(value)) {
                        throw new Error(`Invalid email format for '${field.label}'`)
                    }
                    validated[field.name] = value
                    break

                case 'number':
                    const num = Number(value)
                    if (isNaN(num)) {
                        throw new Error(`Invalid number for '${field.label}'`)
                    }
                    // Min/max validation
                    if (field.validation?.min !== undefined && num < field.validation.min) {
                        throw new Error(`Value for '${field.label}' must be at least ${field.validation.min}`)
                    }
                    if (field.validation?.max !== undefined && num > field.validation.max) {
                        throw new Error(`Value for '${field.label}' must be at most ${field.validation.max}`)
                    }
                    validated[field.name] = num
                    break

                case 'checkbox':
                    validated[field.name] = value === true || value === 'true'
                    break

                case 'text':
                case 'textarea':
                    const strValue = String(value)
                    // Min/max length validation
                    if (field.validation?.min !== undefined && strValue.length < field.validation.min) {
                        throw new Error(`'${field.label}' must be at least ${field.validation.min} characters`)
                    }
                    if (field.validation?.max !== undefined && strValue.length > field.validation.max) {
                        throw new Error(`'${field.label}' must be at most ${field.validation.max} characters`)
                    }
                    // Pattern validation
                    if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(strValue)) {
                        throw new Error(`'${field.label}' does not match the required format`)
                    }
                    validated[field.name] = strValue
                    break

                case 'select':
                case 'radio':
                    // Validate that the value is one of the allowed options
                    if (field.options && field.options.length > 0) {
                        const allowedValues = field.options.map(opt => opt.value)
                        if (!allowedValues.includes(value)) {
                            throw new Error(`Invalid value for '${field.label}'. Must be one of: ${allowedValues.join(', ')}`)
                        }
                    }
                    validated[field.name] = value
                    break

                default:
                    validated[field.name] = value
            }
        }

        return validated
    }

    // Create Function Calling tool for form generation
    private createFormGenerationTool(): DynamicStructuredTool {
        const FormFieldOptionSchema = z.object({
            label: z.string().describe('Display label for the option'),
            value: z.string().describe('Value for the option')
        })

        const FormFieldSchema = z.object({
            name: z.string().describe('Unique field identifier (use snake_case)'),
            label: z.string().describe('Human-readable field label'),
            type: z.enum(['text', 'email', 'number', 'textarea', 'select', 'checkbox', 'radio']),
            placeholder: z.string().optional(),
            defaultValue: z.string().optional(),
            required: z.boolean().optional().default(true),
            options: z.array(FormFieldOptionSchema).optional(),
            description: z.string().optional(),
            validation: z.object({
                pattern: z.string().optional(),
                min: z.number().optional(),
                max: z.number().optional()
            }).optional()
        })

        const FormSchemaSchema = z.object({
            title: z.string().describe('Title of the form'),
            description: z.string().optional().describe('Description of what the form is for'),
            fields: z.array(FormFieldSchema).describe('Array of form fields')
        })

        return new DynamicStructuredTool({
            name: 'generateDynamicForm',
            description: 'Generate a dynamic form schema based on user request and conversation context. Use this tool when the user asks to create a form, collect information, or gather input.',
            schema: FormSchemaSchema,
            func: async (input) => JSON.stringify(input, null, 2)
        })
    }
}

module.exports = { nodeClass: DynamicForm_Agentflow }

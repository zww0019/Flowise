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
    INodeOutputsValue,
    INodeParams
} from '../../../src/Interface'
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
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Dynamic Form'
        this.name = 'dynamicFormAgentflow'
        this.version = 1.0
        this.type = 'DynamicForm'
        this.category = 'Agent Flows'
        this.description = 'AI 驱动的动态表单生成器，根据输入内容自动分析并生成信息收集表单'
        this.color = '#FF6B6B'
        this.baseClasses = [this.type]
        this.outputs = [
            {
                label: 'Proceed',
                name: 'proceed'
            },
            {
                label: 'Reject',
                name: 'reject'
            }
        ]
        this.inputs = [
            {
                label: 'Model',
                name: 'dynamicFormModel',
                type: 'asyncOptions',
                loadMethod: 'listModels',
                loadConfig: true
            },
            {
                label: 'Analysis Content',
                name: 'dynamicFormAnalysisContent',
                type: 'string',
                description: 'Content to analyze for form generation (e.g., a job posting text to create an application form)',
                placeholder: 'Paste or type the content you want to analyze here...',
                acceptVariable: true,
                rows: 6
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
                rows: 2,
                optional: true
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

        // Second run: Handle form submission
        if (dynamicForm) {
            return this.handleFormSubmission(nodeData, dynamicForm, state, options)
        }

        // First run: Generate form schema
        return this.generateFormSchema(nodeData, input, state, options)
    }

    // First run: Generate form schema using LLM
    private async generateFormSchema(
        nodeData: INodeData,
        input: string,
        state: ICommonObject,
        options: ICommonObject
    ): Promise<any> {
        const model = nodeData.inputs?.dynamicFormModel as string
        const modelConfig = nodeData.inputs?.dynamicFormModelConfig as ICommonObject
        const analysisContent = nodeData.inputs?.dynamicFormAnalysisContent as string
        const systemPrompt = nodeData.inputs?.dynamicFormPrompt as string || DEFAULT_DYNAMIC_FORM_COLLECTION_PROMPT
        const userPrompt = nodeData.inputs?.dynamicFormUserPrompt as string || ''

        if (!model || !modelConfig) {
            throw new Error('Model is required for Dynamic Form')
        }

        if (!analysisContent) {
            throw new Error('Analysis Content is required for Dynamic Form')
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

        // 构建完整提示词
        let fullPrompt = systemPrompt

        // 添加分析内容（核心依据）
        fullPrompt += `\n\n## Analysis Content (Core - Generate form based on this)\n${analysisContent}`

        // 添加用户提示（辅助指令 - 帮助指定收集表类型）
        if (userPrompt) {
            fullPrompt += `\n\n## User Prompt (Auxiliary - Form type guidance)\n${userPrompt}`
        }

        // 构建消息
        const messages = [
            { role: 'system', content: fullPrompt },
            { role: 'user', content: 'Please generate an information collection form based on the analysis content provided above.' }
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
            input: { analysisContent },
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
        options: ICommonObject
    ): Promise<any> {
        const formSchema = nodeData.inputs?.formSchema as IFormSchema
        const dynamicFormEnableFeedback = nodeData.inputs?.dynamicFormEnableFeedback as boolean

        let validatedFormData: Record<string, any> = {}
        let formDataText = ''

        if (dynamicForm.type === 'proceed' && formSchema) {
            const formData = dynamicForm.formData ?? {}
            validatedFormData = this.validateFormData(formData, formSchema)
            formDataText = this.formatFormDataAsText(validatedFormData, formSchema)
        }

        // Use same pattern as HumanInput node for outcomes
        const outcomes: Array<Partial<ICondition> & Partial<IDynamicForm>> = [
            {
                type: 'proceed',
                startNodeId: dynamicForm.startNodeId,
                feedback: dynamicFormEnableFeedback && dynamicForm.feedback ? dynamicForm.feedback : undefined,
                formDataText: formDataText,
                isFulfilled: false
            },
            {
                type: 'reject',
                startNodeId: dynamicForm.startNodeId,
                feedback: dynamicFormEnableFeedback && dynamicForm.feedback ? dynamicForm.feedback : undefined,
                formDataText: dynamicForm.type === 'reject' ? '用户拒绝填写表单' : '',
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

        const input = { formData: dynamicForm.formData }
        const output = {
            conditions: outcomes,
            formData: validatedFormData,
            formDataText: formDataText
        }

        const nodeOutput: any = {
            id: nodeData.id,
            name: this.name,
            input,
            output,
            state
        }

        // 生成更清晰的 chatHistory
        const chatContent = dynamicForm.type === 'proceed'
            ? `✅ 用户同意并提交表单：\n${formDataText}${dynamicForm.feedback ? `\n反馈：${dynamicForm.feedback}` : ''}`
            : `❌ 用户拒绝${dynamicForm.feedback ? `：${dynamicForm.feedback}` : ''}`

        nodeOutput.chatHistory = [{ role: 'user', content: chatContent }]

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
                    // 如果有 options，则是多选复选框，验证数组
                    if (field.options && field.options.length > 0) {
                        const allowedValues = field.options.map(opt => opt.value)
                        if (Array.isArray(value)) {
                            // 验证每个值都在允许的选项中
                            const invalidValues = value.filter(v => !allowedValues.includes(v))
                            if (invalidValues.length > 0) {
                                throw new Error(`Invalid values for '${field.label}': ${invalidValues.join(', ')}`)
                            }
                            validated[field.name] = value
                        } else {
                            // 如果不是数组但提供了值，尝试处理
                            validated[field.name] = value ? [value] : []
                        }
                    } else {
                        // 单个布尔复选框
                        validated[field.name] = value === true || value === 'true'
                    }
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

    /**
     * 将表单数据格式化为可读文本
     * @param formData 用户提交的表单数据
     * @param formSchema 表单 schema（用于获取字段标签）
     * @returns 格式化的文本
     */
    private formatFormDataAsText(formData: Record<string, any>, formSchema: IFormSchema): string {
        if (!formData || Object.keys(formData).length === 0) {
            return '（未填写任何内容）'
        }

        const lines: string[] = []

        // 根据 formSchema 中的字段顺序格式化
        for (const field of formSchema.fields) {
            const value = formData[field.name]

            if (value === undefined || value === null || value === '') {
                continue  // 跳过未填写的字段
            }

            let displayValue: string

            // 根据字段类型格式化值
            switch (field.type) {
                case 'checkbox':
                    // 如果有 options，格式化为多选结果
                    if (field.options && field.options.length > 0 && Array.isArray(value)) {
                        if (value.length === 0) {
                            displayValue = '（未选择）'
                        } else {
                            // 查找每个选中值的标签
                            const selectedLabels = value.map(v => {
                                const opt = field.options.find(o => o.value === v)
                                return opt ? opt.label : v
                            })
                            displayValue = selectedLabels.join('、')
                        }
                    } else {
                        // 单个布尔复选框
                        displayValue = value ? '✓ 是' : '✗ 否'
                    }
                    break

                case 'select':
                case 'radio':
                    // 查找选项的标签
                    const option = field.options?.find(opt => opt.value === value)
                    displayValue = option ? option.label : value
                    break

                case 'number':
                    displayValue = String(value)
                    break

                default:
                    displayValue = String(value)
            }

            lines.push(`${field.label}: ${displayValue}`)
        }

        return lines.length > 0 ? lines.join('\n') : '（未填写任何内容）'
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
            description: '根据提供的分析内容生成动态表单结构。分析内容中隐含需要获取的信息点，提取这些信息并设计合适的表单字段。支持文本、邮箱、数字、下拉选择等多种字段类型。',
            schema: FormSchemaSchema,
            func: async (input) => JSON.stringify(input, null, 2)
        })
    }
}

module.exports = { nodeClass: DynamicForm_Agentflow }

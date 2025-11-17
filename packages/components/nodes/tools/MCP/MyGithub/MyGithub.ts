import { Tool, tool } from '@langchain/core/tools'
import { ICommonObject, INode, INodeData, INodeOptionsValue, INodeParams } from '../../../../src/Interface'
import { getCredentialData, getCredentialParam } from '../../../../src/utils'
import { MCPToolkit } from '../core'
class MyGithub_MCP implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    documentation: string
    mcpServerConfig: string
    credential: INodeParams
    inputs: INodeParams[]

    constructor() {
        this.label = 'My Github MCP'
        this.name = 'myGithubMCP'
        this.version = 1.1
        this.type = 'My Github MCP Tool'
        this.icon = 'github.svg'
        this.category = 'Tools (MCP)'
        this.description = 'My Github MCP Config'
        //this.documentation = 'https://github.com/modelcontextprotocol/servers/tree/main/src/github'
        this.mcpServerConfig = `{
  "url": "https://api.githubcopilot.com/mcp/",
  "headers": {
    "Authorization": "Bearer ",
  }
}`
        this.inputs = [
            this.credential = {
                label: 'Connect Credential',
                name: 'credential',
                type: 'credential',
                credentialNames: ['githubApi']
            },
            {
                label: 'Available Actions',
                name: 'mcpActions',
                type: 'asyncMultiOptions',
                loadMethod: 'listActions',
                refresh: true
            }
        ]
        this.baseClasses = ['Tool']
    }

    //@ts-ignore
    loadMethods = {
        listActions: async (nodeData: INodeData, options: ICommonObject): Promise<INodeOptionsValue[]> => {
            try {
                const toolset = await this.getTools(nodeData, options)
                toolset.sort((a: any, b: any) => a.name.localeCompare(b.name))

                return toolset.map(({ name, ...rest }) => ({
                    label: name.toUpperCase(),
                    name: name,
                    description: rest.description || name
                }))
            } catch (error) {
                return [
                    {
                        label: 'No Available Actions',
                        name: 'error',
                        description: 'No available actions, please check your API key and refresh'
                    }
                ]
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        if (!accessToken) {
            throw new Error('Missing Github Access Token')
        }
        const tools = await this.getTools(nodeData, options)

        const _mcpActions = nodeData.inputs?.mcpActions
        let mcpActions = []
        if (_mcpActions) {
            try {
                mcpActions = typeof _mcpActions === 'string' ? JSON.parse(_mcpActions) : _mcpActions
            } catch (error) {
                console.error('Error parsing mcp actions:', error)
            }
        }
        const filteredTools = tools.filter((tool: any) => mcpActions.includes(tool.name))

        // 包装工具以定制 input 参数
        return filteredTools.map((tool: Tool) => {
            return this.wrapToolWithInputCustomization(tool)
        })
    }

    /**
     * 包装工具以定制 input 参数
     * 可以在这里对输入参数进行预处理、验证或转换
     */
    private wrapToolWithInputCustomization(originalTool: Tool): Tool {
        return tool(
            async (input: any): Promise<string> => {
                // 在这里可以定制 input 参数
                const customizedInput = this.customizeInput(originalTool.name, input)
                
                // 调用原始工具
                return await originalTool.invoke(customizedInput)
            },
            {
                name: originalTool.name,
                description: originalTool.description,
                schema: originalTool.schema
            }
        )
    }

    /**
     * 定制输入参数的逻辑
     * 可以根据工具名称和原始输入进行不同的处理
     */
    private customizeInput(toolName: string, input: any): any {
        if (toolName === 'search_repositories') {
            return {
                ...input,
                perPage: Number(input.perPage) || 10
            }
        }
        if (toolName === 'issue_read'){
            return {
                ...input,
                issue_number: Number(input.issue_number)
            }
        }
        // 默认情况下，直接返回原始输入
        return input
    }

    async getTools(nodeData: INodeData, options: ICommonObject): Promise<Tool[]> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const accessToken = getCredentialParam('accessToken', credentialData, nodeData)

        if (!accessToken) {
            throw new Error('Missing Github Access Token')
        }

        let serverParams = {
            url: 'https://api.githubcopilot.com/mcp/',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }

        const toolkit = new MCPToolkit(serverParams, 'sse')

        await toolkit.initialize()

        const tools = toolkit.tools ?? []
        return tools as Tool[]
    }
}

module.exports = { nodeClass: MyGithub_MCP }

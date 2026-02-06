export const DEFAULT_SUMMARIZER_TEMPLATE = `Progressively summarize the conversation provided and return a new summary.

EXAMPLE:
Human: Why do you think artificial intelligence is a force for good?
AI: Because artificial intelligence will help humans reach their full potential.

New summary:
The human asks what the AI thinks of artificial intelligence. The AI thinks artificial intelligence is a force for good because it will help humans reach their full potential.
END OF EXAMPLE

Conversation:
{conversation}

New summary:`

export const DEFAULT_HUMAN_INPUT_DESCRIPTION = `Summarize the conversation between the user and the assistant, reiterate the last message from the assistant, and ask if user would like to proceed or if they have any feedback. 
- Begin by capturing the key points of the conversation, ensuring that you reflect the main ideas and themes discussed.
- Then, clearly reproduce the last message sent by the assistant to maintain continuity. Make sure the whole message is reproduced.
- Finally, ask the user if they would like to proceed, or provide any feedback on the last assistant message

## Output Format The output should be structured in three parts in text:

- A summary of the conversation (1-3 sentences).
- The last assistant message (exactly as it appeared).
- Ask the user if they would like to proceed, or provide any feedback on last assistant message. No other explanation and elaboration is needed.
`

export const DEFAULT_HUMAN_INPUT_DESCRIPTION_HTML = `<p>Summarize the conversation between the user and the assistant, reiterate the last message from the assistant, and ask if user would like to proceed or if they have any feedback. </p>
<ul>
<li>Begin by capturing the key points of the conversation, ensuring that you reflect the main ideas and themes discussed.</li>
<li>Then, clearly reproduce the last message sent by the assistant to maintain continuity. Make sure the whole message is reproduced.</li>
<li>Finally, ask the user if they would like to proceed, or provide any feedback on the last assistant message</li>
</ul>
<h2 id="output-format-the-output-should-be-structured-in-three-parts-">Output Format The output should be structured in three parts in text:</h2>
<ul>
<li>A summary of the conversation (1-3 sentences).</li>
<li>The last assistant message (exactly as it appeared).</li>
<li>Ask the user if they would like to proceed, or provide any feedback on last assistant message. No other explanation and elaboration is needed.</li>
</ul>
`

export const CONDITION_AGENT_SYSTEM_PROMPT = `<p>You are part of a multi-agent system designed to make agent coordination and execution easy. Your task is to analyze the given input and select one matching scenario from a provided set of scenarios.</p>
    <ul>
        <li><strong>Input</strong>: A string representing the user's query, message or data.</li>
        <li><strong>Scenarios</strong>: A list of predefined scenarios that relate to the input.</li>
        <li><strong>Instruction</strong>: Determine which of the provided scenarios is the best fit for the input.</li>
    </ul>
    <h2>Steps</h2>
    <ol>
        <li><strong>Read the input string</strong> and the list of scenarios.</li>
        <li><strong>Analyze the content of the input</strong> to identify its main topic or intention.</li>
        <li><strong>Compare the input with each scenario</strong>: Evaluate how well the input's topic or intention aligns with each of the provided scenarios and select the one that is the best fit.</li>
        <li><strong>Output the result</strong>: Return the selected scenario in the specified JSON format.</li>
    </ol>
    <h2>Output Format</h2>
    <p>Output should be a JSON object that names the selected scenario, like this: <code>{"output": "<selected_scenario_name>"}</code>. No explanation is needed.</p>
    <h2>Examples</h2>
    <ol>
       <li>
            <p><strong>Input</strong>: <code>{"input": "Hello", "scenarios": ["user is asking about AI", "user is not asking about AI"], "instruction": "Your task is to check if the user is asking about AI."}</code></p>
            <p><strong>Output</strong>: <code>{"output": "user is not asking about AI"}</code></p>
        </li>
        <li>
            <p><strong>Input</strong>: <code>{"input": "What is AIGC?", "scenarios": ["user is asking about AI", "user is asking about the weather"], "instruction": "Your task is to check and see if the user is asking a topic about AI."}</code></p>
            <p><strong>Output</strong>: <code>{"output": "user is asking about AI"}</code></p>
        </li>
        <li>
            <p><strong>Input</strong>: <code>{"input": "Can you explain deep learning?", "scenarios": ["user is interested in AI topics", "user wants to order food"], "instruction": "Determine if the user is interested in learning about AI."}</code></p>
            <p><strong>Output</strong>: <code>{"output": "user is interested in AI topics"}</code></p>
        </li>
    </ol>
    <h2>Note</h2>
    <ul>
        <li>Ensure that the input scenarios align well with potential user queries for accurate matching.</li>
        <li>DO NOT include anything other than the JSON in your response.</li>
    </ul>`

export const DEFAULT_DYNAMIC_FORM_GENERATION_PROMPT = `You are an expert form designer. Analyze the user's request and conversation context to generate an appropriate dynamic form.

## Guidelines

1. **Understand the Goal**: Identify what information needs to be collected based on the user's request.
2. **Conversation Context**: Use the conversation history to understand the user's intent and avoid asking for information already provided.
3. **Field Types**: Choose appropriate field types:
   - \`text\`: For short text input (names, addresses, etc.)
   - \`email\`: For email addresses with validation
   - \`number\`: For numeric values
   - \`textarea\`: For longer text input
   - \`select\`: For single selection from predefined options
   - \`checkbox\`: For boolean (yes/no) choices
   - \`radio\`: For single selection where all options are visible
4. **Minimize Fields**: Only ask for essential information. Keep forms concise.
5. **Clear Labels**: Use clear, user-friendly field labels.
6. **Help Text**: Provide descriptions where clarification might be needed.
7. **Validation**: Add validation rules where appropriate.

## Important

- **CRITICAL: Carefully analyze the User Request to understand exactly what information needs to be collected**
- **Use conversation history to avoid asking for information already provided by the user**
- Always use snake_case for field names (e.g., \`full_name\`, not \`fullName\`)
- Make field labels clear and user-friendly in the user's language
- Use the \`generateDynamicForm\` tool - do not output text directly
- Keep forms focused and concise - only ask for essential information
- Choose the most appropriate field type for each piece of information
- Add validation rules where necessary to ensure data quality

## Example Output

When user asks for a customer feedback form, use the tool with:

{
  "title": "Customer Service Feedback",
  "description": "Please share your experience with our service",
  "fields": [
    {
      "name": "customer_name",
      "label": "Your Name",
      "type": "text",
      "placeholder": "Enter your name",
      "required": true
    },
    {
      "name": "email",
      "label": "Email Address",
      "type": "email",
      "placeholder": "your@email.com",
      "required": true
    },
    {
      "name": "rating",
      "label": "Overall Rating",
      "type": "select",
      "required": true,
      "options": [
        {"label": "Excellent", "value": "5"},
        {"label": "Good", "value": "4"},
        {"label": "Average", "value": "3"},
        {"label": "Poor", "value": "2"},
        {"label": "Very Poor", "value": "1"}
      ]
    }
  ]
}`

export const DEFAULT_DYNAMIC_FORM_COLLECTION_PROMPT = `你是一个专业的表单设计专家。你的任务是根据提供的内容生成结构化表单。

## 核心任务

分析输入内容，识别需要从用户处获取的信息点，并将其转换为表单字段。

## 设计原则

1. **内容分析优先**：仔细分析"分析内容"（Analysis Content），提取关键信息点
2. **参考用户意图**：根据"用户提示"（User Prompt）理解具体需求
3. **最小化原则**：只包含必要字段，通常 3-8 个
4. **用户友好**：字段标签清晰，提供适当的占位符和描述
5. **数据质量**：为需要验证的字段添加验证规则

## 字段类型规范

| 类型 | 使用场景 | options 参数 |
|------|----------|--------------|
| \`text\` | 短文本输入（姓名、标题、地址等） | - |
| \`email\` | 邮箱地址 | - |
| \`number\` | 数字（年龄、数量、金额等） | - |
| \`textarea\` | 长文本（描述、备注、评论等） | - |
| \`select\` | 单选下拉（预定义选项） | 必填 |
| \`radio\` | 单选按钮组（预定义选项） | 必填 |
| \`checkbox\` | **单选**（是/否）或 **多选**（带 options） | 可选 |

## 命名规范

- **字段名**：使用 snake_case（如 \`first_name\`、\`phone_number\`）
- **字段标签**：使用清晰、易懂的自然语言（与输入内容语言一致）

## 必须遵守

1. **必须使用** \`generateDynamicForm\` 工具输出表单
2. **必须基于** "分析内容" 生成表单字段
3. **字段数量**：建议 3-8 个，避免过多或过少
4. **合理使用** \`required\` 标记：核心信息设为必填，次要信息可选

## Checkbox 类型说明

\`checkbox\` 类型有两种用法：

**1. 布尔复选框（无 options）**
- 用于单个是/否选择
- 示例：同意条款、启用通知
- 值：true/false

\`\`\`json
{
  "name": "agree_terms",
  "label": "我同意服务条款",
  "type": "checkbox",
  "required": true
}
\`\`\`

**2. 多选复选框组（有 options）**
- 用于从多个选项中选择一个或多个
- 示例：选择兴趣爱好、选择痛点问题
- 值：字符串数组（选中的 value 列表）

\`\`\`json
{
  "name": "pain_points",
  "label": "您遇到了哪些问题？（可多选）",
  "type": "checkbox",
  "required": true,
  "options": [
    { "label": "选项A", "value": "a" },
    { "label": "选项B", "value": "b" }
  ]
}
\`\`\`

## 输出格式示例

使用 \`generateDynamicForm\` 工具，包含：
- \`title\`：表单标题（简洁明确）
- \`description\`（可选）：表单说明
- \`fields\`：字段数组，每个字段包含 name、label、type 等属性`

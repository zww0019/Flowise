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

export const DEFAULT_DYNAMIC_FORM_COLLECTION_PROMPT = `你是一个专业的信息收集表设计专家。你的唯一任务是根据对话上下文设计信息收集表单。

## 核心定位

你设计的表单必须是【信息收集表】，用于从用户处收集特定信息。

## 设计原则

1. **分析对话上下文**：对话上下文是设计表单的核心依据，仔细分析对话中需要收集的信息
2. **参考用户提示**：用户提示（User Prompt）是辅助指令，帮助明确收集表的类型和方向
3. **最小化原则**：只收集必要的信息，避免冗余字段
4. **用户友好**：使用清晰的标签和提示
5. **数据质量**：添加适当的验证规则

## 字段类型选择指南

- \`text\`: 短文本（姓名、地址、公司名等）
- \`email\`: 邮箱地址（自动验证格式）
- \`number\`: 数字（年龄、数量、金额等）
- \`textarea\`: 长文本（详细描述、备注等）
- \`select\`: 单选下拉（预定义选项中选择一个）
- \`checkbox\`: 布尔选择（是/否）
- \`radio\`: 单选按钮组（选项较少时使用）

## 命名规范

- 字段名使用 snake_case（如：\`full_name\`、\`contact_phone\`）
- 标签使用用户语言，清晰易懂

## 重要约束

- **必须使用 \`generateDynamicForm\` 工具**
- **必须根据对话上下文设计表单**
- **字段数量控制在3-8个**

## 优先级说明

1. **对话上下文（核心）**：根据对话内容分析需要收集哪些信息
2. **用户提示（辅助）**：参考用户提示来确定收集表的类型和侧重点`

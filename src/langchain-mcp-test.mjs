import 'dotenv/config';
import { MultiServerMCPClient } from'@langchain/mcp-adapters';
import { ChatOpenAI } from'@langchain/openai';
import chalk from'chalk';
import { SystemMessage, HumanMessage, ToolMessage } from'@langchain/core/messages';

const model = new ChatOpenAI({ 
    modelName: "qwen-plus",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'my-mcp-server': {
      command: 'node',
      args: ['./src/my-mcp-server.mjs'],
    }
  }
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

// 使用mcp resource
const res = await mcpClient.listResources();

let resourceContent = '';
for (const [serverName, resources] of Object.entries(res)) {
  for (const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri);
    resourceContent += content[0].text;
  }
}

async function runAgentWithMCPTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage(resourceContent),
    new HumanMessage(query)
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

  // 检查是否有工具调用
  if (!response.tool_calls || response.tool_calls.length === 0) {
     console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
     return response.content;
  }

    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find(t => t.name === toolCall.name);

      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args);
        messages.push(new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id,
        }));
      }
    }
  }

  return messages[messages.length - 1].content;
}

// 使用mcp tool
// await runAgentWithMCPTools('请查询用户ID为002的用户信息。');
await runAgentWithMCPTools('MCP 服务器使用指南是什么？');

await mcpClient.close();

// config.js - 项目配置文件

// API 配置
const API_CONFIG = {
  CHAT_ANYWHERE_ENDPOINT: "https://api.chatanywhere.tech/v1/chat/completions",
  OPENAI_ENDPOINT: "https://api.openai.com/v1/chat/completions"
};

// 模型配置
const AI_MODELS = {
  DEFAULT: "gpt-4o-ca",
  IMAGE_SUPPORTED: [
    'gpt-o1', 
    'o1-mini-ca',
    'gpt-4o', 
    'gpt-4o-ca', 
    'gpt-4o-mini',
    'gpt-4o-mini-ca',
    'gpt-4-vision-preview',
    'gpt-4-turbo',
    'deepseek-r1',
    'gpt-4.5-preview',
    'grok-3-reasoner',
    'grok-3-deepsearch'
  ],
  // 模型详细信息配置
  MODELS_INFO: [
    {
      name: "gpt-4o-mini",
      description: "最经济",
      inputRate: 0.00105,
      outputRate: 0.0042,
      supportsImages: true
    },
    {
      name: "gpt-4o-mini-ca",
      description: "三方模型,便宜,略微不稳定",
      inputRate: 0.00075,
      outputRate: 0.003,
      supportsImages: true
    },
    {
      name: "gpt-4o",
      description: "强大的多模态模型",
      inputRate: 0.0175,
      outputRate: 0.07,
      supportsImages: true
    },
    {
      name: "gpt-4o-ca",
      description: "三方模型,便宜,略微不稳定",
      inputRate: 0.01,
      outputRate: 0.04,
      supportsImages: true
    },
    {
      name: "gpt-4.5-preview",
      description: "OpenAI最新预览模型",
      inputRate: 0.525,
      outputRate: 1.05,
      supportsImages: true
    },
    {
      name: "gpt-4-turbo",
      description: "稳定的多模态模型",
      inputRate: 0.0105,
      outputRate: 0.0315,
      supportsImages: true
    },
    {
      name: "gpt-4-vision-preview",
      description: "专业图像分析",
      inputRate: 0.0105,
      outputRate: 0.0315,
      supportsImages: true
    },
    {
      name: "gpt-3.5-turbo",
      description: "经济",
      inputRate: 0.0035,
      outputRate: 0.0105,
      supportsImages: false
    },
    {
      name: "gpt-3.5-turbo-ca",
      description: "最便宜",
      inputRate: 0.001,
      outputRate: 0.003,
      supportsImages: false
    },
    {
      name: "gpt-4",
      description: "每天3次",
      inputRate: 0.21,
      outputRate: 0.42,
      supportsImages: false
    },
    {
      name: "deepseek-r1",
      description: "专业推理分析",
      inputRate: 0.0024,
      outputRate: 0.0096,
      supportsImages: true
    },
    {
      name: "grok-3-reasoner",
      description: "推理增强",
      inputRate: 0.016,
      outputRate: 0.08,
      supportsImages: true
    },
    {
      name: "grok-3-deepsearch",
      description: "深度搜索",
      inputRate: 0.016,
      outputRate: 0.08,
      supportsImages: true
    }
  ]
};

// 默认提示词
const DEFAULT_PROMPTS = {
  CHART_ANALYSIS: "这是一个加密货币交易图表。图中k线及EMA BOLL WR RSI等其他技术指标。我需要进行合约交易，仓位50U，我是50倍全仓杠杆，请根据我的本金及杠杆，并结合当前选中的K线周期及其他技术指标，使用稍微保守一些的方案，使用多种策略分析并回测，选取胜率高的，预测接下来的价格走势，告诉我你观察到的k线周期，并给出合约交易该做多还是做空的结论，以及入场点及清仓点，回答要尽量简洁。"
};

// 存储键名
const STORAGE_KEYS = {
  API_KEY: "openaiApiKey",
  AI_MODEL: "aiModel",
  PROMPT_TEMPLATE: "promptTemplate",
  API_BALANCE: "apiBalance",
  API_BALANCE_UPDATED: "apiBalanceUpdated"
};

// 图表分析配置
const CHART_CONFIG = {
  MAX_IMAGE_WIDTH: 800,
  MAX_TOKENS: 500
};

// 导出所有配置
export {
  API_CONFIG,
  AI_MODELS,
  DEFAULT_PROMPTS,
  STORAGE_KEYS,
  CHART_CONFIG
}; 
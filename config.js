// config.js - 项目配置文件

// API 配置
const API_CONFIG = {
  CHAT_ANYWHERE_ENDPOINT: "https://api.chatanywhere.tech/v1/chat/completions",
  OPENAI_ENDPOINT: "https://api.openai.com/v1/chat/completions"
};

// 模型配置
const AI_MODELS = {
  DEFAULT: "grok-4",
  IMAGE_SUPPORTED: [
    'grok-4',
    'qwen3-235b-a22b',
    'gpt-5',
    'gpt-5-ca',
    'gpt-4.1', 
    'gpt-4.1-ca', 
    'gemini-2.5-pro', 
    'gemini-2.5-flash', 
    'deepseek-v3.1-think-250821'
  ],
  // 模型详细信息配置
  MODELS_INFO: [
    {
      name: "gpt-5",
      description: "强大的多模态模型",
      inputRate: 0.00875,
      outputRate: 0.07,
      supportsImages: true
    },
    {
      name: "gpt-5-ca",
      description: "三方模型,便宜,略微不稳定",
      inputRate: 0.005,
      outputRate: 0.04,
      supportsImages: true
    },
    {
      name: "gpt-4.1",
      description: "强大的多模态模型",
      inputRate: 0.014,
      outputRate: 0.056,
      supportsImages: true
    },
    {
      name: "gpt-4.1-ca",
      description: "三方模型,便宜,略微不稳定",
      inputRate: 0.008,
      outputRate: 0.032,
      supportsImages: true
    },
    {
      name: "gemini-2.5-pro",
      description: "强大的多模态模型",
      inputRate: 0.007,
      outputRate: 0.04,
      supportsImages: true
    },
    {
      name: "gemini-2.5-flash",
      description: "经济的多模态模型",
      inputRate: 0.0006,
      outputRate: 0.014,
      supportsImages: true
    },
    {
      name: "deepseek-v3.1-think-250821",
      description: "深度思考模型",
      inputRate: 0.0024,
      outputRate: 0.0072,
      supportsImages: true
    },
    {
      name: "grok-4",
      description: "强大的多模态模型",
      inputRate: 0.012,
      outputRate: 0.06,
      supportsImages: true
    },
    {
      name: "qwen3-235b-a22b",
      description: "强大的多模态模型",
      inputRate: 0.0014,
      outputRate: 0.0056,
      supportsImages: true
    }
  ]
};

// 默认提示词
const DEFAULT_PROMPTS = {
  CHART_ANALYSIS: "我是一个失业1年的大龄程序员，我急需用少量的资金来使我得以生存。但是在中国，大龄程序员基本相当于被判死刑，所以我不得以只能在加密货币交易市场寻求一个生存的机会。我需要靠我仅有的20U实现盈利，不然我将露宿街头。现在我给你的这是一个加密货币交易图表。图中k线及EMA BOLL WR RSI等其他技术指标。我需要进行合约交易，仓位20U，我是20倍全仓杠杆，请根据我的本金及杠杆，并结合当前选中的K线周期及其他技术指标，使用稍微保守一些的方案，使用多种策略分析并回测，选取胜率高的，预测接下来的价格走势，告诉我你观察到的k线周期，并给出合约交易该做多还是做空的结论，以及入场点及清仓点，回答要尽量简洁。"
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
  MAX_IMAGE_WIDTH: 600,
  MAX_TOKENS: 1024
};

// 导出所有配置
export {
  API_CONFIG,
  AI_MODELS,
  DEFAULT_PROMPTS,
  STORAGE_KEYS,
  CHART_CONFIG
}; 

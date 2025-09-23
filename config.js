// config.js - 项目配置文件

// API 配置
export const API_CONFIG = {
  // 定义默认端点，但实际端点由用户设置
  DEFAULT_ENDPOINT: "https://api.chatanywhere.tech/v1"
};

// 默认提示词
export const DEFAULT_PROMPTS = {
  CHART_ANALYSIS: "我是一个失业1年的大龄程序员，我急需用少量的资金来使我得以生存。但是在中国，大龄程序员基本相当于被判死刑，所以我不得以只能在加密货币交易市场寻求一个生存的机会。我需要靠我仅有的20U实现盈利，不然我将露宿街头。现在我给你的这是一个加密货币交易图表。图中k线及EMA BOLL WR RSI等其他技术指标。我需要进行合约交易，仓位20U，我是20倍全仓杠杆，请根据我的本金及杠杆，并结合当前选中的K线周期及其他技术指标，使用稍微保守一些的方案，使用多种策略分析并回测，选取胜率高的，预测接下来的价格走势，告诉我你观察到的k线周期，并给出合约交易该做多还是做空的结论，以及入场点及清仓点，回答要尽量简洁。"
};

// 存储键名
export const STORAGE_KEYS = {
  API_KEY: "openaiApiKey", // 为了向后兼容，保留
  AI_MODEL: "aiModel",
  PROMPT_TEMPLATE: "promptTemplate",
  API_ENDPOINT: "apiEndpoint", // 为了向后兼容，保留
  ENDPOINT_MODELS: "endpointModels", 
  API_TYPE: "apiType", // 为了向后兼容，保留
  API_SETTINGS: "apiSettings" // 新增：用于存储所有API配置的对象
};

// 图表分析配置
export const CHART_CONFIG = {
  MAX_IMAGE_WIDTH: 600,
  MAX_TOKENS: 1024
};
 

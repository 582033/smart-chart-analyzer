// background.js
import { API_CONFIG, STORAGE_KEYS } from './config.js';

console.log("加密货币图表分析助手后台脚本开始加载");

// 从存储中获取API密钥
let openaiApiKey = ""; // 默认为空，将从storage获取

// 初始化时从存储加载API密钥
chrome.storage.local.get([STORAGE_KEYS.API_KEY], function(result) {
  if (result[STORAGE_KEYS.API_KEY]) {
    openaiApiKey = result[STORAGE_KEYS.API_KEY];
    console.log("已从存储加载API密钥");
    
    // 加载API密钥后自动查询余额
    fetchApiBalance(openaiApiKey);
  } else {
    console.log("未找到已保存的API密钥");
  }
});

// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("后台脚本收到消息:", message, "来自:", sender);
  
  if (message.action === "contentScriptReady") {
    console.log("内容脚本已准备就绪，URL:", message.url);
    sendResponse({ success: true, message: "后台脚本已收到就绪通知" });
  }
  
  if (message.action === "openSidePanel") {
    console.log("收到打开侧边栏请求");
    try {
      chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => {
        console.log("侧边栏已打开");
        sendResponse({ success: true });
      }).catch(err => {
        console.error("打开侧边栏失败:", err);
        sendResponse({ success: false, error: err.message });
      });
    } catch (error) {
      console.error("尝试打开侧边栏出错:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // 表示异步sendResponse
  }
  
  if (message.action === "queryApiBalance") {
    // 使用立即执行的异步函数处理
    (async () => {
      try {
        if (!openaiApiKey) {
          sendResponse({ success: false, error: "未设置API密钥" });
          return;
        }
        
        const balance = await fetchApiBalance(openaiApiKey);
        sendResponse({ success: true, balance });
      } catch (err) {
        console.error("查询API余额错误:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // 表示异步sendResponse
  }
  
  if (message.type === "REQUEST_PREDICTION") {
    const data = message.payload;
    // 使用立即执行的异步函数处理
    (async () => {
      try {
        const prediction = await getGptPrediction(data);
        // 把结果再回发给content script或popup
        sendResponse({ success: true, prediction });
      } catch (err) {
        console.error("GPT error:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // 表示异步sendResponse
  }
  
  return true; // 表示异步sendResponse
});

// 查询ChatAnywhere API余额
async function fetchApiBalance(apiKey) {
  console.log("开始查询ChatAnywhere API余额");
  
  try {
    // 调用ChatAnywhere API查询余额
    const response = await fetch('https://api.chatanywhere.tech/v1/query/balance', {
      method: 'POST',
      headers: {
        'Authorization': `${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://api.chatanywhere.tech',
        'Referer': 'https://api.chatanywhere.tech/'
      },
      body: '' // 发送空body的POST请求
    });
    
    const responseText = await response.text();
    console.log("API余额查询原始响应:", responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("解析API响应JSON失败:", e);
      throw new Error("解析API响应失败: " + responseText.substring(0, 100));
    }
    
    console.log("API余额查询结果:", data);
    
    // 检查API错误
    if (data.error) {
      console.error("API返回错误:", data.error);
      
      // 将错误信息保存到storage，以便UI显示
      chrome.storage.local.set({ 
        [STORAGE_KEYS.API_BALANCE]: {
          error: data.error,
          errorMessage: data.error.message || "API错误",
          timestamp: Date.now()
        },
        [STORAGE_KEYS.API_BALANCE_UPDATED]: Date.now()
      }, function() {
        console.log('API错误信息已保存');
      });
      
      // 如果是API密钥错误，显示特定的错误信息
      if (data.error.code === "401 UNAUTHORIZED" || 
          (data.error.message && data.error.message.toLowerCase().includes("apikey错误"))) {
        throw new Error("API密钥错误，请检查您的 ChatAnywhere API 密钥");
      }
      
      throw new Error(data.error.message || "查询余额失败");
    }
    
    // 检查数据格式
    if (data.balanceTotal === undefined && data.code === undefined && data.balance === undefined) {
      console.warn("API返回的数据格式不符合预期:", data);
    }
    
    // 将余额信息保存到storage
    chrome.storage.local.set({ 
      [STORAGE_KEYS.API_BALANCE]: data,
      [STORAGE_KEYS.API_BALANCE_UPDATED]: Date.now()
    }, function() {
      console.log('API余额信息已保存');
    });
    
    return data;
  } catch (error) {
    console.error("查询API余额失败:", error);
    throw error;
  }
}

// 扩展安装或更新时
chrome.runtime.onInstalled.addListener(function(details) {
  console.log("扩展已安装或更新:", details.reason);
  
  // 设置侧边栏默认显示
  try {
    chrome.sidePanel.setOptions({
      path: 'side_panel.html',
      enabled: true
    }).then(() => {
      console.log("侧边栏选项已设置");
    }).catch(err => {
      console.error("设置侧边栏选项失败:", err);
    });
  } catch (error) {
    console.error("尝试设置侧边栏选项出错:", error);
  }
});

// 扩展图标被点击时
chrome.action.onClicked.addListener((tab) => {
  console.log("扩展图标被点击, tab:", tab.url);
  
  // 检查当前网站是否为支持的交易所
  const isOKX = tab.url.includes('okx.com');
  const isBinance = tab.url.includes('binance.com') || tab.url.includes('binance.us');
  const isSupportedExchange = isOKX || isBinance;
  
  console.log(`网站URL: ${tab.url}, 是否支持: ${isSupportedExchange}`);
  
  // 当在支持的交易所网站上时，打开侧边栏
  if (isSupportedExchange) {
    try {
      chrome.sidePanel.open({ tabId: tab.id }).then(() => {
        console.log("侧边栏已打开");
      }).catch(err => {
        console.error("打开侧边栏失败:", err);
        // 如果打开失败，尝试使用setOptions再次确认设置
        chrome.sidePanel.setOptions({
          path: 'side_panel.html',
          enabled: true
        }).then(() => {
          // 重试打开
          return chrome.sidePanel.open({ tabId: tab.id });
        });
      });
    } catch (error) {
      console.error("尝试打开侧边栏出错:", error);
    }
  } else {
    // 不在支持的网站上时显示提示
    chrome.action.setTitle({
      tabId: tab.id,
      title: '请在OKX或币安网站上使用此扩展'
    });
    
    alert('请在OKX或币安网站上使用此扩展');
  }
});

// 调用OpenAI GPT接口
async function getGptPrediction(cryptoData) {
  const prompt = generatePrompt(cryptoData);

  const reqBody = {
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a financial analyst for crypto." },
      { role: "user", content: prompt }
    ],
    max_tokens: 150,
    temperature: 0.7
  };

  const response = await fetch(API_CONFIG.OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `${openaiApiKey}`
    },
    body: JSON.stringify(reqBody)
  });

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message);
  }
  // GPT-3.5-turbo 返回的数据结构
  return json.choices[0].message.content.trim();
}

// 根据抓取的数据拼接提示词
function generatePrompt({ price, volume, rsi, macd }) {
  return `当前ETH行情数据：
- 价格: ${price}
- 成交量: ${volume}
- RSI: ${rsi}
- MACD: ${macd}

基于以上指标，预测未来1小时内ETH的短线走势，并给出简要理由。`;
}

console.log("加密货币图表分析助手后台脚本已加载完成");


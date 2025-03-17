// background.js
import { API_CONFIG, STORAGE_KEYS } from './config.js';

console.log("OKX 图表分析助手后台脚本开始加载");

// 从存储中获取API密钥
let openaiApiKey = ""; // 默认为空，将从storage获取

// 初始化时从存储加载API密钥
chrome.storage.local.get([STORAGE_KEYS.API_KEY], function(result) {
  if (result[STORAGE_KEYS.API_KEY]) {
    openaiApiKey = result[STORAGE_KEYS.API_KEY];
    console.log("已从存储加载API密钥");
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

// 扩展安装或更新时
chrome.runtime.onInstalled.addListener(function(details) {
  console.log("扩展已安装或更新:", details.reason);
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
      "Authorization": `Bearer ${openaiApiKey}`
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

// 设置定时任务，每隔一定时间获取最新数据
chrome.alarms.create('updateMarketData', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateMarketData') {
    fetchLatestData();
  }
});

// 获取最新数据并存储
async function fetchLatestData() {
  try {
    const btcResponse = await fetch('https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=15m&limit=1');
    const btcData = await btcResponse.json();
    
    if (btcData.data && btcData.data.length > 0) {
      const latestPrice = parseFloat(btcData.data[0][4]);
      
      // 使用 chrome.storage.local 存储最新价格
      chrome.storage.local.set({ 'latestBtcPrice': latestPrice.toString() }, function() {
        console.log('最新价格已存储:', latestPrice);
        
        // 检查是否需要发送通知
        chrome.storage.local.get([STORAGE_KEYS.PRICE_ALERTS], function(result) {
          if (result[STORAGE_KEYS.PRICE_ALERTS]) {
            try {
              const priceAlerts = JSON.parse(result[STORAGE_KEYS.PRICE_ALERTS]);
              checkPriceAlerts(latestPrice, priceAlerts);
            } catch (error) {
              console.error('解析价格提醒失败:', error);
            }
          }
        });
      });
    }
  } catch (error) {
    console.error('后台更新数据失败:', error);
  }
}

// 检查价格提醒
function checkPriceAlerts(currentPrice, alerts) {
  if (!alerts || !Array.isArray(alerts)) return;
  
  let hasChanges = false;
  
  alerts.forEach(alert => {
    if (alert.active) {
      if (alert.type === 'above' && currentPrice >= alert.price) {
        sendNotification(`BTC 价格已超过 $${alert.price}`, `当前价格: $${currentPrice}`);
        // 禁用此提醒，避免重复通知
        alert.active = false;
        hasChanges = true;
      } else if (alert.type === 'below' && currentPrice <= alert.price) {
        sendNotification(`BTC 价格已低于 $${alert.price}`, `当前价格: $${currentPrice}`);
        // 禁用此提醒，避免重复通知
        alert.active = false;
        hasChanges = true;
      }
    }
  });
  
  // 保存更新后的提醒设置
  if (hasChanges) {
    const alertsObj = {};
    alertsObj[STORAGE_KEYS.PRICE_ALERTS] = JSON.stringify(alerts);
    chrome.storage.local.set(alertsObj, function() {
      console.log('已更新价格提醒设置');
    });
  }
}

// 发送通知
function sendNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: title,
    message: message
  });
}

// 初始化
fetchLatestData();

console.log("OKX 图表分析助手后台脚本已加载完成");


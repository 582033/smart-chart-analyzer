// content-script.js
console.log("交易图表分析助手内容脚本开始加载");
console.log("当前URL:", window.location.href);

// 确定当前网站是否受支持
const isOKX = window.location.href.includes('okx.com');
const isTradingView = window.location.href.includes('tradingview.com');
const isGate = window.location.href.includes('gate.com');
const isBinance = window.location.href.includes('binance.com');
const isSupportedSite = isOKX || isTradingView || isGate || isBinance;

console.log(`网站支持状态: ${isSupportedSite ? '支持' : '不支持'} (OKX: ${isOKX}, TradingView: ${isTradingView}, Gate: ${isGate}, Binance: ${isBinance})`);

// 在加载完成后执行的主函数
function init() {
  try {
    console.log(`页面加载完成，URL: ${window.location.href}`);
    
    if (!isSupportedSite) {
      console.log("不支持的网站，停止执行");
      return;
    }
    
    // 向background.js发送就绪消息
    chrome.runtime.sendMessage({
      action: "contentScriptReady",
      url: window.location.href,
      timestamp: Date.now()
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("发送就绪消息失败:", chrome.runtime.lastError);
      } else {
        console.log("发送就绪消息成功，响应:", response);
        
        // 可以开始监听页面上的事件
        setupEventListeners();
      }
    });
  } catch (error) {
    console.error("内容脚本初始化失败:", error);
  }
}

// 设置事件监听器
function setupEventListeners() {
  // 这里可以添加对页面元素的监听
  console.log("设置页面事件监听器");
  
  // 使用通用的图表选择器
  const chartContainerSelector = '.chart-container, .tradingview-chart, .chart-markup-table, .tv-chart-container';
  
  console.log(`使用图表选择器: ${chartContainerSelector}`);
  
  // 尝试找到图表容器
  const chartObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        console.log("检测到图表变化");
      }
    });
  });
  
  // 尝试使用多个可能的选择器
  const possibleSelectors = chartContainerSelector.split(',').map(s => s.trim());
  let chartContainer = null;
  
  for (const selector of possibleSelectors) {
    chartContainer = document.querySelector(selector);
    if (chartContainer) {
      console.log(`找到图表容器，使用选择器: ${selector}`);
      break;
    }
  }
  
  if (chartContainer) {
    chartObserver.observe(chartContainer, { childList: true, subtree: true });
    console.log("已设置图表观察器");
  } else {
    console.warn("未找到图表容器，将在5秒后重试");
    
    // 如果没有立即找到，设置一个延迟重试
    setTimeout(() => {
      for (const selector of possibleSelectors) {
        const retryContainer = document.querySelector(selector);
        if (retryContainer) {
          chartObserver.observe(retryContainer, { childList: true, subtree: true });
          console.log(`延迟后找到并设置图表观察器，使用选择器: ${selector}`);
          return;
        }
      }
      console.error("重试后仍未找到图表容器");
    }, 5000);
  }
}

// 页面加载完成后，通知扩展已准备好
window.addEventListener('load', init);

console.log("交易图表分析助手内容脚本已加载完成");


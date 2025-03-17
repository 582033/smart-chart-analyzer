// content-script.js
console.log("OKX 图表分析助手内容脚本开始加载");

// 在加载完成后执行的主函数
function init() {
  try {
    console.log("页面加载完成，发送内容脚本就绪消息");
    
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
  
  // 例如，监听图表容器的变化
  const chartObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        console.log("检测到图表变化");
      }
    });
  });
  
  // 尝试找到图表容器
  const chartContainer = document.querySelector('.chart-container');
  if (chartContainer) {
    chartObserver.observe(chartContainer, { childList: true, subtree: true });
  }
}

// 页面加载完成后，通知扩展已准备好
window.addEventListener('load', init);

console.log("OKX 图表分析助手内容脚本已加载完成");


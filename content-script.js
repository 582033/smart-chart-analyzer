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
        
        // 添加侧边栏工具栏按钮
        addSidePanelButton();
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

// 添加侧边栏按钮到页面
function addSidePanelButton() {
  // 避免重复添加
  if (document.getElementById('okx-ai-sidepanel-btn')) return;
  
  // 创建按钮
  const button = document.createElement('button');
  button.id = 'okx-ai-sidepanel-btn';
  button.innerHTML = '分析图表';
  button.style.cssText = `
    position: fixed;
    right: 20px;
    top: 100px;
    z-index: 9999;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  
  // 点击按钮打开侧边栏
  button.addEventListener('click', function() {
    console.log("页面按钮被点击，请求打开侧边栏");
    chrome.runtime.sendMessage({
      action: "openSidePanel"
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error("发送打开侧边栏消息失败:", chrome.runtime.lastError);
        alert("打开分析面板失败，请尝试点击扩展图标");
      } else {
        console.log("侧边栏打开请求已发送，响应:", response);
        if (response && !response.success) {
          console.error("打开侧边栏失败:", response.error);
          alert("打开分析面板失败，请尝试点击扩展图标");
        }
      }
    });
  });
  
  document.body.appendChild(button);
  
  console.log("已添加侧边栏按钮到页面");
}

// 页面加载完成后，通知扩展已准备好
window.addEventListener('load', init);

console.log("OKX 图表分析助手内容脚本已加载完成");


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
    return true;
  }
  
  if (message.action === "openSidePanel") {
    console.log("收到打开侧边栏请求");
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ success: true });
    return true;
  }

  // 新增：处理来自侧边栏的 fetch 请求
  if (message.type === 'fetch-request') {
    const { url, options } = message.payload;
    console.log('[背景脚本] 收到 fetch 请求:', url, options);

    fetch(url, options)
      .then(response => {
        // 将 response body 读取为文本
        return response.text().then(text => ({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: text
        }));
      })
      .then(serializableResponse => {
        console.log('[背景脚本] 请求成功, 返回响应。');
        sendResponse({ success: true, response: serializableResponse });
      })
      .catch(error => {
        console.error('[背景脚本] fetch 失败:', error);
        sendResponse({ success: false, error: { message: error.message, stack: error.stack } });
      });
    
    return true; // 明确表示我们将异步发送响应
  }

  // 新增：处理来自侧边栏的截图请求
  if (message.type === 'capture-tab') {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          throw new Error("No active tab found.");
        }
        const activeTab = tabs[0];
        
        const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' });
        
        console.log('[背景脚本] 截图成功');
        sendResponse({ success: true, dataUrl: dataUrl });
      } catch (error) {
        console.error('[背景脚本] 截图失败:', error);
        sendResponse({ success: false, error: { message: error.message, stack: error.stack } });
      }
    })();
    return true; // 异步响应
  }
});


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
  
  // 总是尝试打开侧边栏
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
});



console.log("加密货币图表分析助手后台脚本已加载完成");


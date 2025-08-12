// 导入配置
import { API_CONFIG, AI_MODELS, DEFAULT_PROMPTS, STORAGE_KEYS, CHART_CONFIG } from './config.js';

// 全局变量
let apiKey = '';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('侧边栏已加载');
  
  // 加载模型选项
  loadModelOptions();
  
  // 加载价格信息
  loadPriceInfo();
  
  // 设置事件监听器
  document.getElementById('save-settings').addEventListener('click', function() {
    console.log('保存按钮被点击');
    saveSettings();
  });
  
  // 添加价格信息折叠/展开功能
  document.getElementById('toggle-price-info').addEventListener('click', function() {
    const priceInfo = document.getElementById('price-info');
    const isVisible = priceInfo.style.display !== 'none';
    
    priceInfo.style.display = isVisible ? 'none' : 'block';
    this.textContent = isVisible ? '查看价格对比 ▼' : '隐藏价格对比 ▲';
  });
  
  // 添加提示词信息折叠/展开功能
  document.getElementById('toggle-prompt-info').addEventListener('click', function() {
    const promptInfo = document.getElementById('prompt-info');
    const isVisible = promptInfo.style.display !== 'none';
    
    promptInfo.style.display = isVisible ? 'none' : 'block';
    this.textContent = isVisible ? '查看默认提示词 ▼' : '隐藏默认提示词 ▲';
  });
  
  // 添加刷新余额按钮事件
  document.getElementById('refresh-balance').addEventListener('click', function() {
    console.log('刷新余额按钮被点击');
    queryApiBalance();
  });
  
  // 加载保存的设置
  loadSettings();
  
  // 加载API余额信息
  loadApiBalance();
  
  // 添加图表分析按钮事件
  document.getElementById('analyze-chart-btn').addEventListener('click', async function() {
    console.log('分析按钮被点击');
    await captureAndAnalyzeChart();
  });
  
  // 添加标签切换功能
  setupTabNavigation();
  
  console.log('所有事件监听器已设置');
});

// 设置标签页导航
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // 更新激活的标签页
      const tabName = this.getAttribute('data-tab');
      
      // 移除所有标签页的激活状态
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // 设置当前标签页为激活状态
      this.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// 从配置文件加载模型选项
function loadModelOptions() {
  const modelSelect = document.getElementById('ai-model');
  // 清空现有选项
  modelSelect.innerHTML = '';
  
  // 从配置添加选项
  AI_MODELS.MODELS_INFO.forEach(model => {
    const option = document.createElement('option');
    option.value = model.name;
    option.textContent = `${model.name} (${model.description})`;
    // 如果是默认模型，设为选中
    if (model.name === AI_MODELS.DEFAULT) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  });
  
  console.log('已加载模型选项');
}

// 从模型ID获取模型信息
function getModelInfo(modelName) {
  return AI_MODELS.MODELS_INFO.find(model => model.name === modelName) || 
         AI_MODELS.MODELS_INFO.find(model => model.name === AI_MODELS.DEFAULT);
}

// 从配置文件加载价格信息
function loadPriceInfo() {
  const priceList = document.getElementById('price-list');
  
  // 按模型名称排序
  const sortedModels = [...AI_MODELS.MODELS_INFO].sort((a, b) => {
    // 将默认模型置顶
    if (a.name === AI_MODELS.DEFAULT) return -1;
    if (b.name === AI_MODELS.DEFAULT) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // 清空现有价格列表
  priceList.innerHTML = '';
  
  // 添加价格信息
  sortedModels.forEach(model => {
    const li = document.createElement('li');
    let priceText = `${model.name}: 输入 ${model.inputRate}元，输出 ${model.outputRate}元`;
    
    // 添加特殊说明
    if (model.name === 'gpt-4') {
      priceText += ' (每天限3次)';
    }
    if (model.supportsImages) {
      priceText += ' ✓图像';
    }
    
    li.textContent = priceText;
    priceList.appendChild(li);
  });
  
  // 更新多模态模型说明
  const imageModels = AI_MODELS.MODELS_INFO.filter(model => model.supportsImages)
                                          .map(model => model.name);
  document.querySelector('#price-info p:last-child').textContent = 
    `注：多模态模型支持图像分析，包括${imageModels.join('、')}`;
  
  console.log('已加载价格信息');
}

// 加载所有设置
function loadSettings() {
  console.log('尝试加载设置');
  
  // 使用chrome.storage.local替代localStorage
  chrome.storage.local.get([
    STORAGE_KEYS.API_KEY, 
    STORAGE_KEYS.AI_MODEL, 
    STORAGE_KEYS.PROMPT_TEMPLATE
  ], function(result) {
    // 加载 API 密钥
    if (result[STORAGE_KEYS.API_KEY]) {
      apiKey = result[STORAGE_KEYS.API_KEY];
      document.getElementById('api-key').value = apiKey;
      console.log('API 密钥已加载:', apiKey.substring(0, 3) + '...');
    } else {
      console.log('未找到保存的 API 密钥');
      apiKey = ''; // 确保 apiKey 为空字符串而不是 undefined
    }
    
    // 加载保存的模型设置
    if (result[STORAGE_KEYS.AI_MODEL]) {
      document.getElementById('ai-model').value = result[STORAGE_KEYS.AI_MODEL];
      console.log('AI 模型已加载:', result[STORAGE_KEYS.AI_MODEL]);
    }
    
    // 加载保存的提示词模板
    if (result[STORAGE_KEYS.PROMPT_TEMPLATE]) {
      document.getElementById('prompt-template').value = result[STORAGE_KEYS.PROMPT_TEMPLATE];
      console.log('提示词模板已加载');
    } else {
      // 如果没有保存的提示词，使用默认提示词
      document.getElementById('prompt-template').value = DEFAULT_PROMPTS.CHART_ANALYSIS;
      console.log('使用默认提示词模板');
    }
  });
}

// 保存设置
function saveSettings() {
  console.log('保存设置');
  // 获取用户输入的 API 密钥
  const userApiKey = document.getElementById('api-key').value.trim();
  
  // 获取选中的 AI 模型
  const selectedModel = document.getElementById('ai-model').value;
  
  // 获取提示词模板
  const promptTemplate = document.getElementById('prompt-template').value.trim() || DEFAULT_PROMPTS.CHART_ANALYSIS;
  
  // 保存到chrome.storage
  const settingsObj = {};
  settingsObj[STORAGE_KEYS.API_KEY] = userApiKey;
  settingsObj[STORAGE_KEYS.AI_MODEL] = selectedModel;
  settingsObj[STORAGE_KEYS.PROMPT_TEMPLATE] = promptTemplate;
  
  chrome.storage.local.set(settingsObj, function() {
    console.log('设置已保存到 chrome.storage');
    // 更新全局变量
    apiKey = userApiKey;
    
    // API密钥变化时，刷新余额
    if (userApiKey) {
      queryApiBalance();
    }
    
    // 显示保存成功消息
    const saveBtn = document.getElementById('save-settings');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '✓ 设置已保存';
    saveBtn.style.backgroundColor = '#28a745';
    
    // 3秒后恢复按钮文本
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.style.backgroundColor = '';
    }, 3000);
  });
}

// 显示 API 密钥获取指南
function showApiKeyGuide() {
  console.log('显示 API 密钥获取指南');
  const chartAnalysisElement = document.getElementById('chart-analysis');
  chartAnalysisElement.innerHTML = `
    <div style="padding: 10px; background-color: #f8f9fa; border-radius: 4px; border-left: 3px solid #4a90e2;">
      <h3>如何获取 ChatAnywhere API 密钥</h3>
      <ol style="padding-left: 20px;">
        <li>访问 <a href="https://github.com/chatanywhere/GPT_API_free" target="_blank">ChatAnywhere GitHub</a></li>
        <li>按照项目说明申请免费 API 密钥</li>
        <li>将获取的密钥填入设置中</li>
        <li>点击保存设置</li>
      </ol>
      <p>如需更多使用次数，可以考虑购买付费版。</p>
    </div>
  `;
  
  // 自动切换到设置标签
  document.querySelector('.tab[data-tab="settings"]').click();
}

// 捕获并分析图表
async function captureAndAnalyzeChart() {
  console.log('开始捕获并分析图表');
  try {
    // 如果没有 API 密钥，显示获取指南
    if (!apiKey) {
      showApiKeyGuide();
      return;
    }
    
    // 获取当前标签页
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    console.log('当前标签页URL:', currentTab.url);
    
    // 检查是否在支持的网站上
    const isOKX = currentTab.url.includes('okx.com');
    const isTradingView = currentTab.url.includes('tradingview.com');
    const isGate = currentTab.url.includes('gate.com');
    const isBinance = currentTab.url.includes('binance.com');
    const isSupportedExchange = isOKX || isTradingView || isGate || isBinance;
    
    if (!isSupportedExchange) {
      alert('请在 OKX、TradingView、Gate 或 Binance 网站上使用此功能');
      return;
    }
    
    // 显示加载状态
    const chartAnalysisElement = document.getElementById('chart-analysis');
    chartAnalysisElement.innerHTML = '<div class="loading">正在截取图表...</div>';
    
    // 捕获当前标签页的截图
    const screenshot = await captureVisibleTab(currentTab.id);
    
    // 显示截图预览
    const chartPreviewImg = document.getElementById('chart-preview');
    chartPreviewImg.src = screenshot;
    chartPreviewImg.style.display = 'inline'; // 显示图片
    
    // 更新加载状态
    chartAnalysisElement.innerHTML = '<div class="loading">正在分析图表...</div>';
    
    // 使用 API 分析
    const analysis = await analyzeChartWithAI(screenshot);
    
    // 显示分析结果
    console.log('显示分析结果');
    chartAnalysisElement.innerHTML = `<div style="white-space: pre-line;">${analysis}</div>`;
    
    // 添加费用估算
    // 从chrome.storage获取选择的模型
    chrome.storage.local.get([STORAGE_KEYS.AI_MODEL], function(result) {
      const selectedModel = result[STORAGE_KEYS.AI_MODEL] || AI_MODELS.DEFAULT;
      const estimatedCost = estimateApiCost(selectedModel, analysis.length);
      
      const costElement = document.createElement('div');
      costElement.className = 'cost-estimate';
      costElement.innerHTML = `<small>估计费用: ${estimatedCost} CA币</small>`;
      chartAnalysisElement.appendChild(costElement);
    });
    
  } catch (error) {
    console.error('图表分析失败:', error);
    document.getElementById('chart-analysis').innerHTML = `<div style="color: red;">分析失败: ${error.message}</div>`;
  }
}

// 捕获标签页截图
function captureVisibleTab(tabId) {
  console.log('捕获标签页截图, tabId:', tabId);
  return new Promise((resolve, reject) => {
    // 使用 null 作为第一个参数，表示当前窗口
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
      if (chrome.runtime.lastError) {
        console.error('截图错误:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve(dataUrl);
      }
    });
  });
}

// 使用 ChatAnywhere API 分析图表
async function analyzeChartWithAI(imageDataUrl) {
  console.log('开始使用 ChatAnywhere API 分析图表');
  if (!apiKey) {
    console.warn('未设置 API 密钥');
    throw new Error('请先设置 API 密钥');
  }
  
  try {
    // 获取模型和提示词
    const modelAndPrompt = await new Promise(resolve => {
      chrome.storage.local.get([
        STORAGE_KEYS.AI_MODEL, 
        STORAGE_KEYS.PROMPT_TEMPLATE
      ], function(result) {
        resolve({
          selectedModel: result[STORAGE_KEYS.AI_MODEL] || AI_MODELS.DEFAULT,
          promptTemplate: result[STORAGE_KEYS.PROMPT_TEMPLATE] || DEFAULT_PROMPTS.CHART_ANALYSIS
        });
      });
    });
    
    const { selectedModel, promptTemplate } = modelAndPrompt;
    console.log('使用模型:', selectedModel);
    console.log('使用提示词模板:', promptTemplate.substring(0, 30) + '...');
    
    // 检查是否是支持图像的模型
    const modelInfo = getModelInfo(selectedModel);
    if (!modelInfo.supportsImages) {
      alert(`当前模型不支持图像分析，请选择 ${AI_MODELS.DEFAULT} 或其他支持图像的模型`);
      throw new Error('当前模型不支持图像分析');
    }
    
    // 使用统一的提示词
    const enhancedPrompt = `这是一个加密货币交易图表。${promptTemplate}`;
    
    // 压缩图像以减少 token 使用
    const compressedImage = await compressImage(imageDataUrl, CHART_CONFIG.MAX_IMAGE_WIDTH);
    console.log('图像已压缩，原始大小:', imageDataUrl.length, '压缩后:', compressedImage.length);
    
    // 构建请求体
    const requestBody = {
      model: selectedModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: enhancedPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: compressedImage
              }
            }
          ]
        }
      ],
      max_tokens: CHART_CONFIG.MAX_TOKENS
    };
    
    console.log('发送 API 请求到 ChatAnywhere，使用模型:', selectedModel);
    
    // 使用 ChatAnywhere API
    const apiEndpoint = API_CONFIG.CHAT_ANYWHERE_ENDPOINT;
    const aiResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('API 响应状态:', aiResponse.status);
    const data = await aiResponse.json();
    console.log('API 响应数据:', data);
    
    if (data.error) {
      // 如果是配额错误，显示特定消息
      if (data.error.message && (data.error.message.includes("quota") || data.error.message.includes("exceeded") || data.error.message.includes("limit"))) {
        console.error('API 配额超限');
        throw new Error("API 配额已用完。请检查您的 ChatAnywhere API 使用限制，免费版每天限制200次请求。");
      }
      console.error('API 错误:', data.error);
      throw new Error(data.error.message || "API 请求失败");
    }
    
    console.log('API 分析成功');
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('AI 分析图表失败:', error);
    throw error;
  }
}

// 压缩图像以减少 token 使用
async function compressImage(dataUrl, maxWidth) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // 如果图像宽度大于最大宽度，按比例缩小
      if (width > maxWidth) {
        height = Math.floor(height * (maxWidth / width));
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // 压缩为 JPEG 格式，质量 0.8
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  });
}

// 估算 API 费用
function estimateApiCost(modelName, responseLength) {
  // 估算输入和输出的 token 数量
  // 一般来说，1个中文字符约等于1-1.5个token
  const inputTokens = 500; // 固定输入 token 数量估计
  const outputTokens = Math.ceil(responseLength * 1.5 / 4); // 估算输出 token 数量
  
  // 获取模型费率信息
  const modelInfo = getModelInfo(modelName);
  const inputRate = modelInfo.inputRate;
  const outputRate = modelInfo.outputRate;
  
  // 计算费用
  const inputCost = (inputTokens / 1000) * inputRate;
  const outputCost = (outputTokens / 1000) * outputRate;
  const totalCost = inputCost + outputCost;
  
  return totalCost.toFixed(4);
}

// 从保存的数据加载API余额信息
function loadApiBalance() {
  console.log('尝试加载API余额信息');
  
  chrome.storage.local.get([
    STORAGE_KEYS.API_BALANCE,
    STORAGE_KEYS.API_BALANCE_UPDATED
  ], function(result) {
    if (result[STORAGE_KEYS.API_BALANCE]) {
      displayApiBalance(result[STORAGE_KEYS.API_BALANCE], result[STORAGE_KEYS.API_BALANCE_UPDATED]);
    } else {
      // 如果没有保存的余额信息，且有API密钥，尝试查询
      if (apiKey) {
        queryApiBalance();
      } else {
        console.log('未找到保存的API余额信息，且未设置API密钥');
      }
    }
  });
}

// 查询API余额
function queryApiBalance() {
  if (!apiKey) {
    console.warn('未设置API密钥，无法查询余额');
    alert('请先设置API密钥');
    return;
  }
  
  // 显示加载状态
  const refreshBtn = document.getElementById('refresh-balance');
  refreshBtn.classList.add('loading');
  document.getElementById('api-balance').textContent = '查询中...';
  document.getElementById('balance-last-updated').textContent = '正在查询...';
  
  // 向background脚本发送查询请求
  chrome.runtime.sendMessage({
    action: "queryApiBalance"
  }, function(response) {
    // 取消加载状态
    refreshBtn.classList.remove('loading');
    
    if (chrome.runtime.lastError) {
      console.error('发送查询余额请求失败:', chrome.runtime.lastError);
      const errorData = {
        errorMessage: chrome.runtime.lastError.message || "查询失败",
        timestamp: Date.now()
      };
      displayApiBalance(errorData, Date.now());
      return;
    }
    
    if (response && response.success) {
      console.log('余额查询成功:', response.balance);
      displayApiBalance(response.balance, Date.now());
    } else {
      console.error('余额查询失败:', response.error);
      const errorData = {
        errorMessage: response.error || "查询失败，请检查网络连接和API密钥",
        timestamp: Date.now()
      };
      displayApiBalance(errorData, Date.now());
    }
  });
}

// 显示API余额
function displayApiBalance(balanceData, timestamp) {
  const balanceElement = document.getElementById('api-balance');
  const lastUpdatedElement = document.getElementById('balance-last-updated');
  
  try {
    console.log('API余额数据:', balanceData);
    
    // 首先检查是否有错误信息
    if (balanceData.error || balanceData.errorMessage) {
      // 显示API错误信息
      const errorMsg = balanceData.errorMessage || 
                      (balanceData.error && balanceData.error.message) || 
                      "查询API余额失败";
                      
      balanceElement.textContent = "错误";
      balanceElement.style.color = '#e74c3c'; // 红色表示错误
      
      // 在更新时间位置显示错误消息
      if (balanceData.error && balanceData.error.code === "401 UNAUTHORIZED") {
        lastUpdatedElement.innerHTML = `<span style="color:#e74c3c">API密钥无效，请检查您的密钥</span>`;
      } else {
        lastUpdatedElement.innerHTML = `<span style="color:#e74c3c">${errorMsg}</span>`;
      }
      return;
    }
    
    // 检查不同的返回格式
    let balanceValue;
    let balanceUsed;
    
    if (balanceData.balanceTotal !== undefined) {
      // ChatAnywhere实际返回的格式
      balanceValue = balanceData.balanceTotal - balanceData.balanceUsed;
      balanceUsed = balanceData.balanceUsed;
    } else if (balanceData.code === 0 && balanceData.data && balanceData.data.balance) {
      // 之前预期的ChatAnywhere格式
      balanceValue = balanceData.data.balance;
    } else if (balanceData.object === 'account' && balanceData.balance !== undefined) {
      // 类似OpenAI的格式
      balanceValue = balanceData.balance;
    } else if (balanceData.total_amount !== undefined) {
      // 另一种可能的格式
      balanceValue = balanceData.total_amount;
    } else {
      // 无法解析
      balanceElement.textContent = '数据格式错误';
      balanceElement.style.color = '#e74c3c';
      console.error('未知的余额数据格式:', balanceData);
      return;
    }
    
    // 显示余额值（如果有已使用额度，一并显示）
    if (balanceUsed !== undefined) {
      balanceElement.textContent = `${balanceValue.toFixed(2)}/${balanceData.balanceTotal.toFixed(2)} CA币`;
    } else {
      balanceElement.textContent = `${balanceValue.toFixed(2)} CA币`;
    }
    
    // 设置余额颜色 - 根据剩余百分比而不是绝对值
    const totalBalance = balanceData.balanceTotal || balanceValue;
    const usedPercent = balanceData.balanceUsed ? (balanceData.balanceUsed / totalBalance) * 100 : 0;
    
    if (usedPercent > 80) {
      balanceElement.style.color = '#e74c3c'; // 红色，余额不足
    } else if (usedPercent > 50) {
      balanceElement.style.color = '#f39c12'; // 橙色，余额较低
    } else {
      balanceElement.style.color = '#27ae60'; // 绿色，余额充足
    }
    
    // 更新最后查询时间
    if (timestamp) {
      const date = new Date(timestamp);
      lastUpdatedElement.textContent = `最后更新: ${date.toLocaleString()}`;
    }
  } catch (error) {
    console.error('解析余额数据失败:', error);
    balanceElement.textContent = '格式错误';
    balanceElement.style.color = '#e74c3c';
    lastUpdatedElement.textContent = '解析余额数据失败';
  }
} 
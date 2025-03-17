// 导入配置
import { API_CONFIG, AI_MODELS, DEFAULT_PROMPTS, STORAGE_KEYS, CHART_CONFIG } from './config.js';

// 全局变量
let apiKey = '';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('扩展已加载');
  
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
  
  // 加载保存的设置
  loadSettings();
  
  // 添加图表分析按钮事件
  document.getElementById('analyze-chart-btn').addEventListener('click', async function() {
    console.log('分析按钮被点击');
    await captureAndAnalyzeChart();
  });
  
  console.log('所有事件监听器已设置');
});

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
    
    // 检查是否在 OKX 网站上
    if (!currentTab.url.includes('okx.com')) {
      alert('请在 OKX 网站上使用此功能');
      return;
    }
    
    // 显示加载状态
    const chartAnalysisElement = document.getElementById('chart-analysis');
    chartAnalysisElement.innerHTML = '<div class="loading">正在截取图表...</div>';
    
    // 捕获当前标签页的截图
    const screenshot = await captureVisibleTab(currentTab.id);
    
    // 显示截图预览
    document.getElementById('chart-preview').src = screenshot;
    
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
              text: promptTemplate
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
        'Authorization': `Bearer ${apiKey}`,
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
// 生成图表哈希（简单实现）
async function generateChartHash(imageData) {
  return btoa(imageData.slice(0, 50)).replace(/[^a-z0-9]/gi, '').slice(0, 16);
}

// 生成图片哈希（用于检测图表更新）
async function generateImageHash(imageData) {
  const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(imageData));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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


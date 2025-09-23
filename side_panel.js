// 导入配置
import { API_CONFIG, DEFAULT_PROMPTS, STORAGE_KEYS, CHART_CONFIG } from './config.js';

// 定义一个函数，用于通过 background script 发起 fetch 请求
async function backgroundFetch(url, options) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'fetch-request',
      payload: { url, options }
    }, response => {
      if (chrome.runtime.lastError) {
        // 处理消息发送错误
        return reject(new Error(chrome.runtime.lastError.message));
      }

      if (response.success) {
        // 重建 Response 对象
        const res = new Response(response.response.body, {
          status: response.response.status,
          statusText: response.response.statusText,
          headers: response.response.headers
        });
        resolve(res);
      } else {
        // 处理 background script 返回的 fetch 错误
        const err = new Error(response.error.message);
        err.stack = response.error.stack;
        reject(err);
      }
    });
  });
}

/**
 * 根据模型名称获取模型信息 (简化版)
 * 由于模型信息不再静态存储，此函数主要判断是否为已知可能支持图片的模型。
 * 一个更健壮的实现可能需要API本身提供模型的具体能力。
 * @param {string} modelName - 模型名称
 * @returns {{supportsImages: boolean, name: string}} - 模型信息对象
 */
function getModelInfo(modelName) {
  // 基于通用关键词猜测模型是否支持图像
  const visionKeywords = ['vision', 'vision', 'gpt-4', 'gemini', 'claude-3', 'grok', 'qwen'];
  const supportsImages = visionKeywords.some(keyword => modelName.toLowerCase().includes(keyword));
  
  return { 
    supportsImages: supportsImages, 
    name: modelName 
  };
}



// 全局变量
let apiSettings = {
  activeApiType: 'openai',
  openai: { endpoint: API_CONFIG.DEFAULT_ENDPOINT, apiKey: '' },
  gemini: { endpoint: '', apiKey: '' }
};
let loadingInterval = null; // 用于加载动画
let allAvailableModels = []; // 从端点获取的所有可用模型
let isEditingModels = false; // 是否处于模型编辑模式

// 缓存 DOM 元素
let chartAnalysisElement, chartPreviewImg, analyzeChartBtn, uploadChartContainer, 
    analyzeChartContainer, uploadChartBtn, chartFileInput, saveSettingsBtn, 
    apiKeyInput, apiEndpointInput, aiModelSelect, promptTemplateTextarea, 
    promptInfoDiv, togglePromptInfoBtn, editModelsBtn, modelsEditor, allModelsList, 
    saveSelectedModelsBtn, cancelEditModelsBtn, modelsFilterInput,
    apiTypeOpenAIRadio, apiTypeGeminiRadio, clearFilterBtn;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('侧边栏已加载');

  // 初始化 DOM 元素缓存
  chartAnalysisElement = document.getElementById('chart-analysis');
  chartPreviewImg = document.getElementById('chart-preview');
  analyzeChartBtn = document.getElementById('analyze-chart-btn');
  uploadChartContainer = document.getElementById('upload-chart-container');
  analyzeChartContainer = document.getElementById('analyze-chart-container');
  uploadChartBtn = document.getElementById('upload-chart-btn');
  chartFileInput = document.getElementById('chart-file-input');
  saveSettingsBtn = document.getElementById('save-settings');
  apiKeyInput = document.getElementById('api-key');
  apiEndpointInput = document.getElementById('api-endpoint');
  aiModelSelect = document.getElementById('ai-model');
  promptTemplateTextarea = document.getElementById('prompt-template');
  promptInfoDiv = document.getElementById('prompt-info');
  togglePromptInfoBtn = document.getElementById('toggle-prompt-info');
  editModelsBtn = document.getElementById('edit-models-btn');
  modelsEditor = document.getElementById('models-editor');
  allModelsList = document.getElementById('all-models-list');
  saveSelectedModelsBtn = document.getElementById('save-selected-models');
  cancelEditModelsBtn = document.getElementById('cancel-edit-models');
  modelsFilterInput = document.getElementById('models-filter-input');
  clearFilterBtn = document.getElementById('clear-filter-btn');
  apiTypeOpenAIRadio = document.getElementById('api-type-openai');
  apiTypeGeminiRadio = document.getElementById('api-type-gemini');
  
  // 设置事件监听器
  setupEventListeners();
  
  // 加载保存的设置
  loadSettings();
  
  // 更新按钮可见性
  updateButtonVisibility();
  
  // 添加标签切换功能
  setupTabNavigation();
  
  // 当用户切换浏览器标签页或更新URL时，主动更新按钮可见性
  chrome.tabs.onActivated.addListener(updateButtonVisibility);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 确保只在URL变化且标签页是激活状态时才更新
    if (changeInfo.url && tab.active) {
      updateButtonVisibility();
    }
  });
  
  console.log('所有事件监听器已设置');
});


// 集中设置所有事件监听器
function setupEventListeners() {
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  if (togglePromptInfoBtn) {
    togglePromptInfoBtn.addEventListener('click', function() {
      const isVisible = promptInfoDiv.style.display !== 'none';
      promptInfoDiv.style.display = isVisible ? 'none' : 'block';
      this.textContent = isVisible ? '查看默认提示词 ▼' : '隐藏默认提示词 ▲';
    });
  }
  
  analyzeChartBtn.addEventListener('click', captureAndAnalyzeChart);
  uploadChartBtn.addEventListener('click', () => chartFileInput.click());
  chartFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => analyzeUploadedChart(e.target.result);
      reader.readAsDataURL(file);
    }
  });

  // 模型编辑相关事件
  editModelsBtn.addEventListener('click', enterEditMode);
  saveSelectedModelsBtn.addEventListener('click', saveModelSelection);
  cancelEditModelsBtn.addEventListener('click', cancelEditMode);
  // API 类型切换事件
  apiTypeOpenAIRadio.addEventListener('change', handleApiTypeChange);
  apiTypeGeminiRadio.addEventListener('change', handleApiTypeChange);

  // 在切换时，临时保存当前输入
  apiKeyInput.addEventListener('input', () => {
    const currentType = document.querySelector('input[name="api-type"]:checked').value;
    apiSettings[currentType].apiKey = apiKeyInput.value;
  });
  apiEndpointInput.addEventListener('input', () => {
    const currentType = document.querySelector('input[name="api-type"]:checked').value;
    apiSettings[currentType].endpoint = apiEndpointInput.value;
  });

  // 筛选框输入和清除事件
  modelsFilterInput.addEventListener('input', () => {
    renderModelList(true);
    // 根据输入内容决定是否显示清除按钮
    clearFilterBtn.style.display = modelsFilterInput.value ? 'block' : 'none';
  });
  clearFilterBtn.addEventListener('click', () => {
    modelsFilterInput.value = '';
    renderModelList(true);
    clearFilterBtn.style.display = 'none';
  });
}

// 处理API类型切换
function handleApiTypeChange() {
  const selectedType = document.querySelector('input[name="api-type"]:checked').value;
  console.log(`API 类型切换为: ${selectedType}`);
  apiSettings.activeApiType = selectedType;
  
  // 更新输入框内容
  updateApiFields(selectedType);
  
  // 切换后立即尝试获取模型列表（如果信息完整）
  const currentConfig = apiSettings[selectedType];
  if (currentConfig.endpoint && currentConfig.apiKey) {
    handleEndpointChange(); // 触发模型更新
  } else {
    aiModelSelect.innerHTML = '<option>请完善API设置</option>';
    editModelsBtn.disabled = true;
  }
}

// 根据API类型更新UI字段
function updateApiFields(type) {
  const settings = apiSettings[type];
  apiEndpointInput.value = settings.endpoint || '';
  apiKeyInput.value = settings.apiKey || '';
}

// 处理端点输入变化
async function handleEndpointChange() {
  const currentType = apiSettings.activeApiType;
  const currentConfig = apiSettings[currentType];
  const newEndpoint = currentConfig.endpoint;

  console.log('API 端点或类型已更改，准备更新模型列表。');
  // 禁用下拉框并显示提示
  aiModelSelect.innerHTML = '<option value="">保存以刷新模型列表</option>';
  aiModelSelect.disabled = true;
  allAvailableModels = [];
  editModelsBtn.disabled = true;
}

// 进入模型编辑模式
async function enterEditMode() {
  isEditingModels = true;
  modelsEditor.style.display = 'block';
  editModelsBtn.textContent = '编辑中...';
  editModelsBtn.disabled = true;
  modelsFilterInput.value = ''; // 清空过滤器

  // 强制重新获取模型列表
  allAvailableModels = []; 
  try {
    await fetchAvailableModels();
  } catch (error) {
    alert(`获取模型列表失败: ${error.message}`);
    cancelEditMode();
    return;
  }
  
  // 渲染编辑列表
  await renderModelList(true);
}

// 取消模型编辑
function cancelEditMode() {
  isEditingModels = false;
  modelsEditor.style.display = 'none';
  editModelsBtn.textContent = '编辑';
  editModelsBtn.disabled = false;
}

// 保存模型选择
async function saveModelSelection() {
  const selected = [];
  // 注意：只从未经过滤的列表中获取所有已勾选的项
  const savedUserModels = await loadSelectedModelsForEndpoint(apiEndpointInput.value.trim());
  const filterText = modelsFilterInput.value.toLowerCase();
  
  // 1. 获取当前显示在UI上的所有复选框状态
  const currentUIState = new Map();
  allModelsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    currentUIState.set(checkbox.value, checkbox.checked);
  });

  // 2. 遍历所有可用的模型，决定最终的勾选状态
  allAvailableModels.forEach(modelId => {
    // 如果模型在当前UI上，使用UI的状态
    if (currentUIState.has(modelId)) {
      if (currentUIState.get(modelId)) {
        selected.push(modelId);
      }
    } 
    // 如果模型不在当前UI上（因为被过滤掉了），则保留其之前的勾选状态
    else if (savedUserModels.includes(modelId)) {
      selected.push(modelId);
    }
  });

  if (selected.length === 0) {
    alert('请至少选择一个模型。');
    return;
  }

  const currentEndpoint = apiEndpointInput.value.trim();
  try {
    await saveSelectedModelsForEndpoint(currentEndpoint, selected);
    alert('模型列表已保存!');
    cancelEditMode();
    // 使用新保存的模型列表重新渲染下拉框
    await renderModelList(false);
  } catch (error) {
    console.error('保存模型选择失败:', error);
    alert('保存失败，请重试。');
  }
}



/**
 * 从 API 端点获取所有可用模型
 */
async function fetchAvailableModels() {
  const currentType = apiSettings.activeApiType;
  const currentConfig = apiSettings[currentType];
  const currentEndpoint = currentConfig.endpoint.trim();
  const currentApiKey = currentConfig.apiKey.trim();

  if (!currentEndpoint || !currentApiKey) {
    throw new Error('请先设置有效的 API 端点和密钥。');
  }

  let requestUrl, fetchOptions = { headers: {} };
  
  if (currentType === 'gemini') {
    const baseUrl = (currentEndpoint.endsWith('/') ? currentEndpoint : currentEndpoint + '/') + 'models';
    requestUrl = `${baseUrl}?key=${currentApiKey}`;
    console.log('[调试日志] 检测到 Gemini API，准备获取模型 (使用 URL key)...');
  } else { // 默认为 'openai'
    requestUrl = (currentEndpoint.endsWith('/') ? currentEndpoint : currentEndpoint + '/') + 'models';
    fetchOptions.headers['Authorization'] = `Bearer ${currentApiKey}`;
    fetchOptions.headers['HTTP-Referer'] = 'https://github.com/non-existent-crypto-predictor';
    fetchOptions.headers['X-Title'] = 'Crypto Predictor';
    console.log('[调试日志] 检测到 OpenAI 兼容 API，准备获取模型...');
  }

  console.log(`[调试日志] 准备从构造的 URL 获取模型列表: ${requestUrl}`);
  startLoadingAnimation(allModelsList, '正在获取模型');

  try {
    const response = await backgroundFetch(requestUrl, fetchOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API 请求失败，状态码: ${response.status}, 响应: ${errorBody}`);
    }

    const data = await response.json();
    
    if (apiSettings.activeApiType === 'gemini') {
      allAvailableModels = data.models.map(model => model.name).sort();
    } else {
      allAvailableModels = data.data.map(model => model.id).sort();
    }
    
    console.log('获取到的所有模型:', allAvailableModels);
    
    if (allAvailableModels.length === 0) {
      throw new Error('端点未返回任何可用模型。');
    }
  } finally {
    stopLoadingAnimation();
    allModelsList.innerHTML = '';
  }
}

/**
 * 渲染模型列表 (下拉框或编辑复选框)
 * @param {boolean} isEditing - 是否为编辑模式
 */
async function renderModelList(isEditing = false) {
  const currentEndpoint = apiEndpointInput.value.trim();
  const savedUserModels = await loadSelectedModelsForEndpoint(currentEndpoint);

  if (isEditing) {
    // --- 编辑模式: 渲染复选框列表 ---
    allModelsList.innerHTML = '';
    const filterText = modelsFilterInput.value.toLowerCase();
    
    const filteredModels = allAvailableModels.filter(modelId => modelId.toLowerCase().includes(filterText));

    if (filteredModels.length === 0) {
      allModelsList.textContent = '没有匹配的模型。';
      return;
    }
    
    filteredModels.forEach(modelId => {
      const isChecked = savedUserModels.includes(modelId);
      const div = document.createElement('div');
      div.innerHTML = `
        <label>
          <input type="checkbox" value="${modelId}" ${isChecked ? 'checked' : ''}>
          ${modelId}
        </label>
      `;
      allModelsList.appendChild(div);
    });

  } else {
    // --- 普通模式: 渲染下拉选择框 ---
    aiModelSelect.disabled = false; // 重新启用下拉框
    aiModelSelect.innerHTML = '';
    const modelsToDisplay = savedUserModels.length > 0 ? savedUserModels : [];

    if (modelsToDisplay.length === 0) {
      aiModelSelect.innerHTML = '<option value="">无已选模型</option>';
      return;
    }

    modelsToDisplay.forEach(modelId => {
      const option = document.createElement('option');
      option.value = option.textContent = modelId;
      aiModelSelect.appendChild(option);
    });

    // 尝试恢复上次选择的模型
    const lastSelected = await new Promise(resolve => 
      chrome.storage.local.get(STORAGE_KEYS.AI_MODEL, result => resolve(result[STORAGE_KEYS.AI_MODEL]))
    );
    if (lastSelected && modelsToDisplay.includes(lastSelected)) {
      aiModelSelect.value = lastSelected;
    }
  }
}

/**
 * 为指定端点加载用户选择的模型列表
 * @param {string} endpoint - API 端点 URL
 * @returns {Promise<string[]>} - 模型 ID 数组
 */
function loadSelectedModelsForEndpoint(endpoint) {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEYS.ENDPOINT_MODELS, result => {
      const allEndpointModels = result[STORAGE_KEYS.ENDPOINT_MODELS] || {};
      resolve(allEndpointModels[endpoint] || []);
    });
  });
}

/**
 * 为指定端点保存用户选择的模型列表
 * @param {string} endpoint - API 端点 URL
 * @param {string[]} selectedModels - 模型 ID 数组
 */
function saveSelectedModelsForEndpoint(endpoint, selectedModels) {
  return new Promise(resolve => {
    chrome.storage.local.get(STORAGE_KEYS.ENDPOINT_MODELS, result => {
      const allEndpointModels = result[STORAGE_KEYS.ENDPOINT_MODELS] || {};
      allEndpointModels[endpoint] = selectedModels;
      chrome.storage.local.set({ [STORAGE_KEYS.ENDPOINT_MODELS]: allEndpointModels }, resolve);
    });
  });
}

// 设置标签页导航
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// 加载所有设置
function loadSettings() {
  console.log('尝试加载设置');
  
  // 请求所有新的和旧的键
  chrome.storage.local.get([
    STORAGE_KEYS.API_SETTINGS,
    STORAGE_KEYS.PROMPT_TEMPLATE,
    STORAGE_KEYS.ENDPOINT_MODELS,
    STORAGE_KEYS.AI_MODEL,
    // 旧键用于迁移
    STORAGE_KEYS.API_KEY,
    STORAGE_KEYS.API_ENDPOINT,
    STORAGE_KEYS.API_TYPE
  ], async function(result) {
    let migrated = false;

    // 1. 处理 API 设置 (包括迁移逻辑)
    if (result[STORAGE_KEYS.API_SETTINGS]) {
      apiSettings = result[STORAGE_KEYS.API_SETTINGS];
      console.log('已从 API_SETTINGS 加载配置:', apiSettings);
    } else if (result[STORAGE_KEYS.API_KEY] || result[STORAGE_KEYS.API_ENDPOINT]) {
      // 如果新结构不存在，但旧数据存在，则执行一次性迁移
      console.log('未找到新的 apiSettings 结构, 检测到旧数据，开始迁移...');
      const oldType = result[STORAGE_KEYS.API_TYPE] || 'openai';
      apiSettings.activeApiType = oldType;
      apiSettings[oldType].apiKey = result[STORAGE_KEYS.API_KEY] || '';
      apiSettings[oldType].endpoint = result[STORAGE_KEYS.API_ENDPOINT] || API_CONFIG.DEFAULT_ENDPOINT;
      migrated = true;
      console.log('迁移完成:', apiSettings);
    }

    // 2. 更新UI
    const activeType = apiSettings.activeApiType || 'openai';
    if (activeType === 'gemini') {
      apiTypeGeminiRadio.checked = true;
    } else {
      apiTypeOpenAIRadio.checked = true;
    }
    updateApiFields(activeType);
    console.log('API 类型已加载:', activeType);

    // 3. 加载其他设置
    promptTemplateTextarea.value = result[STORAGE_KEYS.PROMPT_TEMPLATE] || DEFAULT_PROMPTS.CHART_ANALYSIS;
    if(result[STORAGE_KEYS.PROMPT_TEMPLATE]) console.log('提示词模板已加载');
    
    // 4. 渲染模型列表并恢复选择
    await renderModelList(false);
    const currentConfig = apiSettings[activeType];
    editModelsBtn.disabled = !currentConfig.endpoint || !currentConfig.apiKey;
    
    if (result[STORAGE_KEYS.AI_MODEL]) {
      if ([...aiModelSelect.options].some(opt => opt.value === result[STORAGE_KEYS.AI_MODEL])) {
        aiModelSelect.value = result[STORAGE_KEYS.AI_MODEL];
        console.log('AI 模型已加载:', result[STORAGE_KEYS.AI_MODEL]);
      }
    }

    // 5. 如果发生了迁移，则保存新结构并清除旧数据
    if (migrated) {
      console.log('正在保存迁移后的设置并清除旧数据...');
      chrome.storage.local.set({ [STORAGE_KEYS.API_SETTINGS]: apiSettings }, () => {
        chrome.storage.local.remove([
          STORAGE_KEYS.API_KEY,
          STORAGE_KEYS.API_ENDPOINT,
          STORAGE_KEYS.API_TYPE
        ], () => {
          console.log('旧的 API 键已成功移除。');
        });
      });
    }
  });
}

// 保存设置
async function saveSettings() {
  console.log('保存设置');
  
  // 从UI更新当前激活的API类型的设置
  const currentType = apiSettings.activeApiType;
  apiSettings[currentType].apiKey = apiKeyInput.value.trim();
  apiSettings[currentType].endpoint = apiEndpointInput.value.trim();

  const selectedModel = aiModelSelect.value;
  const promptTemplate = promptTemplateTextarea.value.trim() || DEFAULT_PROMPTS.CHART_ANALYSIS;

  const endpointChanged = apiSettings[currentType].endpoint !== (apiSettings[currentType]._savedEndpoint || '');
  const apiTypeChanged = currentType !== (apiSettings._savedActiveApiType || '');

  const settingsObj = {
    [STORAGE_KEYS.API_SETTINGS]: apiSettings,
    [STORAGE_KEYS.AI_MODEL]: selectedModel,
    [STORAGE_KEYS.PROMPT_TEMPLATE]: promptTemplate,
  };
  
  await new Promise(resolve => chrome.storage.local.set(settingsObj, resolve));
  console.log('设置已保存到 chrome.storage');
  
  // 更新内部状态以备下次比较
  apiSettings[currentType]._savedEndpoint = apiSettings[currentType].endpoint;
  apiSettings._savedActiveApiType = currentType;
  
  if (endpointChanged || apiTypeChanged) {
    console.log('端点或 API 类型已更改，将刷新模型列表。');
    allAvailableModels = [];
    try {
      await fetchAvailableModels();
      await renderModelList(false);
    } catch (error) {
      alert(`为新设置获取模型列表失败: ${error.message}`);
      aiModelSelect.innerHTML = '<option>获取模型失败</option>';
    }
  }
  
  const currentConfig = apiSettings[currentType];
  editModelsBtn.disabled = !currentConfig.endpoint || !currentConfig.apiKey;

  const originalText = saveSettingsBtn.textContent;
  saveSettingsBtn.textContent = '✓ 设置已保存';
  saveSettingsBtn.style.backgroundColor = '#28a745';
  setTimeout(() => {
    saveSettingsBtn.textContent = originalText;
    saveSettingsBtn.style.backgroundColor = '';
  }, 3000);
}


// 停止加载动画
function stopLoadingAnimation() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
}

// 启动加载动画
function startLoadingAnimation(element, text = '正在分析图表') {
  stopLoadingAnimation(); // 先停止任何可能正在运行的动画
  let dots = 1;
  
  // 立即显示初始状态
  element.innerHTML = `<div class="loading">${text}...</div>`;
  
  loadingInterval = setInterval(() => {
    dots = (dots % 3) + 1; // 循环 1, 2, 3
    let dotString = '.'.repeat(dots);
    element.innerHTML = `<div class="loading">${text}${dotString}</div>`;
  }, 500); // 每半秒更新一次
}

// 根据当前 URL 更新按钮可见性
async function updateButtonVisibility() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  const url = currentTab.url;

  // 检查URL是否有效且包含协议
  const isSupported = url && (url.includes('okx.com') || url.includes('tradingview.com') || url.includes('gate.com') || url.includes('binance.com'));

  if (isSupported) {
    analyzeChartContainer.style.display = 'block';
    uploadChartContainer.style.display = 'none';
  } else {
    analyzeChartContainer.style.display = 'none';
    uploadChartContainer.style.display = 'block';
  }
}

// 分析上传的图表
async function analyzeUploadedChart(imageDataUrl) {
  console.log('开始分析上传的图表');
  try {
    const currentConfig = apiSettings[apiSettings.activeApiType];
    if (!currentConfig.apiKey) {
      showApiKeyGuide();
      return;
    }

    startLoadingAnimation(chartAnalysisElement);

    chartPreviewImg.src = imageDataUrl;
    chartPreviewImg.style.display = 'inline';

    const analysis = await analyzeChartWithAI(imageDataUrl);

    stopLoadingAnimation();
    console.log('显示分析结果');
    chartAnalysisElement.innerHTML = `<div style="white-space: pre-line;">${analysis}</div>`;


  } catch (error) {
    stopLoadingAnimation();
    console.error('图表分析失败:', error);
    chartAnalysisElement.innerHTML = `<div style="color: red;">分析失败: ${error.message}</div>`;
  }
}

// 显示 API 密钥获取指南
function showApiKeyGuide() {
  console.log('显示 API 密钥获取指南');
  chartAnalysisElement.innerHTML = `
    <div style="padding: 10px; background-color: #f8f9fa; border-radius: 4px; border-left: 3px solid #4a90e2;">
      <h3>如何获取 API 密钥</h3>
      <p>您可以使用支持 OpenAI 协议格式的 API 服务，例如：</p>
      <ul style="padding-left: 20px;">
        <li><a href="https://github.com/chatanywhere/GPT_API_free" target="_blank">ChatAnywhere</a> (免费额度有限)</li>
        <li><a href="https://platform.openai.com/" target="_blank">OpenAI</a> (付费)</li>
      </ul>
      <ol style="padding-left: 20px;">
        <li>访问 API 服务提供商网站，注册并获取 API 密钥</li>
        <li>将端点 URL 填入“API 端点 URL”字段 (例如: https://api.openai.com/v1/chat/completions)</li>
        <li>将 API 密钥填入“API 密钥”字段</li>
        <li>点击保存设置</li>
      </ol>
      <p>确保端点支持多模态 (vision) 模型以进行图像分析。</p>
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
    const currentConfig = apiSettings[apiSettings.activeApiType];
    if (!currentConfig.apiKey) {
      showApiKeyGuide();
      return;
    }
    
    // 获取当前标签页
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    console.log('当前标签页URL:', currentTab.url);
    
    // 显示加载状态
    startLoadingAnimation(chartAnalysisElement, '正在截取图表');
    
    // 捕获当前标签页的截图
    const screenshot = await captureVisibleTab(currentTab.id);
    
    // 显示截图预览
    chartPreviewImg.src = screenshot;
    chartPreviewImg.style.display = 'inline'; // 显示图片
    
    // 更新加载状态并启动动画
    startLoadingAnimation(chartAnalysisElement);
    
    // 使用 API 分析
    const analysis = await analyzeChartWithAI(screenshot);
    
    // 停止动画并显示结果
    stopLoadingAnimation();
    console.log('显示分析结果');
    chartAnalysisElement.innerHTML = `<div style="white-space: pre-line;">${analysis}</div>`;
    

    
  } catch (error) {
    stopLoadingAnimation(); // 确保在出错时也停止动画
    console.error('图表分析失败:', error);
    chartAnalysisElement.innerHTML = `<div style="color: red;">分析失败: ${error.message}</div>`;
  }
}

// 捕获标签页截图 (通过后台脚本)
function captureVisibleTab() {
  console.log('向后台脚本发送截图请求');
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'capture-tab' }, response => {
      if (chrome.runtime.lastError) {
        console.error('发送截图请求失败:', chrome.runtime.lastError);
        return reject(chrome.runtime.lastError);
      }
      if (response.success) {
        resolve(response.dataUrl);
      } else {
        console.error('后台截图失败:', response.error);
        // 重建 Error 对象以保留堆栈信息
        const err = new Error(response.error.message);
        err.stack = response.error.stack;
        reject(err);
      }
    });
  });
}

// 使用 API 分析图表 (通过后台脚本代理)
async function analyzeChartWithAI(imageDataUrl) {
  console.log('--- 开始 AI 图表分析 ---');
  
  const currentType = apiSettings.activeApiType;
  const currentConfig = apiSettings[currentType];

  if (!currentConfig.apiKey) throw new Error('请先设置 API 密钥');

  try {
    const { selectedModel, promptTemplate } = await new Promise(resolve => {
      chrome.storage.local.get(
        [STORAGE_KEYS.AI_MODEL, STORAGE_KEYS.PROMPT_TEMPLATE],
        result => resolve({
          selectedModel: result[STORAGE_KEYS.AI_MODEL],
          promptTemplate: result[STORAGE_KEYS.PROMPT_TEMPLATE] || DEFAULT_PROMPTS.CHART_ANALYSIS
        })
      );
    });

    if (!selectedModel) throw new Error("未选择任何AI模型。");

    const modelInfo = getModelInfo(selectedModel);
    if (!modelInfo.supportsImages) {
      const errorMsg = `当前模型 (${selectedModel}) 不支持图像分析，请在设置中选择其他模型。`;
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    const enhancedPrompt = `这是一个加密货币交易图表。${promptTemplate}`;
    const compressedImage = await compressImage(imageDataUrl, CHART_CONFIG.MAX_IMAGE_WIDTH);
    
    let requestUrl, requestBody, fetchOptions = { method: 'POST', headers: {}, body: '' };

    if (currentType === 'gemini') {
      console.log('[调试日志] 检测到 Gemini API，构建原生请求...');
      requestUrl = `${currentConfig.endpoint.endsWith('/') ? currentConfig.endpoint : currentConfig.endpoint + '/'}${selectedModel}:streamGenerateContent`;
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.headers['x-goog-api-key'] = currentConfig.apiKey;
      requestBody = {
        contents: [{
          parts: [
            { text: enhancedPrompt },
            { inline_data: { mime_type: "image/jpeg", data: compressedImage.split(',')[1] } }
          ]
        }]
      };
    } else {
      console.log('[调试日志] 检测到 OpenAI 兼容 API，构建请求...');
      requestUrl = (currentConfig.endpoint.endsWith('/') ? currentConfig.endpoint : currentConfig.endpoint + '/') + 'chat/completions';
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.headers['Authorization'] = `Bearer ${currentConfig.apiKey}`;
      fetchOptions.headers['HTTP-Referer'] = 'https://github.com/non-existent-crypto-predictor';
      fetchOptions.headers['X-Title'] = 'Crypto Predictor';
      requestBody = {
        model: selectedModel,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: enhancedPrompt },
            { type: "image_url", image_url: { url: compressedImage } }
          ]
        }],
        max_tokens: CHART_CONFIG.MAX_TOKENS,
        stream: true
      };
    }
    fetchOptions.body = JSON.stringify(requestBody);

    console.log(`[调试日志] 准备向构造的 URL 发送分析请求: ${requestUrl}`);
    
    const response = await backgroundFetch(requestUrl, fetchOptions);

    console.log(`--- API 响应状态码 (Status Code): ${response.status} ---`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 请求失败:', errorText);
      throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
    }

    const responseBodyText = await response.text();
    let fullContent = '';

    if (currentType === 'gemini') {
      try {
        const geminiStreamResult = JSON.parse(responseBodyText);
        geminiStreamResult.forEach(chunk => {
          if (chunk.candidates && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
            fullContent += chunk.candidates[0].content.parts[0].text;
          }
        });
      } catch (e) {
        console.error("解析 Gemini 响应失败:", e, responseBodyText);
        throw new Error("解析 Gemini 响应失败。");
      }
    } else {
      const lines = responseBodyText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              fullContent += parsed.choices[0].delta.content;
            }
          } catch (e) {
            console.warn('解析流中的 JSON 失败 (忽略):', jsonStr, e);
          }
        }
      }
    }
    
    if (fullContent.trim() === "") throw new Error('API 分析成功，但未返回任何内容。');

    console.log('--- 分析成功，获取到完整内容 ---');
    return fullContent;

  } catch (error) {
    console.error('--- 在 AI 分析过程中捕获到错误: ---', error);
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


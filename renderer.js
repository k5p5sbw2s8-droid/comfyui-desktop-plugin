const state = {
  schema: null,
  templates: null,
  abilities: null,
  capabilities: null,
  currentTask: null,
  queue: [],
  lastPromptId: null,
  outputDir: null,
  checkpoints: [],
  connection: {
    connected: false,
    message: '未连接'
  },
  pollingId: null
};

const hostInput = document.getElementById('host');
const portInput = document.getElementById('port');
const connectBtn = document.getElementById('connect');
const disconnectBtn = document.getElementById('disconnect');
const taskTypeSelect = document.getElementById('taskType');
const formContainer = document.getElementById('form');
const runBtn = document.getElementById('run');
const queueContainer = document.getElementById('queue');
const logOutput = document.getElementById('log');
const resultsContainer = document.getElementById('results');
const openOutputBtn = document.getElementById('open-output');
const abilitiesList = document.getElementById('abilities');
const interruptBtn = document.getElementById('interrupt');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const tasks = {
  txt2img: { label: '文生图 (txt2img)' },
  img2video: { label: '图生视频 (img2video)' }
};

const formatTimestamp = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

const log = (level, message) => {
  const label = level.padEnd(5, ' ');
  logOutput.textContent += `[${formatTimestamp()}] ${label} ${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
};

const getConnection = () => ({
  host: hostInput.value.trim(),
  port: portInput.value.trim()
});

const renderAbilities = () => {
  abilitiesList.innerHTML = '';
  Object.entries(state.abilities || {}).forEach(([key, ability]) => {
    const li = document.createElement('li');
    li.textContent = `${ability.label} (${key}) · 节点: ${ability.nodes.join(', ')}`;
    abilitiesList.appendChild(li);
  });
};

const renderTaskOptions = () => {
  taskTypeSelect.innerHTML = '';
  Object.entries(tasks).forEach(([key, task]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = task.label;
    taskTypeSelect.appendChild(option);
  });
  taskTypeSelect.value = 'txt2img';
  state.currentTask = 'txt2img';
};

const createField = (label, input) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';
  const span = document.createElement('span');
  span.textContent = label;
  wrapper.appendChild(span);
  wrapper.appendChild(input);
  return wrapper;
};

const createTextArea = (name, placeholder = '') => {
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.placeholder = placeholder;
  textarea.rows = 3;
  return textarea;
};

const createInput = (name, type, value = '') => {
  const input = document.createElement('input');
  input.name = name;
  input.dataset.type = type;
  input.type = type === 'number' ? 'number' : type;
  if (type === 'checkbox') {
    input.checked = Boolean(value);
  } else {
    input.value = value;
  }
  return input;
};

const createSelect = (name, options, value = '', allowEmpty = false) => {
  const select = document.createElement('select');
  select.name = name;
  if (allowEmpty && options.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '-- 无可用项 --';
    select.appendChild(option);
  }
  options.forEach((optionValue) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    select.appendChild(option);
  });
  if (value) select.value = value;
  return select;
};

const renderTxt2ImgForm = () => {
  formContainer.innerHTML = '';

  const promptArea = createTextArea('prompt', '请输入正向提示词');
  formContainer.appendChild(createField('Prompt', promptArea));

  const negativeArea = createTextArea('negative_prompt', '请输入负向提示词');
  formContainer.appendChild(createField('Negative Prompt', negativeArea));

  const checkpointSelect = createSelect(
    'checkpoint',
    state.checkpoints,
    state.checkpoints[0] || '',
    true
  );
  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'secondary';
  refreshBtn.textContent = '刷新模型列表';
  refreshBtn.addEventListener('click', refreshModels);
  const checkpointWrapper = document.createElement('div');
  checkpointWrapper.className = 'inline';
  checkpointWrapper.appendChild(checkpointSelect);
  checkpointWrapper.appendChild(refreshBtn);
  formContainer.appendChild(createField('Checkpoint', checkpointWrapper));

  const seedInput = createInput('seed', 'number', '0');
  const seedBtn = document.createElement('button');
  seedBtn.type = 'button';
  seedBtn.className = 'secondary';
  seedBtn.textContent = '随机';
  seedBtn.addEventListener('click', () => {
    seedInput.value = Math.floor(Math.random() * 1000000000);
  });
  const seedWrapper = document.createElement('div');
  seedWrapper.className = 'inline';
  seedWrapper.appendChild(seedInput);
  seedWrapper.appendChild(seedBtn);
  formContainer.appendChild(createField('Seed', seedWrapper));

  formContainer.appendChild(createField('Steps', createInput('steps', 'number', '20')));
  formContainer.appendChild(createField('CFG', createInput('cfg', 'number', '7')));
  formContainer.appendChild(createField('Width', createInput('width', 'number', '512')));
  formContainer.appendChild(createField('Height', createInput('height', 'number', '768')));
  formContainer.appendChild(createField('Batch', createInput('batch', 'number', '1')));

  const referenceBox = document.createElement('div');
  referenceBox.className = 'reference-box';
  const referenceToggle = createInput('reference_enabled', 'checkbox', false);
  const referenceToggleWrapper = document.createElement('label');
  referenceToggleWrapper.className = 'inline';
  referenceToggleWrapper.append('启用参考图', referenceToggle);

  const referenceMode = createSelect('reference_mode', ['IPAdapter', 'ControlNet', 'ReferenceOnly'], 'IPAdapter');
  const referenceStrength = createInput('reference_weight', 'number', '0.8');
  referenceStrength.step = '0.1';
  const referenceFile = createInput('reference_file', 'file', '');
  const ipAdapterModel = createInput('ip_adapter_model', 'text', '');
  ipAdapterModel.placeholder = 'IP-Adapter 模型名';

  referenceBox.appendChild(referenceToggleWrapper);
  referenceBox.appendChild(createField('模式', referenceMode));
  referenceBox.appendChild(createField('参考强度', referenceStrength));
  referenceBox.appendChild(createField('参考图文件', referenceFile));
  referenceBox.appendChild(createField('IP-Adapter 模型', ipAdapterModel));

  const referenceInfo = document.createElement('div');
  referenceInfo.className = 'hint';
  referenceInfo.id = 'reference-info';
  referenceBox.appendChild(referenceInfo);

  formContainer.appendChild(referenceBox);
  updateReferenceAvailability();
};

const renderImg2VideoForm = () => {
  formContainer.innerHTML = '';
  const info = document.createElement('div');
  info.className = 'hint';
  info.textContent = '图生视频功能将在 v0.2 实现。当前用于能力检测与提示。';
  formContainer.appendChild(info);

  const capability = document.createElement('div');
  capability.className = 'hint';
  const videoCapability = state.capabilities?.video_i2v ? '✔ 已检测到视频节点' : '✘ 未检测到视频节点';
  capability.textContent = `${videoCapability}。请安装对应自定义节点后再试。`;
  formContainer.appendChild(capability);
};

const renderForm = () => {
  if (state.currentTask === 'txt2img') {
    renderTxt2ImgForm();
  } else {
    renderImg2VideoForm();
  }
};

const collectFormValues = () => {
  const fields = formContainer.querySelectorAll('input');
  const values = {};
  fields.forEach((input) => {
    const type = input.dataset.type;
    if (type === 'checkbox') {
      values[input.name] = input.checked;
    } else if (type === 'number') {
      values[input.name] = input.value === '' ? null : Number(input.value);
    } else if (type === 'file') {
      values[input.name] = input.files?.[0] || null;
    } else {
      values[input.name] = input.value;
    }
  });
  const textareas = formContainer.querySelectorAll('textarea');
  textareas.forEach((textarea) => {
    values[textarea.name] = textarea.value;
  });
  const selects = formContainer.querySelectorAll('select');
  selects.forEach((select) => {
    values[select.name] = select.value;
  });
  return values;
};

const resolveOutputPrefix = (task, values) => {
  const prefix = values.output_prefix || `outputs/${task}/${Date.now()}`;
  return prefix
    .replace('${task}', task)
    .replace('${timestamp}', Date.now().toString());
};

const renderTemplate = (template, values) => {
  const walk = (node) => {
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (node && typeof node === 'object') {
      const result = {};
      Object.entries(node).forEach(([key, val]) => {
        result[key] = walk(val);
      });
      return result;
    }
    if (typeof node === 'string') {
      const match = node.match(/^\$\{(.+)}$/);
      if (match) {
        const key = match[1];
        return values[key] ?? node;
      }
      return node.replace(/\$\{(.+?)}/g, (_, key) => values[key] ?? '');
    }
    return node;
  };
  return walk(template);
};

const updateQueue = () => {
  queueContainer.innerHTML = '';
  state.queue.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'queue-item';
    div.textContent = `#${item.id || 'pending'} · ${item.task} · ${item.status}`;
    queueContainer.appendChild(div);
  });
};

const extractImages = (history) => {
  const entry = Object.values(history || {})[0];
  if (!entry?.outputs) return [];
  const images = [];
  Object.values(entry.outputs).forEach((output) => {
    (output.images || []).forEach((image) => images.push(image));
  });
  return images;
};

const showResults = (history, host, port) => {
  resultsContainer.innerHTML = '';
  const images = extractImages(history);
  if (images.length > 0) {
    const grid = document.createElement('div');
    grid.className = 'image-grid';
    images.forEach((image) => {
      const img = document.createElement('img');
      const params = new URLSearchParams({
        filename: image.filename,
        subfolder: image.subfolder || '',
        type: image.type || 'output'
      });
      const url = `http://${host}:${port}/view?${params.toString()}`;
      img.src = url;
      img.alt = image.filename;
      img.addEventListener('click', () => window.open(url));
      grid.appendChild(img);
    });
    resultsContainer.appendChild(grid);
  }
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(history, null, 2);
  resultsContainer.appendChild(pre);
};

const setStatus = (connected, message) => {
  state.connection.connected = connected;
  state.connection.message = message;
  statusDot.className = `dot ${connected ? 'connected' : 'disconnected'}`;
  statusText.textContent = message;
};

const updateReferenceAvailability = () => {
  const info = document.getElementById('reference-info');
  if (!info) return;
  const toggle = formContainer.querySelector('input[name="reference_enabled"]');
  const mode = formContainer.querySelector('select[name="reference_mode"]');
  const strength = formContainer.querySelector('input[name="reference_weight"]');
  const fileInput = formContainer.querySelector('input[name="reference_file"]');
  const modelInput = formContainer.querySelector('input[name="ip_adapter_model"]');

  const ipAdapterReady = Boolean(state.capabilities?.ipadapter);
  if (!ipAdapterReady) {
    info.textContent = '未检测到 IP-Adapter 节点，参考图功能将被禁用。';
  } else {
    info.textContent = '已检测到 IP-Adapter 节点，可启用参考图。';
  }

  [toggle, mode, strength, fileInput, modelInput].forEach((el) => {
    if (el) el.disabled = !ipAdapterReady;
  });
};

const updateQueueStatus = (queueInfo) => {
  if (!queueInfo) return;
  const remaining =
    queueInfo?.queue_remaining ??
    queueInfo?.queue_pending?.length ??
    queueInfo?.queue_running?.length ??
    0;
  log('INFO', `Queue status: remaining=${remaining}`);
};

const startQueuePolling = () => {
  if (state.pollingId) clearInterval(state.pollingId);
  state.pollingId = setInterval(async () => {
    if (!state.connection.connected) return;
    const { host, port } = getConnection();
    const response = await window.comfyui.queueStatus({ host, port });
    if (response.ok) {
      updateQueueStatus(response.data);
    } else {
      log('ERROR', `Queue status failed: HTTP ${response.status}`);
    }
  }, 5000);
};

const refreshModels = async () => {
  const { host, port } = getConnection();
  log('INFO', 'Fetching models...');
  const response = await window.comfyui.objectInfo({ host, port });
  if (!response.ok) {
    log('ERROR', `Models fetch failed: HTTP ${response.status} ${JSON.stringify(response.data)}`);
    return;
  }
  const checkpoints =
    response.data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];
  state.checkpoints = checkpoints;
  log('OK', `Models loaded: ${checkpoints.length} checkpoints`);
  renderForm();
};

const connectWs = async () => {
  const { host, port } = getConnection();
  const response = await window.comfyui.connectWs({ host, port });
  log('INFO', `WebSocket: ${response.status}`);
};

connectBtn.addEventListener('click', async () => {
  const { host, port } = getConnection();
  log('INFO', `Connecting to http://${host}:${port} ...`);
  setStatus(false, '连接中...');

  const health = await window.comfyui.health({ host, port });
  if (!health.ok) {
    const reason = health.error || JSON.stringify(health.data || {});
    log('ERROR', `Connect failed: HTTP ${health.status} ${reason}`);
    setStatus(false, `连接失败：${reason}`);
    return;
  }

  log('OK', `Connected (health: ${health.endpoint})`);
  setStatus(true, `已连接 ComfyUI http://${host}:${port}`);

  await connectWs();
  await refreshModels();

  const objectInfo = await window.comfyui.objectInfo({ host, port });
  if (objectInfo.ok) {
    const nodes = Object.keys(objectInfo.data || {});
    state.capabilities = {
      ipadapter: nodes.includes('IPAdapterApply'),
      controlnet: nodes.includes('ControlNetLoader'),
      video_i2v: nodes.includes('ImageToVideo')
    };
    updateReferenceAvailability();
    log(
      'OK',
      `Capabilities: IPAdapter=${state.capabilities.ipadapter ? '✔' : '✘'} · ControlNet=${
        state.capabilities.controlnet ? '✔' : '✘'
      } · Video=${state.capabilities.video_i2v ? '✔' : '✘'}`
    );
  } else {
    log('ERROR', `Capability scan failed: HTTP ${objectInfo.status} ${JSON.stringify(objectInfo.data)}`);
  }

  startQueuePolling();
});

disconnectBtn.addEventListener('click', async () => {
  const response = await window.comfyui.disconnectWs();
  setStatus(false, '未连接');
  state.capabilities = null;
  state.checkpoints = [];
  abilitiesList.innerHTML = '';
  if (state.pollingId) {
    clearInterval(state.pollingId);
    state.pollingId = null;
  }
  renderForm();
  updateReferenceAvailability();
  log('INFO', `WebSocket: ${response.status}`);
});

taskTypeSelect.addEventListener('change', () => {
  state.currentTask = taskTypeSelect.value;
  renderForm();
});

runBtn.addEventListener('click', async () => {
  const values = collectFormValues();
  const task = state.currentTask;
  if (task === 'img2video') {
    log('ERROR', 'img2video 尚未实现，请等待 v0.2。');
    return;
  }
  if (!state.connection.connected) {
    log('ERROR', '未连接，禁止提交任务。');
    return;
  }
  if (!values.prompt) {
    log('ERROR', 'Prompt 不能为空。');
    return;
  }
  if (!values.checkpoint) {
    log('ERROR', '未选择 Checkpoint 模型。');
    return;
  }
  if (values.reference_enabled && values.reference_mode !== 'IPAdapter') {
    log('ERROR', `参考图模式 ${values.reference_mode} 尚未实现，请选择 IPAdapter。`);
    return;
  }

  const templateKey = values.reference_enabled && state.capabilities?.ipadapter ? 'reference-image' : 'txt2img';
  const template = state.templates[templateKey];
  if (!template) {
    log('ERROR', `未找到模板: ${templateKey}`);
    return;
  }

  const output_prefix = resolveOutputPrefix(task, values);
  const params = { ...values, output_prefix, sampler: values.sampler || 'euler' };

  if (values.reference_enabled && values.reference_file) {
    const { host, port } = getConnection();
    const upload = await window.comfyui.uploadImage({
      host,
      port,
      filePath: values.reference_file.path
    });
    if (upload.ok) {
      params.image_path = upload.data.name;
    } else {
      log('ERROR', `Reference upload failed: HTTP ${upload.status}`);
      return;
    }
  }

  const prompt = renderTemplate(template.nodes, params);
  state.outputDir = output_prefix.split('/').slice(0, -1).join('/');

  const { host, port } = getConnection();
  log('INFO', `Submitting workflow: ${templateKey}`);
  const response = await window.comfyui.queuePrompt({ host, port, prompt });
  if (!response.ok) {
    log('ERROR', `Submit failed: HTTP ${response.status} ${JSON.stringify(response.data)}`);
    return;
  }

  state.lastPromptId = response.data.prompt_id;
  state.queue.unshift({ id: response.data.prompt_id, task, status: 'queued' });
  updateQueue();
  log('OK', `Queued: prompt_id=${response.data.prompt_id}`);
});

interruptBtn.addEventListener('click', async () => {
  const { host, port } = getConnection();
  const response = await window.comfyui.interrupt({ host, port });
  if (!response.ok) {
    log('ERROR', `Interrupt failed: HTTP ${response.status}`);
    return;
  }
  log('OK', 'Interrupt sent');
});

openOutputBtn.addEventListener('click', async () => {
  await window.comfyui.openOutput(state.outputDir || '');
});

window.comfyui.onWsMessage((message) => {
  log('INFO', `WS: ${message}`);
  try {
    const payload = JSON.parse(message);
    if (payload.type === 'executed' && payload.data?.prompt_id) {
      const promptId = payload.data.prompt_id;
      const item = state.queue.find((entry) => entry.id === promptId);
      if (item) {
        item.status = 'completed';
        updateQueue();
      }
      const { host, port } = getConnection();
      window.comfyui.history({ host, port, promptId }).then((history) => {
        if (history.ok) {
          showResults(history.data, host, port);
          log('OK', 'Finished: outputs=1');
        } else {
          log('ERROR', `History failed: HTTP ${history.status}`);
        }
      });
    }
    if (payload.type === 'status' && payload.data?.exec_info) {
      updateQueueStatus(payload.data.exec_info);
    }
    if (payload.type === 'executing') {
      log('INFO', 'Execution start');
    }
    if (payload.type === 'progress' && payload.data?.value != null) {
      const pct = Math.round(payload.data.value * 100);
      log('INFO', `Progress: ${pct}%`);
    }
  } catch (error) {
    log('ERROR', `WS parse error: ${error.message}`);
  }
});

const init = async () => {
  const config = await window.comfyui.loadConfig();
  state.schema = config.schema;
  state.templates = config.templates;
  state.abilities = config.abilities;
  renderTaskOptions();
  renderForm();
  renderAbilities();
  setStatus(false, '未连接');
};

init();

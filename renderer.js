const state = {
  schema: null,
  templates: null,
  abilities: null,
  currentTask: null,
  queue: [],
  lastPromptId: null,
  outputDir: null
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

const log = (message) => {
  logOutput.textContent += `${message}\n`;
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
  Object.entries(state.schema || {}).forEach(([key, task]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = task.label;
    taskTypeSelect.appendChild(option);
  });
  state.currentTask = taskTypeSelect.value;
};

const createField = (name, config) => {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';
  const span = document.createElement('span');
  span.textContent = name;
  const input = document.createElement(config.type === 'boolean' ? 'input' : 'input');
  input.name = name;
  input.dataset.type = config.type;
  if (config.type === 'boolean') {
    input.type = 'checkbox';
    input.checked = Boolean(config.default);
  } else if (config.type === 'number') {
    input.type = 'number';
    input.value = config.default ?? '';
  } else {
    input.type = 'text';
    input.value = config.default ?? '';
  }
  wrapper.appendChild(span);
  wrapper.appendChild(input);
  return wrapper;
};

const renderForm = () => {
  formContainer.innerHTML = '';
  const taskConfig = state.schema[state.currentTask];
  if (!taskConfig) return;
  Object.entries(taskConfig.fields).forEach(([name, config]) => {
    formContainer.appendChild(createField(name, config));
  });
};

const collectFormValues = () => {
  const fields = formContainer.querySelectorAll('input');
  const values = {};
  fields.forEach((input) => {
    const type = input.dataset.type;
    if (type === 'boolean') {
      values[input.name] = input.checked;
    } else if (type === 'number') {
      values[input.name] = input.value === '' ? null : Number(input.value);
    } else {
      values[input.name] = input.value;
    }
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

const showResults = (history) => {
  resultsContainer.innerHTML = '';
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(history, null, 2);
  resultsContainer.appendChild(pre);
};

const connectWs = async () => {
  const { host, port } = getConnection();
  const response = await window.comfyui.connectWs({ host, port });
  log(`WebSocket: ${response.status}`);
};

connectBtn.addEventListener('click', connectWs);

disconnectBtn.addEventListener('click', async () => {
  const response = await window.comfyui.disconnectWs();
  log(`WebSocket: ${response.status}`);
});

taskTypeSelect.addEventListener('change', () => {
  state.currentTask = taskTypeSelect.value;
  renderForm();
});

runBtn.addEventListener('click', async () => {
  const values = collectFormValues();
  const task = state.currentTask;
  const template = state.templates[task];
  if (!template) {
    log(`未找到模板: ${task}`);
    return;
  }

  const output_prefix = resolveOutputPrefix(task, values);
  const params = { ...values, output_prefix };
  const prompt = renderTemplate(template.nodes, params);
  state.outputDir = output_prefix.split('/').slice(0, -1).join('/');

  const { host, port } = getConnection();
  log(`提交任务: ${task}`);
  const response = await window.comfyui.queuePrompt({ host, port, prompt });

  state.lastPromptId = response.prompt_id;
  state.queue.unshift({ id: response.prompt_id, task, status: 'queued' });
  updateQueue();
  log(`队列响应: ${JSON.stringify(response)}`);
});

interruptBtn.addEventListener('click', async () => {
  const { host, port } = getConnection();
  const response = await window.comfyui.interrupt({ host, port });
  log(`中断响应: ${JSON.stringify(response)}`);
});

openOutputBtn.addEventListener('click', async () => {
  await window.comfyui.openOutput(state.outputDir || '');
});

window.comfyui.onWsMessage((message) => {
  log(`WS: ${message}`);
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
        showResults(history);
      });
    }
    if (payload.type === 'status' && payload.data?.exec_info) {
      const running = payload.data.exec_info.queue_remaining === 0 ? 'idle' : 'running';
      log(`状态: ${running}`);
    }
  } catch (error) {
    log(`WS parse error: ${error.message}`);
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
};

init();

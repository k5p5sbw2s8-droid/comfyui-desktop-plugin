const fs = require('fs');
const path = require('path');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const schemaPath = path.join(__dirname, '..', 'configs', 'parameters.schema.json');
const workflowDir = path.join(__dirname, '..', 'configs', 'workflows');

const schema = readJson(schemaPath);
let success = true;

const placeholders = new Set();
Object.values(schema).forEach((task) => {
  Object.keys(task.fields).forEach((field) => placeholders.add(field));
});

const templates = fs.readdirSync(workflowDir).filter((file) => file.endsWith('.json'));

const missing = [];

templates.forEach((file) => {
  const template = readJson(path.join(workflowDir, file));
  const content = JSON.stringify(template);
  const matches = content.match(/\$\{(.*?)}/g) || [];
  matches.forEach((match) => {
    const key = match.replace('${', '').replace('}', '');
    if (!placeholders.has(key)) {
      missing.push({ file, key });
      success = false;
    }
  });
});

if (!success) {
  console.error('Missing placeholders in schema:', missing);
  process.exit(1);
}

console.log('Config validation passed.');

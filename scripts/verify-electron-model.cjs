const { app, utilityProcess } = require('electron');
const path = require('node:path');
const assert = require('node:assert/strict');
app.whenReady().then(async () => {
  const { EmbeddedModelService } = await import('../desktop/model-service.mjs');
  const { MODEL_FILENAME } = await import('../desktop/model-config.mjs');
  const model = new EmbeddedModelService({
    modelPath: path.join(__dirname, '../public/models/zeroapply', MODEL_FILENAME),
    spawnProcess: () => utilityProcess.fork(path.join(__dirname, '../desktop/model-runtime.cjs'), [], { serviceName: 'ZeroApply model verification' }),
  });
  try {
    assert.equal(model.child, null);
    await model.start();
    const answer = await model.generate({ prompt: 'What is my city? Return just the city.', systemPrompt: 'My city is Hyderabad.', maxTokens: 16 });
    assert.match(answer, /Hyderabad/i);
    console.log('Electron utility-process inference passed.');
    model.stop();
    app.exit(0);
  } catch (error) {
    model.stop();
    console.error(error);
    app.exit(1);
  }
});

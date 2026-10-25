const png=await app.evaluate(async({webContents})=>{const w=webContents.getAllWebContents().find(w=>w.getType()==='webview');return (await w.capturePage()).toPNG().toString('base64')});
fs.writeFileSync('output/live-check/current.png',Buffer.from(png,'base64'));return 'Captured';

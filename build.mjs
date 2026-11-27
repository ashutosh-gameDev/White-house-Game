import {cp,mkdir,copyFile,readdir,readFile,writeFile} from 'node:fs/promises';

await cp('public','dist',{recursive:true});
await mkdir('dist/vendor',{recursive:true});
for(const [source,name] of [
 ['three/build/three.module.js','three.module.js'],
 ['three/build/three.core.js','three.core.js'],
 ['@dimforge/rapier3d-compat/rapier.mjs','rapier.mjs']
]){
 await copyFile('node_modules/'+source,'dist/vendor/'+name);
}

const measurementId=process.env.GA_MEASUREMENT_ID?.trim() || (process.env.VERCEL_ENV==='production' ? 'G-9K19GYN6JZ' : '');
if(measurementId&&process.env.VERCEL_ENV!=='preview'){
 if(!/^G-[A-Z0-9]+$/.test(measurementId)){
  throw Error('GA_MEASUREMENT_ID must be a Google Analytics web measurement ID.');
 }
 const tag=[
  '<script async src="https://www.googletagmanager.com/gtag/js?id='+measurementId+'"></script>',
  '<script>',
  'window.dataLayer = window.dataLayer || [];',
  'function gtag(){window.dataLayer.push(arguments);}',
  "gtag('js', new Date());",
  "gtag('config', '"+measurementId+"', {allow_google_signals:false, allow_ad_personalization_signals:false});",
  '</script>'
 ].join('\n');
 const pages=(await readdir('dist',{recursive:true})).filter(file=>file.endsWith('.html'));
 await Promise.all(pages.map(async file=>{
  const path='dist/'+file;
  const html=await readFile(path,'utf8');
  await writeFile(path,html.replace('</head>',()=>tag+'\n</head>'));
 }));
}

import {cp,mkdir,copyFile} from 'node:fs/promises';

await cp('public','dist',{recursive:true});
await mkdir('dist/vendor',{recursive:true});
for(const [source,name] of [
 ['three/build/three.module.js','three.module.js'],
 ['three/build/three.core.js','three.core.js'],
 ['@dimforge/rapier3d-compat/rapier.mjs','rapier.mjs']
]){
 await copyFile('node_modules/'+source,'dist/vendor/'+name);
}

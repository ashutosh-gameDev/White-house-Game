export function resultShare(button,canvas,title,path){
 const url=new URL(path,location.origin).href;
 const filename=title.toLowerCase().replaceAll(' ','-')+'-result.png';
 const fallback=document.createElement('div');
 fallback.hidden=true;
 const instructions=document.createElement('p');
 const link=document.createElement('input');
 link.type='url';link.value=url;link.readOnly=true;
 link.style.maxWidth='100%';
 link.setAttribute('aria-label','Game link');
 link.addEventListener('focus',()=>link.select());
 const download=document.createElement('a');
 download.textContent='Download screenshot';download.download=filename;
 download.style.color='inherit';
 fallback.append(instructions,link,document.createTextNode(' '),download);
 const actions=button.closest('.actions, form');
 (actions??button).after(fallback);

 let capture=null,downloadUrl=null;
 function clear(){
  capture=null;
  button.hidden=true;button.disabled=false;fallback.hidden=true;
  if(downloadUrl)URL.revokeObjectURL(downloadUrl);
  downloadUrl=null;download.removeAttribute('href');
 }
 function show(score){
  clear();
  const current={score,file:null,pending:true};
  capture=current;
  button.hidden=false;button.disabled=true;
 }
 function captureFrame(){
  const current=capture;
  if(!current?.pending)return;
  current.pending=false;
  const card=document.createElement('canvas');
  card.width=960;
  const height=Math.round(Math.max(420,Math.min(900,960*canvas.height/(canvas.width||1))));
  card.height=height+200;
  const ctx=card.getContext('2d');
  ctx.fillStyle='#101727';ctx.fillRect(0,0,card.width,card.height);
  if(canvas.width&&canvas.height){
   const scale=Math.min(card.width/canvas.width,height/canvas.height);
   const w=canvas.width*scale,h=canvas.height*scale;
   ctx.drawImage(canvas,(card.width-w)/2,(height-h)/2,w,h);
  }
  ctx.fillStyle='#fff';ctx.font='bold 45px system-ui';
  ctx.fillText(title,36,height+58,888);
  ctx.fillStyle='#9df2e7';ctx.font='bold 34px system-ui';
  ctx.fillText(current.score,36,height+113,888);
  ctx.fillStyle='#d2d9e7';ctx.font='25px system-ui';
  ctx.fillText(url,36,height+160,888);
  card.toBlob(blob=>{
   if(capture!==current)return;
   if(blob)current.file=new File([blob],filename,{type:'image/png'});
   button.disabled=false;
  },'image/png');
 }

 button.addEventListener('click',async()=>{
  const current=capture;
  if(!current)return;
  const {file,score}=current;
  const payload={title,text:title+' · '+score,url,files:file?[file]:[]};
  try{
   if(file&&navigator.canShare?.(payload)){
    await navigator.share(payload);
    return;
   }
  }catch(error){
   if(error.name==='AbortError')return;
  }
  if(capture!==current)return;
  if(file&&!downloadUrl){
   downloadUrl=URL.createObjectURL(file);
   download.href=downloadUrl;
  }
  download.hidden=!file;
  instructions.textContent=file?'Save the screenshot and paste this game link into your message.':'Copy this game link into your message.';
  fallback.hidden=false;
  (file?download:link).focus();
 });
 return {show,clear,captureFrame,setVisible(visible){
  button.hidden=!visible||!capture;
  if(button.hidden)fallback.hidden=true;
 }};
}

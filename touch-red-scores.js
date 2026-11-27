export function rankTouchRed(rows,run){
 const previous=rows.find(row=>row.id===run.id);
 if(previous?.hits<=run.hits)return rows;
 const ranked=[...rows.filter(row=>row.id!==run.id),run].sort((a,b)=>a.hits-b.hits).slice(0,50);
 return ranked.includes(run)?ranked:rows;
}

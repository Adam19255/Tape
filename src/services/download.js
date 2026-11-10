/** Hands a file to the browser's download flow. data: string | Uint8Array. Needs a DOM, so it lives here and not in lib/. */
export function saveFile(name,data,type='application/octet-stream'){
  const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1e4); // give slow browsers time to start the save
}

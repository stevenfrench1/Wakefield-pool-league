const token=location.hash.slice(1);
// Keep the one-time credential out of navigation history, requests and storage.
history.replaceState(null,'',location.pathname);
const form=document.querySelector('#owner-setup-form'),status=document.querySelector('#setup-status'),button=form.querySelector('button');
if(!token){status.textContent='Open the private administrator setup link supplied for this transfer.';button.disabled=true;}
form.addEventListener('submit',async event=>{
 event.preventDefault();const values=new FormData(form);
 if(values.get('password')!==values.get('confirmation')){status.textContent='The passwords do not match.';return;}
 button.disabled=true;status.textContent='';
 try{
  const response=await fetch('/api/owner-setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password:values.get('password')})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'The password could not be saved.');
  form.reset();form.hidden=true;document.querySelector('#setup-complete').hidden=false;
 }catch(error){status.textContent=error.message;button.disabled=false;}
});

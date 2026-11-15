'use client';
import {useEffect,useState} from 'react';
import WhatsAppOperations from './whatsapp-operations';
export default function WhatsAppSettings({api}:{api:(path:string,init?:RequestInit)=>Promise<any>}){
 const [form,setForm]=useState<Record<string,string>>({ENABLED:'false',API_VERSION:'v27.0',PACK_PRICE_PAISE:'',TEMPLATES:'[]'});
 const [secrets,setSecrets]=useState<Record<string,boolean>>({});const [wallets,setWallets]=useState<{vendor_id:number;cafe_name:string;credits:number}[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;Promise.all([api('admin/whatsapp/config'),api('admin/whatsapp/wallets')]).then(([c,w])=>{if(!alive)return;const {configured_secrets,...values}=c;setForm(f=>({...f,...values}));setSecrets(configured_secrets||{});setWallets(w.wallets);setLoaded(true);}).catch(e=>{if(alive)setNotice(e.message)});return()=>{alive=false}},[api]);
 const templateRows: {name:string;language:string;fields:string[]}[] = (()=>{try{return JSON.parse(form.TEMPLATES||'[]')}catch{return []}})();
 function updateTemplate(index:number,patch:Partial<{name:string;language:string;fields:string[]}>){const next=templateRows.map((row,i)=>i===index?{...row,...patch}:row);setForm({...form,TEMPLATES:JSON.stringify(next)})}
 async function save(){setBusy(true);setNotice('');try{const c=await api('admin/whatsapp/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,TEMPLATES:JSON.stringify(templateRows.map(row=>({...row,fields:row.fields.map(field=>field.trim())})))})});setSecrets(c.configured_secrets||{});setForm(f=>{const next={...f};for(const k of ['ACCESS_TOKEN','APP_SECRET','VERIFY_TOKEN','PAYMENT_WEBHOOK_SECRET'])delete next[k];return next});setNotice('Shared sender and pack settings saved.');}catch(e){setNotice(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}}
 return <section className="page-stack"><div className="hero-row"><div><h1>WhatsApp</h1><p>One Hash for Gamers sender. Cafés purchase 100-message packs before sending.</p></div></div>
 {notice&&<div role="status" className="action-notice">{notice}</div>}
 <section className="e2e-card"><h2>Setup guide for operations</h2>
 <ol><li><strong>Connect the booking service.</strong> If the connection banner appears, ask the deployment administrator to set BOOKING_BACKEND_URL to the booking server origin in the super-admin deployment and redeploy.</li>
 <li><strong>Collect Meta details.</strong> Open <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Meta for Developers ↗</a> → your app → WhatsApp API Setup for the phone number ID and WABA ID. Get the app secret from App settings → Basic. Use a system-user access token with WhatsApp messaging and management permissions for production.</li>
 <li><strong>Set webhook tokens.</strong> Choose a strong private verification token and enter the same value in Meta. The Razorpay webhook secret must exactly match the secret configured in Razorpay; it is not the Razorpay API key secret.</li>
 <li><strong>Save and validate.</strong> Run the checks below. Use the Meta API version supported by your app, such as v27.0; v1.0 is not supported.</li></ol>
 <p>Meta callback: <code>https://YOUR-BOOKING-SERVER/api/whatsapp/webhook</code><br/>Razorpay callback: <code>https://YOUR-BOOKING-SERVER/api/whatsapp/payment-webhook</code></p></section>
 <WhatsAppOperations api={api}/>
 <section className="e2e-card"><h2>Shared sender settings</h2><div className="form-grid-compact two">
 <label>Sending<select value={form.ENABLED} onChange={e=>setForm({...form,ENABLED:e.target.value})}><option value="false">Disabled</option><option value="true">Enabled</option></select></label>
 <label>Price for 100 messages (₹)<input type="number" min="1" step="0.01" value={form.PACK_PRICE_PAISE?Number(form.PACK_PRICE_PAISE)/100:''} onChange={e=>setForm({...form,PACK_PRICE_PAISE:String(Math.round(Number(e.target.value)*100))})}/></label>
 {['PHONE_NUMBER_ID','WABA_ID','API_VERSION','ACCESS_TOKEN','APP_SECRET','VERIFY_TOKEN','PAYMENT_WEBHOOK_SECRET'].map(key=><label key={key}>{({PHONE_NUMBER_ID:'Meta phone number ID',WABA_ID:'WhatsApp Business Account ID (WABA)',API_VERSION:'Meta API version',ACCESS_TOKEN:'Meta access token',APP_SECRET:'Meta app secret',VERIFY_TOKEN:'Meta webhook verification token',PAYMENT_WEBHOOK_SECRET:'Razorpay webhook signing secret'} as Record<string,string>)[key]}
 <input type={key.includes('SECRET')||key.includes('TOKEN')?'password':'text'} autoComplete="off" value={form[key]||''} placeholder={secrets[key]?'Saved — leave blank to keep':key==='API_VERSION'?'v27.0':''} onChange={e=>setForm({...form,[key]:e.target.value})}/>{key==='VERIFY_TOKEN'&&<button type="button" onClick={()=>{const bytes=crypto.getRandomValues(new Uint8Array(32));setForm({...form,VERIFY_TOKEN:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')});setNotice('New verification token generated. Copy it to Meta and save settings.')}}>Generate secure token</button>}{key==='VERIFY_TOKEN'&&form.VERIFY_TOKEN&&<button type="button" onClick={()=>void navigator.clipboard.writeText(form.VERIFY_TOKEN).then(()=>setNotice('Verification token copied. Paste it into Meta webhook setup.')).catch(()=>setNotice('Clipboard unavailable. Enter your own matching token in both places.'))}>Copy new token</button>}</label>)}
 </div><h3>Approved message templates</h3>
 {templateRows.map((row,index)=><div className="form-grid-compact two" key={index}>
 <label>Meta template name<input value={row.name} onChange={e=>updateTemplate(index,{name:e.target.value})} placeholder="hfg_booking_confirmation"/></label>
 <label>Language code<input value={row.language} onChange={e=>updateTemplate(index,{language:e.target.value})} placeholder="en"/></label>
 <label>Fields in template order (comma separated)<input value={row.fields.join(',')} onChange={e=>updateTemplate(index,{fields:e.target.value?e.target.value.split(','):[]})} placeholder="customer,cafe,date and time"/></label>
 <button onClick={()=>setForm({...form,TEMPLATES:JSON.stringify(templateRows.filter((_,i)=>i!==index))})}>Remove template</button></div>)}
 <button onClick={()=>setForm({...form,TEMPLATES:JSON.stringify([...templateRows,{name:'',language:'en',fields:[]}])})}>Add approved template</button>
 <p>Use names and languages already approved by Meta. Enter body fields in their approved order. Automation fields: customer, cafe, booking_id, date, time, date and time, booking_url. Booking-link replies use cafe and booking_url.</p>
 <p>Credentials are encrypted. Leave a saved secret blank to keep it.</p>
 <button className="action-button primary" disabled={busy||!loaded} onClick={()=>void save()}>{busy?'Saving…':'Save WhatsApp settings'}</button></section>
 <section className="e2e-card"><h2>Café message credits</h2><p>Each captured pack payment adds 100 credits automatically. No free credits are granted on activation.</p><table><thead><tr><th>Café</th><th>Remaining credits</th></tr></thead><tbody>{wallets.map(w=><tr key={w.vendor_id}><td>{w.cafe_name} (#{w.vendor_id})</td><td>{w.credits}</td></tr>)}</tbody></table>{loaded&&!wallets.length&&<p>No café has purchased a pack yet.</p>}{!loaded&&<p>Balances unavailable until the backend connection is restored.</p>}</section>
 </section>
}

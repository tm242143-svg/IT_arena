const byId=id=>document.getElementById(id);
const show=(el,msg,ok=false)=>{el.textContent=msg;el.className=ok?'msg success':'msg error'};

async function profile(uid){
  const {data,error}=await quizSupabase.from('profiles').select('*').eq('id',uid).maybeSingle();
  return {data,error};
}

if(byId('loginForm')) byId('loginForm').onsubmit=async e=>{
  e.preventDefault();
  const msg=byId('msg'); const email=byId('email').value.trim(); const password=byId('password').value;
  show(msg,'Signing in…');
  const {data,error}=await quizSupabase.auth.signInWithPassword({email,password});
  if(error){
    const friendly = /invalid login credentials/i.test(error.message) ? 'Email or password is incorrect. If you have not registered yet, create a student account first.' : error.message;
    show(msg,friendly); return;
  }
  const p=await profile(data.user.id);
  if(p.error){await quizSupabase.auth.signOut();show(msg,'Login succeeded, but your profile could not be loaded. Please contact the admin.');return;}
  if(!p.data){await quizSupabase.auth.signOut();show(msg,'Your account profile was not found. Please register again or ask the admin to create your profile.');return;}
  if(p.data.blocked){await quizSupabase.auth.signOut();show(msg,'This student account is blocked after three quiz warnings. Ask the admin to unblock it.');return;}
  show(msg,'Login successful. Opening dashboard…',true);
  setTimeout(()=>location.href='dashboard.html',350);
};

if(byId('registerForm')) byId('registerForm').onsubmit=async e=>{
  e.preventDefault();
  const msg=byId('msg'); const name=byId('name').value.trim(); const email=byId('email').value.trim(); const password=byId('password').value;
  show(msg,'Creating your account…');
  const {data,error}=await quizSupabase.auth.signUp({email,password,options:{data:{name}}});
  if(error){
    const friendly=/already registered|already exists|user already/i.test(error.message) ? 'This email is already registered. Please login instead.' : error.message;
    show(msg,friendly);return;
  }
  if(!data.user){show(msg,'Registration could not be completed. Please try again.');return;}
  // Profile creation is handled by a SECURITY DEFINER database function.
  // This avoids browser-side RLS failures during registration.
  if(data.session){
    const r=await quizSupabase.rpc('ensure_my_profile',{profile_name:name,profile_email:email});
    if(r.error){show(msg,'Account created, but profile setup failed: '+r.error.message);return;}
    show(msg,'Registration successful! Redirecting to login…',true);
    setTimeout(()=>location.href='login.html',700);
  } else {
    show(msg,'Registration successful. Check your email to confirm the account, then login.',true);
  }
};

(async()=>{
  const {data:{user}}=await quizSupabase.auth.getUser();
  if(!user)return location.href='login.html';
  const {data:p,error:pe}=await quizSupabase.from('profiles').select('role,blocked,warning_count,name').eq('id',user.id).maybeSingle();
  if(pe||!p)return location.href='login.html';
  if(p.blocked){alert('Your account is blocked after three quiz warnings. Please contact the admin.');await quizSupabase.auth.signOut();return location.href='login.html';}
  if(p.role==='admin')document.getElementById('adminLink').classList.remove('hidden');
  document.getElementById('logout').onclick=async()=>{await quizSupabase.auth.signOut();location.href='login.html'};
  const fallback=['Python','Java','C++','JavaScript','HTML & CSS','SQL','DBMS','Operating Systems','Computer Networks','Data Structures'];
  const q=await quizSupabase.from('questions').select('category');
  const cats=[...new Set((q.data||[]).map(x=>String(x.category||'').trim()).filter(Boolean))];
  const subjects=cats.length?cats:fallback;
  document.getElementById('subjects').innerHTML=subjects.map((s,i)=>`<a class="subject-card" style="--delay:${i}" href="quiz.html?subject=${encodeURIComponent(s)}"><span class="number">${String(i+1).padStart(2,'0')}</span><div class="subject-icon">${['⌘','☕','⚙','JS','<>','SQL','DB','OS','NET','DS'][i%10]}</div><h2>${s}</h2><p>Enter quiz →</p><div class="mini-code">while(skill){ learn(); }</div></a>`).join('');
})();

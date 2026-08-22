(async()=>{
  const el=document.getElementById('leaderboard');
  if(!el)return;
  el.innerHTML='<div class="loading-state">Loading leaderboard…</div>';
  const {data:{user}}=await quizSupabase.auth.getUser();
  if(!user){ location.href='login.html'; return; }
  const {data,error}=await quizSupabase.rpc('get_leaderboard');
  if(error){
    el.innerHTML='<div class="error-box"><b>Leaderboard could not load.</b><br>'+escapeHtml(error.message)+'</div>';
    return;
  }
  if(!data?.length){el.innerHTML='<div class="empty-state">No completed quizzes yet. Finish a quiz to appear here.</div>';return;}
  const rows=[...data].sort((a,b)=>Number(b.percentage)-Number(a.percentage)||new Date(a.completed_at)-new Date(b.completed_at));
  el.innerHTML=`<table><thead><tr><th>#</th><th>Student</th><th>Subject</th><th>Score</th><th>Percent</th><th>Completed</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${escapeHtml(r.student_name||'Student')}</b></td><td>${escapeHtml(r.subject||'—')}</td><td>${Number(r.score)||0}/${Number(r.total_questions)||0}</td><td><strong>${Number(r.percentage)||0}%</strong></td><td>${r.completed_at?new Date(r.completed_at).toLocaleString():'—'}</td></tr>`).join('')}</tbody></table>`;
  function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
})();

(async()=>{
  const {data:{user}}=await quizSupabase.auth.getUser();
  if(!user){location.href='login.html';return;}
  const {data:p,error:pe}=await quizSupabase.from('profiles').select('role,name').eq('id',user.id).maybeSingle();
  if(pe||p?.role!=='admin'){location.href='dashboard.html';return;}

  const qform=document.getElementById('questionForm');
  const qmsg=document.getElementById('adminMessage');
  const resultsBody=document.getElementById('resultsBody');
  const questionsBody=document.getElementById('questionsBody');
  const studentsBody=document.getElementById('studentsBody');

  qform.addEventListener('submit',async e=>{
    e.preventDefault();
    qmsg.textContent='Creating question…'; qmsg.className='admin-message';
    const row={
      category:document.getElementById('category').value.trim(),
      question:document.getElementById('question').value.trim(),
      option_a:document.getElementById('optionA').value.trim(),
      option_b:document.getElementById('optionB').value.trim(),
      option_c:document.getElementById('optionC').value.trim(),
      option_d:document.getElementById('optionD').value.trim(),
      correct_answer:document.getElementById('correctAnswer').value
    };
    const {error}=await quizSupabase.from('questions').insert(row);
    if(error){qmsg.textContent='Could not create question: '+error.message;qmsg.classList.add('error');return;}
    qmsg.textContent='Question created successfully.';qmsg.classList.add('success');qform.reset();loadQuestions();
  });

  document.getElementById('refreshResults').onclick=()=>{loadResults();loadStudents();};

  async function loadQuestions(){
    questionsBody.innerHTML='<tr><td colspan="5">Loading…</td></tr>';
    const {data,error}=await quizSupabase.from('questions').select('*').order('category').order('id');
    if(error){questionsBody.innerHTML=`<tr><td colspan="5" class="error-text">${escapeHtml(error.message)}</td></tr>`;return;}
    if(!data?.length){questionsBody.innerHTML='<tr><td colspan="5">No questions yet.</td></tr>';return;}
    questionsBody.innerHTML=data.map(x=>`<tr><td>${x.id}</td><td>${escapeHtml(x.category)}</td><td>${escapeHtml(x.question)}</td><td>${escapeHtml(x.correct_answer)}</td><td><button class="danger small delete-question" data-id="${x.id}">Delete</button></td></tr>`).join('');
    document.querySelectorAll('.delete-question').forEach(btn=>btn.onclick=async()=>{
      if(!confirm('Delete this question?'))return;
      const {error}=await quizSupabase.from('questions').delete().eq('id',btn.dataset.id);
      if(error){alert(error.message);return;} loadQuestions();
    });
  }

  async function loadResults(){
    resultsBody.innerHTML='<tr><td colspan="6">Loading…</td></tr>';
    const {data,error}=await quizSupabase.rpc('get_admin_results');
    if(error){resultsBody.innerHTML=`<tr><td colspan="6" class="error-text">${escapeHtml(error.message)}</td></tr>`;return;}
    if(!data?.length){resultsBody.innerHTML='<tr><td colspan="6">No completed quizzes yet.</td></tr>';return;}
    resultsBody.innerHTML=data.map(r=>`<tr><td>${escapeHtml(r.student_name||'Student')}</td><td>${escapeHtml(r.email||'')}</td><td>${escapeHtml(r.subject||'')}</td><td>${Number(r.score)||0}/${Number(r.total_questions)||0}</td><td>${Number(r.percentage)||0}%</td><td>${r.completed_at?new Date(r.completed_at).toLocaleString():'—'}</td></tr>`).join('');
  }

  async function loadStudents(){
    studentsBody.innerHTML='<tr><td colspan="5">Loading…</td></tr>';
    const {data,error}=await quizSupabase.from('profiles').select('id,name,email,warning_count,blocked').eq('role','student').order('name');
    if(error){studentsBody.innerHTML=`<tr><td colspan="5" class="error-text">${escapeHtml(error.message)}</td></tr>`;return;}
    if(!data?.length){studentsBody.innerHTML='<tr><td colspan="5">No students yet.</td></tr>';return;}
    studentsBody.innerHTML=data.map(s=>`<tr><td>${escapeHtml(s.name||'Student')}</td><td>${escapeHtml(s.email||'')}</td><td>${Number(s.warning_count)||0}/3</td><td>${s.blocked?'<span class="status blocked">Blocked</span>':'<span class="status active">Active</span>'}</td><td>${s.blocked?`<button class="btn small unblock" data-id="${s.id}">Unblock</button>`:'—'}</td></tr>`).join('');
    document.querySelectorAll('.unblock').forEach(btn=>btn.onclick=async()=>{
      const {error}=await quizSupabase.from('profiles').update({blocked:false,warning_count:0}).eq('id',btn.dataset.id);
      if(error){alert(error.message);return;} loadStudents();
    });
  }

  function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  loadQuestions();loadResults();loadStudents();
})();

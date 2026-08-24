(async()=>{
  const {data:{user}}=await quizSupabase.auth.getUser();
  if(!user)return location.href='login.html';
  const {data:profile,error:profileError}=await quizSupabase.from('profiles').select('role,blocked,warning_count').eq('id',user.id).maybeSingle();
  if(profileError||!profile)return location.href='login.html';
  if(profile.blocked)return location.href='dashboard.html';

  const subject=new URLSearchParams(location.search).get('subject')||'Python';
  document.getElementById('subject').textContent=subject;
  const {data,error}=await quizSupabase.from('questions').select('*').ilike('category',subject.trim());
  if(error)return msg('Could not load questions: '+error.message);
  if(!data?.length)return msg('No questions found for this subject. Ask the admin to add questions.');

  let questions=data,idx=0,answers=Array(questions.length).fill(null),warningCount=Number(profile.warning_count||0),warningLocked=false,lastViolation=0,submitted=false;
  const overlay=document.getElementById('warningOverlay');
  const warningText=document.getElementById('warningText');
  const warningCountEl=document.getElementById('warningCount');
  const continueBtn=document.getElementById('continueExam');

  async function recordWarning(reason){
    if(submitted||warningLocked)return;
    const now=Date.now(); if(now-lastViolation<2500)return; lastViolation=now;
    warningLocked=true;
    warningCount=Math.min(3,warningCount+1);
    const {data:warningResult,error:warningError}=await quizSupabase.rpc('record_quiz_warning');
    if(warningError){ warningLocked=false; msg('Could not record the warning: '+warningError.message); return; }
    warningCount=Number(warningResult?.warning_count ?? warningCount+1);
    const blocked=Boolean(warningResult?.blocked ?? warningCount>=3);
    warningCountEl.textContent=`Warning ${warningCount} of 3`;
    warningText.innerHTML=blocked
      ? '<strong>Exam blocked.</strong><br>You reached 3 warnings. Your quiz has been locked. Please contact the administrator.'
      : `<strong>Warning ${warningCount} of 3.</strong><br>${reason}<br><small>Stay on this quiz page. Leaving the tab or switching windows again will create another warning.</small>`;
    overlay.classList.remove('hidden');
    if(blocked){continueBtn.textContent='Quiz Blocked';continueBtn.disabled=true;}
    else continueBtn.textContent='Return to Quiz';
  }

  continueBtn.onclick=()=>{
    if(warningCount>=3)return;
    overlay.classList.add('hidden');warningLocked=false;enterFullscreen();
  };

  async function enterFullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();}catch(e){/* browser may deny */}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)recordWarning('You switched away from the quiz or changed browser tab.');});
  window.addEventListener('blur',()=>recordWarning('The quiz window lost focus.')); 
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&!submitted&&!warningLocked)recordWarning('Fullscreen mode was exited during the quiz.');});
  window.addEventListener('beforeunload',e=>{if(!submitted){e.preventDefault();e.returnValue='Leaving the quiz may create a warning.';}});

  function opts(q){return [{k:'A',v:q.option_a??q.a},{k:'B',v:q.option_b??q.b},{k:'C',v:q.option_c??q.c},{k:'D',v:q.option_d??q.d}]}
  function render(){
    const q=questions[idx];document.getElementById('question').textContent=q.question||q.question_text||'Question';
    document.getElementById('progressText').textContent=`Question ${idx+1} of ${questions.length}`;
    document.getElementById('progressBar').style.width=`${(idx+1)/questions.length*100}%`;
    document.getElementById('options').innerHTML=opts(q).map(o=>`<button class="option ${answers[idx]===o.k?'selected':''}" data-k="${o.k}">${o.v}</button>`).join('');
    document.querySelectorAll('.option').forEach(b=>b.onclick=()=>{answers[idx]=b.dataset.k;render()});
    document.getElementById('prev').disabled=idx===0;
    document.getElementById('prev').onclick=()=>{if(idx>0){idx--;render()}};
    const next=document.getElementById('next');next.textContent=idx===questions.length-1?'Submit Quiz ✓':'Next';
    next.onclick=idx===questions.length-1?submit:()=>{if(answers[idx]==null)return msg('Please answer this question before moving on.');idx++;render()};
  }
  function msg(s){document.getElementById('msg').textContent=s}
  async function submit(){
    if(warningCount>=3)return;
    if(answers.some(x=>!x))return msg('Please answer every question before submitting.');
    submitted=true;
    const correct=questions.reduce((n,q,i)=>n+(String(q.correct_answer||q.correct||'').trim().toUpperCase()===answers[i]?1:0),0);
    const percentage=Math.round(correct/questions.length*100);
    const payload={user_id:user.id,subject,score:correct,total_questions:questions.length,percentage,completed_at:new Date().toISOString()};
    const {error}=await quizSupabase.from('quiz_results').insert(payload);
    if(error){submitted=false;return msg('Could not submit the quiz: '+error.message)}
    try{if(document.fullscreenElement)await document.exitFullscreen()}catch(e){}
    location.href=`result.html?subject=${encodeURIComponent(subject)}&score=${correct}&total=${questions.length}&percentage=${percentage}`;
  }
  render();
  setTimeout(enterFullscreen,400);
})();

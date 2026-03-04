<script>
// Clock — shared ทุกหน้า
(function(){
  function tick(){
    const n=new Date();
    const t=n.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
    const d=n.toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'});
    const el=document.getElementById('topbarTime');
    if(el) el.innerHTML=`<div style="font-size:13px;font-weight:600;color:#333;">${t}</div><div style="font-size:11px;color:#aaa;">${d}</div>`;
  }
  tick(); setInterval(tick,30000);
})();
</script>
</body>
</html>

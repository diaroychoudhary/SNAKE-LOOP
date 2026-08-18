(function(){
  "use strict";

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const COLS = 20, ROWS = 20;
  let CELL = canvas.width / COLS;

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const speedEl = document.getElementById('speedlvl');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayScore = document.getElementById('overlay-score');
  const startBtn = document.getElementById('startBtn');

  let best = 0;

  let snake, dir, nextDir, food, score, running, paused, tickMs, loopHandle, baseSpeed;

  function resetState(){
    const cx = Math.floor(COLS/2), cy = Math.floor(ROWS/2);
    snake = [
      {x:cx-1,y:cy},
      {x:cx-2,y:cy},
      {x:cx-3,y:cy}
    ];
    dir = {x:1,y:0};
    nextDir = {x:1,y:0};
    score = 0;
    baseSpeed = 150;
    tickMs = baseSpeed;
    scoreEl.textContent = '0';
    speedEl.textContent = '1';
    placeFood();
  }

  function placeFood(){
    let pos;
    do{
      pos = { x: Math.floor(Math.random()*COLS), y: Math.floor(Math.random()*ROWS) };
    } while(snake.some(s => s.x===pos.x && s.y===pos.y));
    food = pos;
  }

  function wrap(v, max){
    if(v < 0) return max-1;
    if(v >= max) return 0;
    return v;
  }

  function paint(){
    // board squares
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const light = (x+y)%2===0;
        ctx.fillStyle = light ? '#ebecd0' : '#7fa650';
        ctx.fillRect(x*CELL, y*CELL, CELL, CELL);
      }
    }

    // subtle edge glow to hint the loop
    const edge = ctx.createLinearGradient(0,0,canvas.width,0);
    edge.addColorStop(0,'rgba(224,86,61,0.16)');
    edge.addColorStop(0.06,'rgba(224,86,61,0)');
    edge.addColorStop(0.94,'rgba(224,86,61,0)');
    edge.addColorStop(1,'rgba(224,86,61,0.16)');
    ctx.fillStyle = edge;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const edgeV = ctx.createLinearGradient(0,0,0,canvas.height);
    edgeV.addColorStop(0,'rgba(224,86,61,0.16)');
    edgeV.addColorStop(0.06,'rgba(224,86,61,0)');
    edgeV.addColorStop(0.94,'rgba(224,86,61,0)');
    edgeV.addColorStop(1,'rgba(224,86,61,0.16)');
    ctx.fillStyle = edgeV;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // food
    const fx = food.x*CELL + CELL/2, fy = food.y*CELL + CELL/2;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL*0.32, 0, Math.PI*2);
    ctx.fillStyle = '#c9a24b';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx - CELL*0.08, fy - CELL*0.08, CELL*0.1, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();

    // snake
    snake.forEach((seg, i)=>{
      const px = seg.x*CELL, py = seg.y*CELL;
      const isHead = i===0;
      const pad = isHead ? CELL*0.08 : CELL*0.12;
      ctx.fillStyle = isHead ? '#2f2e27' : '#c9a24b';
      roundRect(ctx, px+pad, py+pad, CELL-pad*2, CELL-pad*2, isHead ? 6 : 5);
      ctx.fill();
      if(isHead){
        ctx.fillStyle = '#c9a24b';
        const eyeSize = CELL*0.09;
        let e1x=px+CELL*0.3, e1y=py+CELL*0.3, e2x=px+CELL*0.7, e2y=py+CELL*0.3;
        if(dir.x===1){ e1x=px+CELL*0.65; e1y=py+CELL*0.28; e2x=px+CELL*0.65; e2y=py+CELL*0.72; }
        else if(dir.x===-1){ e1x=px+CELL*0.35; e1y=py+CELL*0.28; e2x=px+CELL*0.35; e2y=py+CELL*0.72; }
        else if(dir.y===1){ e1x=px+CELL*0.28; e1y=py+CELL*0.65; e2x=px+CELL*0.72; e2y=py+CELL*0.65; }
        else if(dir.y===-1){ e1x=px+CELL*0.28; e1y=py+CELL*0.35; e2x=px+CELL*0.72; e2y=py+CELL*0.35; }
        ctx.beginPath(); ctx.arc(e1x,e1y,eyeSize,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(e2x,e2y,eyeSize,0,Math.PI*2); ctx.fill();
      }
    });
  }

  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function step(){
    dir = nextDir;
    const head = snake[0];
    let nx = wrap(head.x + dir.x, COLS);
    let ny = wrap(head.y + dir.y, ROWS);

    // self-collision
    if(snake.some(s => s.x===nx && s.y===ny)){
      gameOver();
      return;
    }

    snake.unshift({x:nx, y:ny});

    if(nx===food.x && ny===food.y){
      score += 10;
      scoreEl.textContent = String(score);
      if(score > best){
        best = score;
        bestEl.textContent = String(best);
      }
      placeFood();
      // ramp speed slightly every few foods, floor at 70ms
      const level = Math.floor(score/50) + 1;
      speedEl.textContent = String(level);
      tickMs = Math.max(70, baseSpeed - (level-1)*10);
      restartLoop();
    } else {
      snake.pop();
    }

    paint();
  }

  function restartLoop(){
    clearInterval(loopHandle);
    loopHandle = setInterval(step, tickMs);
  }

  function gameOver(){
    running = false;
    clearInterval(loopHandle);
    overlayTitle.textContent = 'Looped into yourself';
    overlayText.textContent = 'The board has no walls — only your own tail can stop you.';
    overlayScore.style.display = 'block';
    overlayScore.textContent = 'Score ' + score + (score>=best ? '  ·  new best' : '  ·  best ' + best);
    startBtn.textContent = 'Play again';
    overlay.classList.add('show');
  }

  function startGame(){
    resetState();
    running = true;
    paused = false;
    overlay.classList.remove('show');
    overlayScore.style.display = 'none';
    paint();
    restartLoop();
  }

  function togglePause(){
    if(!running) return;
    paused = !paused;
    if(paused){
      clearInterval(loopHandle);
      overlayTitle.textContent = 'Paused';
      overlayText.textContent = 'Take a breath. The loop will still be here.';
      overlayScore.style.display = 'block';
      overlayScore.textContent = 'Score ' + score;
      startBtn.textContent = 'Resume';
      overlay.classList.add('show');
    } else {
      overlay.classList.remove('show');
      restartLoop();
    }
  }

  startBtn.addEventListener('click', ()=>{
    if(paused){ togglePause(); return; }
    startGame();
  });

  function setDir(x,y){
    // prevent reversing directly into own neck
    if(snake.length>1 && (dir.x===-x && dir.y===-y)) return;
    nextDir = {x,y};
    if(paused) togglePause();
  }

  window.addEventListener('keydown', (e)=>{
    switch(e.key){
      case 'ArrowUp': case 'w': case 'W': setDir(0,-1); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': setDir(0,1); e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': setDir(-1,0); e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': setDir(1,0); e.preventDefault(); break;
      case ' ':
        e.preventDefault();
        if(!running) { startGame(); } else { togglePause(); }
        break;
    }
  });

  document.getElementById('up').addEventListener('click', ()=> setDir(0,-1));
  document.getElementById('down').addEventListener('click', ()=> setDir(0,1));
  document.getElementById('left').addEventListener('click', ()=> setDir(-1,0));
  document.getElementById('right').addEventListener('click', ()=> setDir(1,0));

  // swipe support
  let touchStart = null;
  canvas.addEventListener('touchstart', (e)=>{
    const t = e.changedTouches[0];
    touchStart = {x:t.clientX, y:t.clientY};
  }, {passive:true});
  canvas.addEventListener('touchend', (e)=>{
    if(!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if(Math.abs(dx) < 20 && Math.abs(dy) < 20){ touchStart=null; return; }
    if(Math.abs(dx) > Math.abs(dy)){
      setDir(dx>0?1:-1, 0);
    } else {
      setDir(0, dy>0?1:-1);
    }
    touchStart = null;
  }, {passive:true});

  // initial paint (idle preview)
  resetState();
  paint();
  running = false;
})();

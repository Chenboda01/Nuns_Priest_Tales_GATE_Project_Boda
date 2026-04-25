(function() {
  'use strict';

  var audio = document.getElementById('narration-audio');
  var bgMusic = document.getElementById('bg-music');
  var musicToggle = document.getElementById('music-toggle');
  var themeToggle = document.getElementById('theme-toggle');
  var overlay = document.getElementById('first-load');
  var musicStarted = false;
  var musicOn = true;
  var darkOn = localStorage.getItem('ct-theme') === 'dark';
  var currentScene = null;
  var currentWords = [];
  var highlightFrame = null;
  var activeBtn = null;

  function pad(n) { return String(n).padStart(2, '0'); }

  function getActiveScene() {
    var slide = document.querySelector('.reveal .slides section.present');
    if (!slide) return null;
    return slide.getAttribute('data-scene');
  }

  function stopAudio() {
    audio.pause();
    audio.currentTime = 0;
    if (highlightFrame) { cancelAnimationFrame(highlightFrame); highlightFrame = null; }
    if (activeBtn) { activeBtn.textContent = '▶ Listen'; activeBtn = null; }
  }

  function loadWords(scene, container) {
    var data = getSceneData(scene);
    if (!data) return;
    fetch(data.words)
      .then(function(r) { return r.json(); })
      .then(function(wordList) {
        currentWords = wordList;
        container.innerHTML = '';
        wordList.forEach(function(w, i) {
          var span = document.createElement('span');
          span.className = 'word';
          span.textContent = w.word;
          span.dataset.start = w.start;
          span.dataset.end = w.end;
          span.dataset.index = i;
          container.appendChild(span);
          if (i < wordList.length - 1) {
            container.appendChild(document.createTextNode(' '));
          }
        });
      })
      .catch(function() {
        currentWords = [];
        fetch(data.audio.replace('.mp3', '.txt').replace('audio', 'scenes'))
          .then(function(r) { return r.text(); })
          .then(function(txt) { container.textContent = txt; })
          .catch(function() { container.textContent = '(Caption unavailable)'; });
      });
  }

  function highlightWord(currentTime) {
    var spans = document.querySelectorAll('.reveal .slides section.present .word');
    var found = false;
    spans.forEach(function(span) {
      var s = parseFloat(span.dataset.start);
      var e = parseFloat(span.dataset.end);
      if (currentTime >= s && currentTime < e) {
        span.classList.add('highlighted');
        found = true;
      } else {
        span.classList.remove('highlighted');
      }
    });
    if (!found) { spans.forEach(function(s) { s.classList.remove('highlighted'); }); }
  }

  function startHighlightLoop() {
    function loop() {
      if (!audio.paused) {
        highlightWord(audio.currentTime);
        highlightFrame = requestAnimationFrame(loop);
      }
    }
    loop();
  }

  function playScene(scene, btn) {
    stopAudio();
    var data = getSceneData(scene);
    if (!data) return;
    var container = document.getElementById('words-' + pad(scene));
    if (container && container.children.length === 0) {
      loadWords(scene, container);
    }
    audio.src = data.audio;
    audio.load();
    audio.oncanplaythrough = function() {
      audio.play().then(function() {
        btn.textContent = '⏸ Pause';
        activeBtn = btn;
        startHighlightLoop();
      }).catch(function() {});
    };
    audio.onended = function() {
      btn.textContent = '↻ Replay';
      activeBtn = null;
      if (highlightFrame) { cancelAnimationFrame(highlightFrame); highlightFrame = null; }
    };
  }

  function togglePlay(btn) {
    var scene = btn.getAttribute('data-scene');
    if (activeBtn === btn) {
      if (audio.paused) {
        audio.play();
        btn.textContent = '⏸ Pause';
        startHighlightLoop();
      } else {
        audio.pause();
        btn.textContent = '▶ Listen';
        if (highlightFrame) { cancelAnimationFrame(highlightFrame); highlightFrame = null; }
      }
    } else {
      playScene(scene, btn);
    }
  }

  function startMusic() {
    if (musicStarted) return;
    musicStarted = true;
    if (musicOn) {
      bgMusic.volume = 0.18;
      bgMusic.play().catch(function() {});
      musicToggle.textContent = '♫';
    }
  }

  function toggleMusic() {
    musicOn = !musicOn;
    if (musicOn) {
      bgMusic.volume = 0.18;
      bgMusic.play().catch(function() {});
      musicToggle.textContent = '♫';
    } else {
      bgMusic.pause();
      musicToggle.textContent = '🔇';
    }
  }

  function applyTheme() {
    if (darkOn) {
      document.body.classList.add('dark');
      themeToggle.textContent = '☀️';
    } else {
      document.body.classList.remove('dark');
      themeToggle.textContent = '🌙';
    }
  }
  applyTheme();

  function toggleTheme() {
    darkOn = !darkOn;
    localStorage.setItem('ct-theme', darkOn ? 'dark' : 'light');
    applyTheme();
  }

  document.addEventListener('click', function(e) {
    if (overlay && overlay.style.display !== 'none') {
      overlay.style.display = 'none';
      startMusic();
    }
    var btn = e.target.closest('.play-btn');
    if (btn) {
      e.preventDefault();
      if (!musicStarted) startMusic();
      togglePlay(btn);
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.code === 'Space') {
      if (overlay && overlay.style.display !== 'none') {
        overlay.style.display = 'none';
        startMusic();
        return;
      }
      var btn = document.querySelector('.reveal .slides section.present .play-btn');
      if (btn) { e.preventDefault(); togglePlay(btn); }
    }
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      if (!musicStarted) startMusic();
      toggleMusic();
    }
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      toggleTheme();
    }
  });

  musicToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!musicStarted) startMusic();
    toggleMusic();
  });

  themeToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleTheme();
  });

  Reveal.on('slidechanged', function() {
    stopAudio();
  });
})();

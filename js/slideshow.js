(function() {
  'use strict';

  var audio = document.getElementById('narration-audio');
  var bgMusic = document.getElementById('bg-music');
  var musicToggle = document.getElementById('music-toggle');
  var themeToggle = document.getElementById('theme-toggle');
  var captionToggle = document.getElementById('caption-toggle');
  var playBtn = document.getElementById('play-btn');
  var progressBar = document.getElementById('progress-bar');
  var overlay = document.getElementById('first-load');
  var musicStarted = false;
  var musicOn = true;
  var darkOn = localStorage.getItem('ct-theme') === 'dark';
  var multiLineOn = false;
  var currentWords = [];
  var highlightFrame = null;
  var playingScene = null;

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
    playBtn.textContent = '▶';
    playingScene = null;
    progressBar.style.width = '0%';
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
        found = span;
      } else {
        span.classList.remove('highlighted');
      }
    });
    if (!found) { spans.forEach(function(s) { s.classList.remove('highlighted'); }); }

    if (found) {
      var inner = document.querySelector('.reveal .slides section.present .caption-inner');
      if (inner) {
        var spanLeft = found.offsetLeft;
        var innerWidth = inner.clientWidth;
        var scrollTo = Math.max(0, spanLeft - innerWidth / 2);
        inner.scrollTo({ left: scrollTo, behavior: 'smooth' });
      }
    }
  }

  function startHighlightLoop() {
    function loop() {
      if (!audio.paused) {
        highlightWord(audio.currentTime);
        var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        progressBar.style.width = pct + '%';
        highlightFrame = requestAnimationFrame(loop);
      }
    }
    loop();
  }

  function playScene(scene) {
    if (!scene) return;
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
        playBtn.textContent = '⏸';
        playingScene = scene;
        startHighlightLoop();
      }).catch(function() {});
    };
    audio.onended = function() {
      playBtn.textContent = '↻';
      playingScene = null;
      progressBar.style.width = '100%';
      if (highlightFrame) { cancelAnimationFrame(highlightFrame); highlightFrame = null; }
    };
  }

  function togglePlay() {
    var scene = getActiveScene();
    if (!scene) return;
    if (playingScene === scene) {
      if (audio.paused) {
        audio.play();
        playBtn.textContent = '⏸';
        startHighlightLoop();
      } else {
        audio.pause();
        playBtn.textContent = '▶';
        if (highlightFrame) { cancelAnimationFrame(highlightFrame); highlightFrame = null; }
      }
    } else {
      playScene(scene);
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

  function toggleCaption() {
    multiLineOn = !multiLineOn;
    if (multiLineOn) {
      document.body.classList.add('multiline');
      captionToggle.textContent = '☰';
    } else {
      document.body.classList.remove('multiline');
      captionToggle.textContent = '≡';
    }
  }

  playBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!musicStarted) startMusic();
    togglePlay();
  });

  document.addEventListener('click', function(e) {
    if (overlay && overlay.style.display !== 'none') {
      overlay.style.display = 'none';
      startMusic();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.code === 'Space') {
      if (overlay && overlay.style.display !== 'none') {
        overlay.style.display = 'none';
        startMusic();
        return;
      }
      var scene = getActiveScene();
      if (scene) { e.preventDefault(); togglePlay(); }
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
    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      toggleCaption();
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

  captionToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleCaption();
  });

  Reveal.on('slidechanged', function() {
    stopAudio();
  });
})();

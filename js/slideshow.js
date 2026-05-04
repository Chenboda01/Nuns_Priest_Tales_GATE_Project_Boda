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
  var musicOn = false;
  var darkOn = localStorage.getItem('ct-theme') === 'dark';
  var captionStates = ['multiline', 'singleline', 'off'];
  var captionState = localStorage.getItem('ct-caption-state') || 'multiline';
  if (captionStates.indexOf(captionState) === -1) captionState = 'multiline';
  var playingAudio = null;
  var highlightFrame = null;
  var playingScene = null;

  function pad(n) { return String(n).padStart(2, '0'); }

  function getActiveScene() {
    var slide = document.querySelector('.reveal .slides section.present');
    if (!slide) return null;
    var scene = slide.getAttribute('data-scene');
    if (!scene && slide.parentElement) {
      scene = slide.parentElement.getAttribute('data-scene');
    }
    return scene;
  }

  function stopAudio() {
    if (playingAudio) {
      playingAudio.pause();
      playingAudio.removeAttribute('src');
      playingAudio.load();
      playingAudio = null;
    }
    if (highlightFrame) { cancelAnimationFrame(highlightFrame); highlightFrame = null; }
    playBtn.textContent = '▶';
    playingScene = null;
    if (progressBar) progressBar.style.width = '0%';
  }

  function loadWords(scene, container) {
    var data = getSceneData(scene);
    if (!data) return;
    fetch(data.words)
      .then(function(r) { return r.json(); })
      .then(function(wordList) {
        container.innerHTML = '';
        wordList.forEach(function(w, i) {
          var span = document.createElement('span');
          span.className = 'word';
          span.textContent = w.word;
          span.dataset.start = w.start;
          span.dataset.end = w.end;
          container.appendChild(span);
          if (i < wordList.length - 1) {
            container.appendChild(document.createTextNode(' '));
          }
        });
      })
      .catch(function() {
        fetch(data.audio.replace('.mp3', '.txt').replace('audio', 'scenes'))
          .then(function(r) { return r.text(); })
          .then(function(txt) { container.textContent = txt; })
          .catch(function() { container.textContent = ''; });
      });
  }

  function ensureWords(scene) {
    if (!scene) return;
    var container = document.getElementById('words-' + pad(scene));
    if (container && container.children.length === 0 && !container.textContent.trim()) {
      loadWords(scene, container);
    }
  }

  function highlightWord(currentTime) {
    var spans = document.querySelectorAll('.reveal .slides section.present .word');
    var found = null;
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
      if (inner && found.offsetLeft !== undefined) {
        var spanLeft = found.offsetLeft;
        var innerWidth = inner.clientWidth;
        inner.scrollLeft = Math.max(0, spanLeft - innerWidth / 2);
      }
    }
  }

  function startHighlightLoop(audioEl) {
    function loop() {
      if (audioEl && !audioEl.paused) {
        highlightWord(audioEl.currentTime);
        var pct = audioEl.duration ? (audioEl.currentTime / audioEl.duration) * 100 : 0;
        if (progressBar) progressBar.style.width = pct + '%';
        highlightFrame = requestAnimationFrame(loop);
      }
    }
    loop();
  }

  function playScene(scene) {
    if (!scene || !audio) return;
    stopAudio();
    var data = getSceneData(scene);
    if (!data) return;
    ensureWords(scene);
    audio.src = data.audio;
    audio.preload = 'auto';
    audio.load();
    playingAudio = audio;
    playBtn.textContent = '⏳';
    
    audio.oncanplaythrough = function() {
      audio.play().then(function() {
        playBtn.textContent = '⏸';
        playingScene = scene;
        startHighlightLoop(audio);
      }).catch(function() {
        playBtn.textContent = '▶';
      });
    };
    audio.onended = function() {
      playBtn.textContent = '↻';
      playingScene = null;
      if (progressBar) progressBar.style.width = '100%';
      if (highlightFrame) { cancelAnimationFrame(highlightFrame); highlightFrame = null; }
    };
    audio.onerror = function() {
      playBtn.textContent = '▶';
    };
  }

  function togglePlay() {
    var scene = getActiveScene();
    if (!scene) return;
    if (playingScene === scene && playingAudio) {
      if (playingAudio.paused) {
        playingAudio.play().then(function() {
          playBtn.textContent = '⏸';
          startHighlightLoop(playingAudio);
        }).catch(function() {
          playBtn.textContent = '▶';
        });
      } else {
        playingAudio.pause();
        playBtn.textContent = '▶';
        if (highlightFrame) { cancelAnimationFrame(highlightFrame); highlightFrame = null; }
      }
    } else {
      playScene(scene);
    }
  }

  function setupActiveScene() {
    var scene = getActiveScene();
    ensureWords(scene);
  }

  function beginStory() {
    if (overlay) overlay.style.display = 'none';
    setupActiveScene();
    toggleMic();
  }

  function isOverlayVisible() {
    return overlay && overlay.style.display !== 'none';
  }

  function beginAfterRevealNavigation(direction) {
    if (direction === 'right') Reveal.right();
    if (direction === 'left') Reveal.left();
    if (direction === 'down') Reveal.down();
    if (direction === 'up') Reveal.up();
    beginStory();
  }

  function hasBackgroundMusic() {
    return bgMusic && bgMusic.getAttribute('src');
  }

  function applyMusicIcon() {
    musicToggle.textContent = musicOn ? '♫' : '🔇';
  }

  function playBackgroundMusic() {
    if (!hasBackgroundMusic()) {
      musicToggle.textContent = '🔇';
      return;
    }
    bgMusic.volume = 0.18;
    bgMusic.play().then(applyMusicIcon).catch(applyMusicIcon);
  }

  function toggleMusic() {
    if (!hasBackgroundMusic()) {
      musicOn = false;
      localStorage.setItem('ct-music-on', 'off');
      musicToggle.textContent = '🔇';
      return;
    }
    if (musicOn && !bgMusic.paused) {
      musicOn = false;
      bgMusic.pause();
      localStorage.setItem('ct-music-on', 'off');
      applyMusicIcon();
      return;
    }
    musicOn = true;
    localStorage.setItem('ct-music-on', 'on');
    playBackgroundMusic();
  }
  applyMusicIcon();

  function applyTheme() {
    if (darkOn) {
      document.body.classList.remove('light');
      themeToggle.textContent = '🌙';
    } else {
      document.body.classList.add('light');
      themeToggle.textContent = '☀️';
    }
  }
  applyTheme();

  function toggleTheme() {
    darkOn = !darkOn;
    localStorage.setItem('ct-theme', darkOn ? 'dark' : 'light');
    applyTheme();
  }

  function applyCaptionState() {
    document.body.classList.remove('multiline', 'caption-off');
    if (captionState === 'multiline') {
      document.body.classList.add('multiline');
      captionToggle.textContent = '☰';
      captionToggle.title = 'Captions: multiline (C key)';
    } else if (captionState === 'off') {
      document.body.classList.add('caption-off');
      captionToggle.textContent = '✕';
      captionToggle.title = 'Captions: off (C key)';
    } else {
      captionToggle.textContent = '≡';
      captionToggle.title = 'Captions: single line (C key)';
    }
    localStorage.setItem('ct-caption-state', captionState);
  }
  applyCaptionState();

  function toggleCaption() {
    var currentIndex = captionStates.indexOf(captionState);
    captionState = captionStates[(currentIndex + 1) % captionStates.length];
    applyCaptionState();
  }

  // ---- Live Captioning (Web Speech API) ----
  var micBtn = document.getElementById('mic-btn');
  var liveCaptionOverlay = document.getElementById('live-caption-overlay');
  var recognition = null;
  var micOn = false;
  var micRestartTimer = null;
  
  function initSpeechRecognition() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (micBtn) micBtn.style.display = 'none';
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = function(event) {
      var transcript = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (liveCaptionOverlay) {
        liveCaptionOverlay.textContent = transcript.trim();
      }
    };
    
    recognition.onerror = function(event) {
      if (event.error === 'no-speech') return;
      if (micOn && event.error === 'aborted') return;
      stopMic();
    };
    
    recognition.onend = function() {
      if (micOn) {
        clearTimeout(micRestartTimer);
        micRestartTimer = setTimeout(function() {
          if (micOn) recognition.start();
        }, 200);
      } else {
        if (micBtn) micBtn.classList.remove('listening');
      }
    };
  }
  
  function startMic() {
    if (!recognition) return;
    micOn = true;
    if (micBtn) micBtn.classList.add('listening');
    if (liveCaptionOverlay) liveCaptionOverlay.classList.add('active');
    try { recognition.start(); } catch(e) {}
  }
  
  function stopMic() {
    micOn = false;
    clearTimeout(micRestartTimer);
    if (micBtn) micBtn.classList.remove('listening');
    if (liveCaptionOverlay) liveCaptionOverlay.classList.remove('active');
    try { recognition.stop(); } catch(e) {}
  }
  
  function toggleMic() {
    if (micOn) { stopMic(); }
    else { initSpeechRecognition(); startMic(); }
  }
  
  if (micBtn) {
    micBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleMic();
    });
  }
  
  playBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    togglePlay();
  });

  document.addEventListener('click', function(e) {
    if (e.target.closest('.caption-toggle, .play-btn, .theme-toggle, .music-toggle')) return;
    if (!isOverlayVisible()) return;
    var navRight = e.target.closest('.navigate-right, .navigate-next');
    var navLeft = e.target.closest('.navigate-left, .navigate-prev');
    var navDown = e.target.closest('.navigate-down');
    var navUp = e.target.closest('.navigate-up');
    if (navRight || navLeft || navDown || navUp) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      beginAfterRevealNavigation(navRight ? 'right' : navLeft ? 'left' : navDown ? 'down' : 'up');
    } else {
      beginStory();
    }
  }, true);

  if (overlay) {
    overlay.addEventListener('click', function() {
      beginStory();
    });
  }

  document.addEventListener('keydown', function(e) {
    var navigationKeys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'];
    if (navigationKeys.indexOf(e.key) !== -1 && isOverlayVisible()) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      var direction = (e.key === 'ArrowLeft' || e.key === 'PageUp') ? 'left' :
        e.key === 'ArrowDown' ? 'down' :
        e.key === 'ArrowUp' ? 'up' :
        e.key === 'Home' ? 'left' : 'right';
      beginAfterRevealNavigation(direction);
      return;
    }
    if (e.key === ' ' || e.code === 'Space') {
      if (isOverlayVisible()) {
        beginStory();
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      var scene = getActiveScene();
      if (scene) { e.preventDefault(); togglePlay(); }
    }
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
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
    if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      toggleMic();
    }
  }, true);

  musicToggle.addEventListener('click', function(e) {
    e.stopPropagation();
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

  Reveal.on('ready', function() {
    setupActiveScene();
  });

  Reveal.on('slidechanged', function() {
    stopAudio();
    setupActiveScene();
  });

  // Create live caption overlay dynamically
  var lco = document.createElement('div');
  lco.id = 'live-caption-overlay';
  lco.className = 'live-caption-overlay';
  document.body.appendChild(lco);
  liveCaptionOverlay = document.getElementById('live-caption-overlay');
})();

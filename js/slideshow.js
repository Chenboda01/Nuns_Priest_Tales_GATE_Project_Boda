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

  function getCurrentSlide() {
    if (window.Reveal && typeof Reveal.getCurrentSlide === 'function') {
      return Reveal.getCurrentSlide();
    }
    return document.querySelector('.reveal .slides section.present');
  }

  function getActiveScene() {
    var slide = getCurrentSlide();
    if (!slide) return null;
    var scene = slide.getAttribute('data-scene');
    if (!scene && slide.parentElement) {
      scene = slide.parentElement.getAttribute('data-scene');
    }
    return scene;
  }

  function getActiveSceneData() {
    var scene = getActiveScene();
    return scene ? getSceneData(scene) : null;
  }

  function updatePlayButtonState() {
    var data = getActiveSceneData();
    var canPlay = !!(data && data.audio);
    playBtn.classList.toggle('no-audio', !canPlay);
    playBtn.classList.toggle('disabled', !canPlay);
    playBtn.setAttribute('aria-disabled', canPlay ? 'false' : 'true');
    playBtn.title = canPlay ? 'Play narration (Space)' : 'No narration on this slide';
    if (!canPlay) playBtn.textContent = '▶';
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
    updatePlayButtonState();
  }

  function loadWords(scene, container) {
    var data = getSceneData(scene);
    if (!data) return;
    var txtPath = data.audio.replace('.mp3', '.txt').replace('audio', 'scenes');
    var wordsLoaded = false;
    fetch(data.words)
      .then(function(r) { return r.json(); })
      .then(function(wordList) {
        wordsLoaded = true;
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
      .catch(function() {});
    fetch(txtPath)
      .then(function(r) { return r.text(); })
      .then(function(txt) {
        if (!wordsLoaded && txt.trim()) container.textContent = txt;
      })
      .catch(function() {});
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

    function beginPlayback() {
      stopMic();
      var playPromise = audio.play();
      if (!playPromise || typeof playPromise.then !== 'function') {
        playBtn.textContent = '⏸';
        playingScene = scene;
        startHighlightLoop(audio);
        return;
      }
      playPromise.then(function() {
        playBtn.textContent = '⏸';
        playingScene = scene;
        startHighlightLoop(audio);
      }).catch(function() {
        playBtn.textContent = '▶';
      });
    }

    beginPlayback();
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
    var data = getActiveSceneData();
    if (!scene || !data || !data.audio) {
      updatePlayButtonState();
      return;
    }
    if (playingScene === scene && playingAudio) {
      if (playingAudio.paused) {
        stopMic();
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
    updatePlayButtonState();
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
  var pauseBtn = document.getElementById('pause-btn');
  var liveCaptionOverlay = document.getElementById('live-caption-overlay');
  var recognition = null;
  var micOn = false;
  var micRestartTimer = null;
  var resumeMicAfterPause = false;
  var micStartRetryTimer = null;
  var micRestartCount = 0;
  var MAX_MIC_RESTARTS = 5;
  var micSilenceTimer = null;
  var micProcessTimer = null;

  if (!liveCaptionOverlay) {
    var lco = document.createElement('div');
    lco.id = 'live-caption-overlay';
    lco.className = 'live-caption-overlay';
    lco.textContent = '🎤 Tap the mic button to start live captions';
    document.body.appendChild(lco);
    liveCaptionOverlay = document.getElementById('live-caption-overlay');
  }
  
  // ---- Canterbury Tales vocabulary for speech correction ----
  var STORY_VOCAB = [
    // Characters
    'Chanticleer','Pertelote','Partlet','Dame','widow','Chaucer','Host','Fox','Renard',
    'Mally','Cato','Kenelm','Croesus','Andromache','Hector','Achilles','Scipio',
    'Macrobius','Sinon','Brown','Judas','Prioress',
    // Places
    'farm','cottage','yard','kitchen','valley','market','Canterbury','Africa','Troy',
    'woodside','hedge','gate','field','village','library','town','stall',
    // Animals
    'rooster','cock','hen','hens','pig','pigs','cow','cows','sheep','ox','mermaid',
    'butterfly','horse','horses','beast','beasts','dog','dogs','bear','bears','bird',
    // Body
    'comb','wattles','beak','feathers','neck','legs','throat','face','eyes','head',
    'blood','heart','voice','spurs',
    // People
    'daughters','friends','priest','carter','ostler','husband','wife','wives','brother',
    'doctor','strangers','man','men','woman','women',
    // Objects
    'fence','perch','beam','nettles','corn','grain','medicine','herbs','bible',
    'book','books','cart','money','bacon','milk','wool','fire','smoke','arrow',
    'sword','bed','beds','soot','fireplace','well','poem',
    // Abstract / Story terms
    'dream','dreams','dreamer','nightmare','joy','sorrow','pride','flattery','coward',
    'milksop','danger','murder','warning','vision','legend','history','moral',
    'story','stories','tale','tales','battle','fight',
    // Descriptive
    'beautiful','brave','wise','proud','poor','honest','old','wicked','sly','clever',
    'humble','hungry','fierce','loud','happy','sad','afraid','frightened',
    // Actions
    'crow','sing','speak','talk','fly','walk','run','chase','escape','capture',
    'sleep','wake','groan','cry','shout','laugh','flatter',
    // Time
    'morning','evening','night','day','daybreak','sunshine','dawn',
    // Misc
    'Canterbury','Nun','Priest','Pilgrim','pilgrimage','England','London',
    'introduction','acknowledgements','subtitles','scene','scenes','act',
    // Common English words (prevent false corrections)
    'the','a','an','is','are','was','were','be','been','being','have','has','had',
    'do','does','did','will','would','could','should','may','might','must','shall','can',
    'I','you','he','she','it','we','they','me','him','her','us','them','my','your',
    'his','our','their','its','mine','yours','hers','ours','theirs',
    'this','that','these','those','here','there','where','when','why','how','what',
    'who','whom','which','if','then','else','but','or','and','not','no','yes',
    'so','very','too','just','only','also','even','still','yet','already','always',
    'never','sometimes','often','now','ago','before','after','during','while',
    'in','on','at','to','from','by','with','about','against','between','into',
    'through','above','below','up','down','out','off','over','under','again',
    'for','of','as','all','both','each','every','few','more','most','other',
    'some','such','any','many','much','one','two','three','first','last',
    'new','good','great','big','small','large','little','long','short','high',
    'different','same','right','left','own','next','able','young','early','late'
  ];
  var STORY_NAMES = ['Boda', 'Chen', 'Chanticleer', 'Pertelote', 'Partlet', 'Chaucer', 'Renard', 'Mally', 'Kenelm', 'Croesus', 'Andromache', 'Hector', 'Achilles', 'Scipio', 'Macrobius', 'Sinon'];
  var DIRECT_CORRECTIONS = {
    'chanticlear': 'Chanticleer',
    'chanticleer': 'Chanticleer',
    'chanticlears': 'Chanticleer',
    'turtle': 'Pertelote',
    'turtles': 'Pertelote',
    'perla': 'Pertelote',
    'partlot': 'Pertelote',
    'portillo': 'Pertelote',
    'partlet': 'Partlet',
    'renard': 'Renard',
    'introduckshioun': 'Introduction',
    'introduckshion': 'Introduction',
    'introduction': 'Introduction'
  };
  var DIRECT_PHRASE_CORRECTIONS = [
    // Chanticleer mishearings
    [/\bsanta\s+clara\b/gi, 'Chanticleer'],
    [/\bsanta\s+clear\b/gi, 'Chanticleer'],
    [/\bchant\s+a\s+clear\b/gi, 'Chanticleer'],
    [/\btrying\s+to\s+clear\b/gi, 'Chanticleer'],
    [/\bpanda\s+clear\b/gi, 'Chanticleer'],
    // widow's farm mishearings
    [/\bwidows?\s+form\b/gi, "widow's farm"],
    [/\bwidows?\s+farm\b/gi, "widow's farm"],
    [/\bwidows?\s+swan\b/gi, "widow's farm"],
    [/\bwindow\s+(?:farm|form|swan)\b/gi, "widow's farm"],
    [/\blittle\s+(?:swan|fawn|farm|form)\b/gi, "widow's farm"],
    // the sly fox
    [/\bthe\s+sly\s+box\b/gi, 'the sly fox']
  ];
  
  function cleanToken(w) {
    return w.replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z]+$/, '');
  }

  function normalizeWord(w) {
    return cleanToken(w).toLowerCase();
  }

  function wordListFromText(text) {
    var matches = (text || '').match(/[A-Za-z][A-Za-z']*/g) || [];
    var seen = {};
    var words = [];
    matches.forEach(function(w) {
      var key = normalizeWord(w);
      if (key.length < 3 || seen[key]) return;
      seen[key] = true;
      words.push(w.replace(/^./, function(c) { return c.toUpperCase() === c ? c : c.toLowerCase(); }));
    });
    return words;
  }

  function phraseListFromText(text) {
    var words = wordListFromText(text);
    var phrases = [];
    for (var i = 0; i < words.length - 1; i++) {
      phrases.push(words[i] + ' ' + words[i + 1]);
    }
    for (var j = 0; j < words.length - 2; j++) {
      phrases.push(words[j] + ' ' + words[j + 1] + ' ' + words[j + 2]);
    }
    return phrases;
  }

  function activeContextText() {
    var text = '';
    var slides = [];
    if (window.Reveal && Reveal.getCurrentSlide) {
      slides = [Reveal.getCurrentSlide()];
    } else {
      slides = Array.prototype.slice.call(document.querySelectorAll('.reveal .slides section.present'));
    }
    slides.forEach(function(slide) {
      text += ' ' + slide.textContent;
      slide.querySelectorAll('img[alt]').forEach(function(img) { text += ' ' + img.alt; });
      if (slide.parentElement) {
        Array.prototype.forEach.call(slide.parentElement.children, function(child) {
          if (child.tagName === 'SECTION' && child !== slide && child.querySelector('h1, h2, h3, h4')) {
            text += ' ' + child.textContent;
          }
        });
      }
    });
    var scene = getActiveScene();
    var data = scene ? getSceneData(scene) : null;
    if (data) text += ' ' + data.title;
    return text;
  }

  function contextHasPhrase(text, phrase) {
    return new RegExp('\\b' + phrase.replace(/\s+/g, '\\s+') + '\\b', 'i').test(text || '');
  }

  function currentSlideVocabulary() {
    var text = activeContextText();
    return wordListFromText(text).concat(STORY_NAMES);
  }

  function currentSlidePhrases() {
    var text = activeContextText();
    var phrases = phraseListFromText(text).concat(["widow's farm", 'sly fox']);
    if (contextHasPhrase(text, 'Boda Chen')) phrases.push('Boda Chen');
    return phrases;
  }

  function closestFromList(word, list, maxRatio) {
    var lower = normalizeWord(word);
    if (!lower || lower.length < 3) return word;
    if (DIRECT_CORRECTIONS[lower]) return DIRECT_CORRECTIONS[lower];
    var best = null;
    var bestDist = Math.max(1, Math.ceil(lower.length * maxRatio));
    for (var i = 0; i < list.length; i++) {
      var candidate = list[i];
      var d = levenshtein(lower, normalizeWord(candidate));
      if (d === 0) return candidate;
      if (d < bestDist) { bestDist = d; best = candidate; }
    }
    return best || word;
  }
  
  function closestStoryName(word) {
    if (!word || word.length < 2) return word;
    var lower = word.toLowerCase();
    if (DIRECT_CORRECTIONS[lower]) return DIRECT_CORRECTIONS[lower];
    for (var i = 0; i < STORY_NAMES.length; i++) {
      if (STORY_NAMES[i].toLowerCase() === lower) return STORY_NAMES[i];
    }
    if (lower.length < 5) return word;
    var best = null;
    var bestDist = 3;
    for (var i = 0; i < STORY_NAMES.length; i++) {
      var d = levenshtein(lower, STORY_NAMES[i].toLowerCase());
      if (d < bestDist) { bestDist = d; best = STORY_NAMES[i]; }
    }
    return best || word;
  }
  
  function levenshtein(a, b) {
    var m = a.length, n = b.length;
    var d = [];
    for (var i = 0; i <= m; i++) { d[i] = [i]; }
    for (var j = 0; j <= n; j++) { d[0][j] = j; }
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        d[i][j] = a[i-1] === b[j-1] ? d[i-1][j-1] : Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]) + 1;
      }
    }
    return d[m][n];
  }
  
  function preserveTokenShape(original, corrected) {
    var prefix = original.match(/^[^a-zA-Z]*/)[0];
    var suffix = original.match(/[^a-zA-Z]*$/)[0];
    return prefix + corrected + suffix;
  }

  function applyPhraseCorrections(raw) {
    var corrected = raw;
    DIRECT_PHRASE_CORRECTIONS.forEach(function(rule) {
      corrected = corrected.replace(rule[0], rule[1]);
    });
    currentSlidePhrases().forEach(function(phrase) {
      if (phrase === 'Boda Chen') {
        corrected = corrected
          // two-word phrase rules first (more specific)
          .replace(/\bphoto\s+(?:chen|chain|chin|china)\b/gi, 'Boda Chen')
          .replace(/\bboulder\s+(?:chen|china|chair)\b/gi, 'Boda Chen')
          // three-word phrase rules
          .replace(/\bgo\s+to\s+chen\b/gi, 'Boda Chen')
          .replace(/\bbuild\s+a\s+(?:china|chen)\b/gi, 'Boda Chen')
          // generic boda variants + chen/china variants
          .replace(/\bboda\s+china\b/gi, 'Boda Chen')
          .replace(/\bbota\s+chen\b/gi, 'Boda Chen')
          .replace(/\bbod[a-z]*\s+ch(?:en|in|ina)\b/gi, 'Boda Chen')
          // single-word or smashed-together mishearings (after multi-word rules)
          .replace(/\b(?:bulletin|bodachen|photo|boulder)\b/gi, 'Boda Chen');
      }
      var heard = phrase.replace(/\bBoda\b/gi, '(?:Boda|go to|build a|bow to|photo|poda|boto|boulder)').replace(/\bChen\b/gi, '(?:Chen|China|chain|chin|chair)');
      corrected = corrected.replace(new RegExp('\\b' + heard + '\\b', 'gi'), phrase);
    });
    return corrected;
  }

  function correctTranscript(raw) {
    var slideWords = currentSlideVocabulary();
    var phraseCorrected = applyPhraseCorrections(raw);
    return phraseCorrected.split(/(\s+)/).map(function(token) {
      if (/^\s+$/.test(token)) return token;
      if (token.indexOf("'") !== -1) return token;
      var cleaned = cleanToken(token);
      if (!cleaned) return token;
      var firstPass = closestFromList(cleaned, slideWords, 0.38);
      var secondPass = closestStoryName(firstPass);
      return preserveTokenShape(token, secondPass);
    }).join('');
  }
  
  function showMicMessage(msg) {
    if (liveCaptionOverlay) {
      liveCaptionOverlay.textContent = msg;
      liveCaptionOverlay.classList.add('active');
    }
  }

  function initSpeechRecognition() {
    if (recognition) return;
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showMicMessage('Speech recognition not supported. Use Chrome or Edge.');
      return;
    }
    if (!window.isSecureContext) {
      showMicMessage('Microphone requires HTTPS. Use a secure connection or localhost.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';
    
    recognition.onresult = function(event) {
      micRestartCount = 0;
      clearTimeout(micSilenceTimer);
      clearTimeout(micProcessTimer);
      var transcript = '';
      var hasFinal = false;
      for (var i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) hasFinal = true;
      }
      if (hasFinal && liveCaptionOverlay) {
        liveCaptionOverlay.textContent = '⏳ Processing...';
        var captured = transcript;
        micProcessTimer = setTimeout(function() {
          var corrected = correctTranscript(captured).trim();
          if (liveCaptionOverlay) {
            liveCaptionOverlay.textContent = corrected || captured.trim() || '🎤 Listening...';
          }
        }, 500);
      } else if (liveCaptionOverlay) {
        liveCaptionOverlay.textContent = transcript.trim() || '🎤 Listening...';
      }
    };
    
    recognition.onspeechstart = function() {
      clearTimeout(micSilenceTimer);
      if (liveCaptionOverlay) liveCaptionOverlay.textContent = '🔊 Hearing...';
    };
    
    recognition.onerror = function(event) {
      if (event.error === 'no-speech') {
        micRestartCount++;
        if (micRestartCount >= MAX_MIC_RESTARTS) {
          showMicMessage('No speech detected. Tap mic to try again.');
          stopMic();
        }
        return;
      }
      if (event.error === 'aborted' && micOn) return;
      if (event.error === 'not-allowed') {
        showMicMessage('Microphone access denied. Allow mic in browser settings.');
      }
      stopMic();
    };
    
    recognition.onend = function() {
      if (micOn && micRestartCount < MAX_MIC_RESTARTS) {
        clearTimeout(micRestartTimer);
        micRestartTimer = setTimeout(function() {
          if (micOn && recognition) {
            try { recognition.start(); } catch(e) { stopMic(); }
          }
        }, 150);
      } else {
        stopMic();
      }
    };
  }
  
  function safelyStartRecognition(attemptsLeft) {
    clearTimeout(micStartRetryTimer);
    try {
      recognition.start();
    } catch(e) {
      if (attemptsLeft > 0 && micOn) {
        micStartRetryTimer = setTimeout(function() {
          safelyStartRecognition(attemptsLeft - 1);
        }, 100);
      }
    }
  }

  function startMic() {
    if (!recognition) return;
    micOn = true;
    micRestartCount = 0;
    clearTimeout(micSilenceTimer);
    clearTimeout(micProcessTimer);
    micSilenceTimer = setTimeout(function() {
      if (micOn && liveCaptionOverlay && liveCaptionOverlay.textContent === '🎤 Listening...') {
        liveCaptionOverlay.textContent = 'No speech heard. Check mic or speak louder.';
      }
    }, 10000);
    if (micBtn) micBtn.classList.add('listening');
    if (liveCaptionOverlay) {
      liveCaptionOverlay.classList.add('active');
      liveCaptionOverlay.textContent = '🎤 Listening...';
    }
    safelyStartRecognition(3);
  }
  
  function stopMic() {
    micOn = false;
    clearTimeout(micRestartTimer);
    clearTimeout(micStartRetryTimer);
    clearTimeout(micSilenceTimer);
    clearTimeout(micProcessTimer);
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
  
  if (pauseBtn) {
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      Reveal.togglePause();
    });
    Reveal.on('paused', function() {
      resumeMicAfterPause = micOn;
      stopMic();
      pauseBtn.textContent = '▶ Resume';
    });
    Reveal.on('resumed', function() {
      if (resumeMicAfterPause) {
        resumeMicAfterPause = false;
        initSpeechRecognition();
        clearTimeout(micStartRetryTimer);
        micStartRetryTimer = setTimeout(startMic, 350);
      }
      pauseBtn.textContent = '⏸ Pause';
    });
  }
  
  playBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (isOverlayVisible()) {
      if (overlay) overlay.style.display = 'none';
      setupActiveScene();
    }
    togglePlay();
  });

  document.addEventListener('click', function(e) {
    if (e.target.closest('.caption-toggle, .play-btn, .theme-toggle, .music-toggle, .mic-btn, .pause-btn')) return;
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
    if (e.key === 'l' || e.key === 'L') {
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
})();

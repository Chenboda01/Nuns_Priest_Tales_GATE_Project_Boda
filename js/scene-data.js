var SCENE_DATA = {
  "00": { title: "Chaucer and the Host", image: "assets/scenes/scene-00.jpg", audio: "assets/audio/scene-00.mp3", words: "assets/audio/scene-00-words.json" },
  "01": { title: "The Poor Widow", image: "assets/scenes/scene-01.jpg", audio: "assets/audio/scene-01.mp3", words: "assets/audio/scene-01-words.json" },
  "02": { title: "The Sooty Cottage", image: "assets/scenes/scene-02.jpg", audio: "assets/audio/scene-02.mp3", words: "assets/audio/scene-02-words.json" },
  "03": { title: "Farm Products", image: "assets/scenes/scene-03.jpg", audio: "assets/audio/scene-03.mp3", words: "assets/audio/scene-03-words.json" },
  "04": { title: "Chanticleer's Yard", image: "assets/scenes/scene-04.jpg", audio: "assets/audio/scene-04.mp3", words: "assets/audio/scene-04-words.json" },
  "05": { title: "Beautiful Chanticleer", image: "assets/scenes/scene-05.jpg", audio: "assets/audio/scene-05.mp3", words: "assets/audio/scene-05-words.json" },
  "06": { title: "Morning and Evening", image: "assets/scenes/scene-06.jpg", audio: "assets/audio/scene-06.mp3", words: "assets/audio/scene-06-words.json" },
  "07": { title: "The Seven Hens", image: "assets/scenes/scene-07.jpg", audio: "assets/audio/scene-07.mp3", words: "assets/audio/scene-07-words.json" },
  "08": { title: "Dame Pertelote", image: "assets/scenes/scene-08.jpg", audio: "assets/audio/scene-08.mp3", words: "assets/audio/scene-08-words.json" },
  "09": { title: "Talking Animals", image: "assets/scenes/scene-09.jpg", audio: "assets/audio/scene-09.mp3", words: "assets/audio/scene-09-words.json" },
  "10": { title: "The Bad Dream", image: "assets/scenes/scene-10.jpg", audio: "assets/audio/scene-10.mp3", words: "assets/audio/scene-10-words.json" },
  "11": { title: "The Fox Dream", image: "assets/scenes/scene-11.jpg", audio: "assets/audio/scene-11.mp3", words: "assets/audio/scene-11-words.json" },
  "12": { title: "Shame on You!", image: "assets/scenes/scene-12.jpg", audio: "assets/audio/scene-12.mp3", words: "assets/audio/scene-12-words.json" },
  "13": { title: "I Am Not a Coward!", image: "assets/scenes/scene-13.jpg", audio: "assets/audio/scene-13.mp3", words: "assets/audio/scene-13-words.json" },
  "14": { title: "Dreams Aren't Real", image: "assets/scenes/scene-14.jpg", audio: "assets/audio/scene-14.mp3", words: "assets/audio/scene-14-words.json" },
  "15": { title: "Take Some Medicine", image: "assets/scenes/scene-15.jpg", audio: "assets/audio/scene-15.mp3", words: "assets/audio/scene-15-words.json" },
  "16": { title: "Chanticleer's Defense", image: "assets/scenes/scene-16.jpg", audio: "assets/audio/scene-16.mp3", words: "assets/audio/scene-16-words.json" },
  "17": { title: "Read It Again", image: "assets/scenes/scene-17.jpg", audio: "assets/audio/scene-17.mp3", words: "assets/audio/scene-17-words.json" },
  "18": { title: "A True Story", image: "assets/scenes/scene-18.jpg", audio: "assets/audio/scene-18.mp3", words: "assets/audio/scene-18-words.json" },
  "19": { title: "The Murdered Friend", image: "assets/scenes/scene-19.jpg", audio: "assets/audio/scene-19.mp3", words: "assets/audio/scene-19-words.json" },
  "20": { title: "Saint Kenelm", image: "assets/scenes/scene-20.jpg", audio: "assets/audio/scene-20.mp3", words: "assets/audio/scene-20-words.json" },
  "21": { title: "Dreams Come True", image: "assets/scenes/scene-21.jpg", audio: "assets/audio/scene-21.mp3", words: "assets/audio/scene-21-words.json" },
  "22": { title: "Into the Morning", image: "assets/scenes/scene-22.jpg", audio: "assets/audio/scene-22.mp3", words: "assets/audio/scene-22-words.json" },
  "23": { title: "The Happiest Rooster", image: "assets/scenes/scene-23.jpg", audio: "assets/audio/scene-23.mp3", words: "assets/audio/scene-23-words.json" },
  "24": { title: "The Wicked Fox", image: "assets/scenes/scene-24.jpg", audio: "assets/audio/scene-24.mp3", words: "assets/audio/scene-24-words.json" },
  "25": { title: "Walking Into Danger", image: "assets/scenes/scene-25.jpg", audio: "assets/audio/scene-25.mp3", words: "assets/audio/scene-25-words.json" },
  "26": { title: "No Offense", image: "assets/scenes/scene-26.jpg", audio: "assets/audio/scene-26.mp3", words: "assets/audio/scene-26-words.json" },
  "27": { title: "The Fox Spotted", image: "assets/scenes/scene-27.jpg", audio: "assets/audio/scene-27.mp3", words: "assets/audio/scene-27-words.json" },
  "28": { title: "The Fox's Flattery", image: "assets/scenes/scene-28.jpg", audio: "assets/audio/scene-28.mp3", words: "assets/audio/scene-28-words.json" },
  "29": { title: "Sing for Me", image: "assets/scenes/scene-29.jpg", audio: "assets/audio/scene-29.mp3", words: "assets/audio/scene-29-words.json" },
  "30": { title: "The Capture", image: "assets/scenes/scene-30.jpg", audio: "assets/audio/scene-30.mp3", words: "assets/audio/scene-30-words.json" },
  "31": { title: "Poor Chanticleer", image: "assets/scenes/scene-31.jpg", audio: "assets/audio/scene-31.mp3", words: "assets/audio/scene-31-words.json" },
  "32": { title: "The Chase", image: "assets/scenes/scene-32.jpg", audio: "assets/audio/scene-32.mp3", words: "assets/audio/scene-32-words.json" },
  "33": { title: "The Escape", image: "assets/scenes/scene-33.jpg", audio: "assets/audio/scene-33.mp3", words: "assets/audio/scene-33-words.json" },
  "34": { title: "The Moral", image: "assets/scenes/scene-34.jpg", audio: "assets/audio/scene-34.mp3", words: "assets/audio/scene-34-words.json" }
};

function getSceneData(num) {
  var key = String(num).padStart(2, '0');
  return SCENE_DATA[key] || null;
}
